'use server'

import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { sql } from 'drizzle-orm'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export interface BreakEvenSkuData {
  skuName: string
  unitPrice: number
  variableCost: number
  contributionMargin: number
  contributionMarginPercent: number
  bepQuantity: number
  actualQuantity: number
  achievementPercent: number
}

export interface BreakEvenResult {
  success: boolean
  data?: {
    totalFixedCost: number
    avgContributionMarginPercent: number
    totalBreakEvenRevenue: number
    skus: BreakEvenSkuData[]
  }
  error?: string
}

function buildStoreFilter(
  storeId: string,
  authorizedStoreIds: string[],
  tableAlias: string,
  includeNull: boolean = false
): ReturnType<typeof sql> {
  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
    if (includeNull) {
      return sql`AND (${sql.identifier(tableAlias)}.store_id = ${storeId} OR ${sql.identifier(tableAlias)}.store_id IS NULL)`
    }
    return sql`AND ${sql.identifier(tableAlias)}.store_id = ${storeId}`
  }
  const placeholders = authorizedStoreIds.map(
    (_, i) => sql`${authorizedStoreIds[i]}`
  )
  if (includeNull) {
    return sql`AND (${sql.identifier(tableAlias)}.store_id IN (${sql.join(placeholders, sql`, `)}) OR ${sql.identifier(tableAlias)}.store_id IS NULL)`
  }
  return sql`AND ${sql.identifier(tableAlias)}.store_id IN (${sql.join(placeholders, sql`, `)})`
}

export async function getBreakEvenAnalysis(
  month: string, // YYYY-MM format
  storeId?: string
): Promise<BreakEvenResult> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        success: true,
        data: {
          totalFixedCost: 0,
          avgContributionMarginPercent: 0,
          totalBreakEvenRevenue: 0,
          skus: [],
        },
      }
    }

    const normalizedStoreId = storeId ?? 'all'
    const salesStoreFilter = buildStoreFilter(
      normalizedStoreId,
      authorizedStoreIds,
      'sr'
    )
    const fixedCostStoreFilter = buildStoreFilter(
      normalizedStoreId,
      authorizedStoreIds,
      'fc',
      true
    )

    const startDate = `${month}-01`
    // End of month: add 1 month, subtract 1 day
    const [year, mon] = month.split('-').map(Number)
    const endDateObj = new Date(year, mon, 0) // last day of month
    const endDate = `${year}-${String(mon).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`

    const [fixedCostResult, skuResult] = await Promise.all([
      // Fixed costs for the month
      db.execute(sql`
        SELECT COALESCE(SUM(fc.amount), 0) AS total_fixed_cost
        FROM fixed_costs fc
        WHERE fc.cost_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND fc.deleted_at IS NULL
          ${fixedCostStoreFilter}
      `),
      // SKU sales + BOM unit cost
      db.execute(sql`
        WITH ingredient_avg_price AS (
          SELECT
            pt.ingredient_id,
            CASE
              WHEN SUM(pt.quantity) > 0
              THEN SUM(pt.total_amount) / SUM(pt.quantity)
              ELSE 0
            END AS avg_unit_price
          FROM purchase_transactions pt
          WHERE pt.deleted_at IS NULL
          GROUP BY pt.ingredient_id
        ),
        bom_unit_cost AS (
          SELECT
            rec.sku_id,
            SUM(
              COALESCE(iap.avg_unit_price, COALESCE(ing.unit_cost, 0)) *
              CASE
                WHEN ing.unit = 'kg' AND rec.unit = 'g' THEN rec.quantity / 1000
                WHEN ing.unit = 'L' AND rec.unit = 'ml' THEN rec.quantity / 1000
                WHEN ing.unit = 'g' AND rec.unit = 'kg' THEN rec.quantity * 1000
                WHEN ing.unit = 'ml' AND rec.unit = 'L' THEN rec.quantity * 1000
                ELSE rec.quantity
              END
            ) AS cost_per_unit
          FROM sku_recipes rec
          JOIN ingredients ing ON rec.ingredient_id = ing.id
          LEFT JOIN ingredient_avg_price iap ON rec.ingredient_id = iap.ingredient_id
          WHERE rec.deleted_at IS NULL
            AND ing.deleted_at IS NULL
          GROUP BY rec.sku_id
        )
        SELECT
          s.sku_name,
          s.unit_price,
          COALESCE(buc.cost_per_unit, 0) AS variable_cost,
          COALESCE(SUM(sr.quantity_sold), 0) AS actual_quantity,
          COALESCE(SUM(sr.total_revenue), 0) AS actual_revenue
        FROM skus s
        LEFT JOIN bom_unit_cost buc ON s.id = buc.sku_id
        LEFT JOIN sales_records sr ON sr.sku_id = s.id
          AND sr.sale_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND sr.deleted_at IS NULL
          ${salesStoreFilter}
        WHERE s.deleted_at IS NULL
          AND s.is_active = true
        GROUP BY s.id, s.sku_name, s.unit_price, buc.cost_per_unit
        ORDER BY actual_revenue DESC
      `),
    ])

    const totalFixedCost = Number(
      fixedCostResult.rows[0]?.total_fixed_cost || 0
    )

    // Calculate total revenue for proportional fixed cost allocation
    let totalActualRevenue = 0
    const rawSkus = skuResult.rows.map((row: any) => {
      const actualRevenue = Number(row.actual_revenue)
      totalActualRevenue += actualRevenue
      return {
        skuName: row.sku_name as string,
        unitPrice: Number(row.unit_price),
        variableCost: Number(row.variable_cost),
        actualQuantity: Number(row.actual_quantity),
        actualRevenue,
      }
    })

    const skus: BreakEvenSkuData[] = rawSkus.map((sku) => {
      const contributionMargin = sku.unitPrice - sku.variableCost
      const contributionMarginPercent =
        sku.unitPrice > 0 ? (contributionMargin / sku.unitPrice) * 100 : 0

      // Allocate fixed costs proportionally by revenue share
      const revenueShare =
        totalActualRevenue > 0 ? sku.actualRevenue / totalActualRevenue : 0
      const allocatedFixedCost = totalFixedCost * revenueShare

      const bepQuantity =
        contributionMargin > 0
          ? Math.ceil(allocatedFixedCost / contributionMargin)
          : 0

      const achievementPercent =
        bepQuantity > 0 ? (sku.actualQuantity / bepQuantity) * 100 : 0

      return {
        skuName: sku.skuName,
        unitPrice: sku.unitPrice,
        variableCost: sku.variableCost,
        contributionMargin,
        contributionMarginPercent,
        bepQuantity,
        actualQuantity: sku.actualQuantity,
        achievementPercent,
      }
    })

    // Filter out SKUs with no sales and no BEP (not meaningful)
    const meaningfulSkus = skus.filter(
      (s) => s.actualQuantity > 0 || s.bepQuantity > 0
    )

    const totalContributionMargin = meaningfulSkus.reduce(
      (sum, s) => sum + s.contributionMarginPercent,
      0
    )
    const avgContributionMarginPercent =
      meaningfulSkus.length > 0
        ? totalContributionMargin / meaningfulSkus.length
        : 0

    const totalBreakEvenRevenue =
      avgContributionMarginPercent > 0
        ? (totalFixedCost / avgContributionMarginPercent) * 100
        : 0

    return {
      success: true,
      data: {
        totalFixedCost,
        avgContributionMarginPercent,
        totalBreakEvenRevenue,
        skus: meaningfulSkus,
      },
    }
  } catch (error) {
    logger.error(
      'Failed to get break-even analysis:',
      errorToContext(error)
    )
    return {
      success: false,
      error: '손익분기점 분석 데이터를 가져오는데 실패했습니다',
    }
  }
}
