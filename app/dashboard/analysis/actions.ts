'use server'

import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { sql } from 'drizzle-orm'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export interface AnalysisResult {
  success: boolean
  data?: {
    summary: {
      totalRevenue: number
      totalVariableCost: number
      totalFixedCost: number
      totalCost: number
      netProfit: number
      marginPercent: number
    }
    skuAnalysis: Array<{
      skuName: string
      quantitySold: number
      revenue: number
      cost: number
      profit: number
      marginPercent: number
      hasBom: boolean
    }>
  }
  error?: string
}

export interface MonthlyAnalysisResult {
  success: boolean
  data?: Array<{
    month: string // YYYY-MM format
    totalRevenue: number
    totalVariableCost: number
    totalFixedCost: number
    totalCost: number
    netProfit: number
    marginPercent: number
  }>
  error?: string
}

/**
 * 월별 분석을 위한 매장 ID 필터 생성
 * SQL Injection 방지를 위해 parameterized query 사용
 */
function buildStoreFilter(
  storeId: string,
  authorizedStoreIds: string[],
  tableAlias: 'sr' | 'pt' | 'fc',
  includeNull: boolean = false
): ReturnType<typeof sql> {
  // 특정 매장 선택 시 (권한 있는 경우)
  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
    if (includeNull) {
      return sql`AND (${sql.identifier(tableAlias)}.store_id = ${storeId} OR ${sql.identifier(tableAlias)}.store_id IS NULL)`
    }
    return sql`AND ${sql.identifier(tableAlias)}.store_id = ${storeId}`
  }

  // 전체 매장 선택 시 - 권한 있는 매장들로 필터
  // Drizzle의 sql 태그를 사용한 parameterized IN clause
  const placeholders = authorizedStoreIds.map(
    (_, i) => sql`${authorizedStoreIds[i]}`
  )
  if (includeNull) {
    return sql`AND (${sql.identifier(tableAlias)}.store_id IN (${sql.join(placeholders, sql`, `)}) OR ${sql.identifier(tableAlias)}.store_id IS NULL)`
  }
  return sql`AND ${sql.identifier(tableAlias)}.store_id IN (${sql.join(placeholders, sql`, `)})`
}

async function fetchMonthlyAnalysis(
  startDate: string,
  endDate: string,
  storeId: string,
  authorizedStoreIds: string[]
): Promise<MonthlyAnalysisResult> {
  // 권한이 있는 매장이 없으면 빈 결과 반환
  if (authorizedStoreIds.length === 0) {
    return { success: true, data: [] }
  }

  // Build store filter conditions using parameterized queries
  const salesStoreFilter = buildStoreFilter(storeId, authorizedStoreIds, 'sr')
  const purchaseStoreFilter = buildStoreFilter(
    storeId,
    authorizedStoreIds,
    'pt'
  )
  const fixedCostStoreFilter = buildStoreFilter(
    storeId,
    authorizedStoreIds,
    'fc',
    true
  )

  // Execute all queries in parallel for better performance
  const [
    monthlyRevenueResult,
    monthlyVariableCostResult,
    monthlyFixedCostResult,
  ] = await Promise.all([
    // Get monthly revenue from sales
    db.execute(sql`
        SELECT
          TO_CHAR(sr.sale_date, 'YYYY-MM') AS month,
          SUM(sr.total_revenue) AS total_revenue
        FROM sales_records sr
        WHERE sr.sale_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND sr.deleted_at IS NULL
          ${salesStoreFilter}
        GROUP BY TO_CHAR(sr.sale_date, 'YYYY-MM')
        ORDER BY month
      `),
    // Get monthly variable costs (ingredient costs)
    db.execute(sql`
        SELECT
          TO_CHAR(pt.transaction_date, 'YYYY-MM') AS month,
          SUM(pt.total_amount) AS total_variable_cost
        FROM purchase_transactions pt
        WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND pt.deleted_at IS NULL
          ${purchaseStoreFilter}
        GROUP BY TO_CHAR(pt.transaction_date, 'YYYY-MM')
        ORDER BY month
      `),
    // Get monthly fixed costs
    db.execute(sql`
        SELECT
          TO_CHAR(fc.cost_date, 'YYYY-MM') AS month,
          SUM(fc.amount) AS total_fixed_cost
        FROM fixed_costs fc
        WHERE fc.cost_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND fc.deleted_at IS NULL
          ${fixedCostStoreFilter}
        GROUP BY TO_CHAR(fc.cost_date, 'YYYY-MM')
        ORDER BY month
      `),
  ])

  // Combine all months
  const monthsMap = new Map<
    string,
    {
      revenue: number
      variableCost: number
      fixedCost: number
    }
  >()

  // Add revenue data
  monthlyRevenueResult.rows.forEach((row: any) => {
    const month = row.month
    if (!monthsMap.has(month)) {
      monthsMap.set(month, { revenue: 0, variableCost: 0, fixedCost: 0 })
    }
    monthsMap.get(month)!.revenue = Number(row.total_revenue)
  })

  // Add variable cost data
  monthlyVariableCostResult.rows.forEach((row: any) => {
    const month = row.month
    if (!monthsMap.has(month)) {
      monthsMap.set(month, { revenue: 0, variableCost: 0, fixedCost: 0 })
    }
    monthsMap.get(month)!.variableCost = Number(row.total_variable_cost)
  })

  // Add fixed cost data
  monthlyFixedCostResult.rows.forEach((row: any) => {
    const month = row.month
    if (!monthsMap.has(month)) {
      monthsMap.set(month, { revenue: 0, variableCost: 0, fixedCost: 0 })
    }
    monthsMap.get(month)!.fixedCost = Number(row.total_fixed_cost)
  })

  // Sort months and calculate metrics
  const monthlyData = Array.from(monthsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const totalCost = data.variableCost + data.fixedCost
      const netProfit = data.revenue - totalCost
      const marginPercent =
        data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0

      return {
        month,
        totalRevenue: data.revenue,
        totalVariableCost: data.variableCost,
        totalFixedCost: data.fixedCost,
        totalCost,
        netProfit,
        marginPercent,
      }
    })

  return {
    success: true,
    data: monthlyData,
  }
}

export async function getMonthlyAnalysis(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<MonthlyAnalysisResult> {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: true, data: [] }
    }

    const normalizedStoreId = storeId ?? 'all'

    return await fetchMonthlyAnalysis(
      startDate,
      endDate,
      normalizedStoreId,
      authorizedStoreIds
    )
  } catch (error) {
    logger.error('Failed to get monthly analysis:', errorToContext(error))
    return {
      success: false,
      error: '월별 분석 데이터를 가져오는데 실패했습니다',
    }
  }
}

/**
 * 고정비용 테이블용 매장 필터 (별도 alias 없음)
 */
function buildFixedCostStoreFilter(
  storeId: string,
  authorizedStoreIds: string[]
): ReturnType<typeof sql> {
  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
    return sql`AND (store_id = ${storeId} OR store_id IS NULL)`
  }

  const placeholders = authorizedStoreIds.map(
    (_, i) => sql`${authorizedStoreIds[i]}`
  )
  return sql`AND (store_id IN (${sql.join(placeholders, sql`, `)}) OR store_id IS NULL)`
}

async function fetchAnalysis(
  startDate: string,
  endDate: string,
  storeId: string,
  authorizedStoreIds: string[]
): Promise<AnalysisResult> {
  // 권한이 있는 매장이 없으면 빈 결과 반환
  if (authorizedStoreIds.length === 0) {
    return {
      success: true,
      data: {
        summary: {
          totalRevenue: 0,
          totalVariableCost: 0,
          totalFixedCost: 0,
          totalCost: 0,
          netProfit: 0,
          marginPercent: 0,
        },
        skuAnalysis: [],
      },
    }
  }

  // Build store filter conditions using parameterized queries
  const salesStoreFilter = buildStoreFilter(storeId, authorizedStoreIds, 'sr')
  const purchaseStoreFilter = buildStoreFilter(
    storeId,
    authorizedStoreIds,
    'pt'
  )
  const fixedCostStoreFilter = buildFixedCostStoreFilter(
    storeId,
    authorizedStoreIds
  )

  // Execute queries in parallel for better performance
  // SKU cost: BOM-based (sku_recipes × purchase avg unit price). BOM 미등록 SKU는 원가 0 + has_bom=false
  const [skuResult, totalCostsResult, fixedCostsResult] = await Promise.all([
    // SKU-level sales with BOM-based cost calculation
    db.execute(sql`
      WITH sales_summary AS (
        SELECT
          sr.sku_id,
          s.sku_name,
          SUM(sr.quantity_sold) AS total_quantity,
          SUM(sr.total_revenue) AS total_revenue
        FROM sales_records sr
        JOIN skus s ON sr.sku_id = s.id
        WHERE sr.sale_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND sr.deleted_at IS NULL
          AND s.deleted_at IS NULL
          ${salesStoreFilter}
        GROUP BY sr.sku_id, s.sku_name
      ),
      ingredient_avg_price AS (
        -- Weighted average unit price per ingredient from purchase data
        -- unit_price is price per ingredient's base unit (e.g., per kg)
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
        -- BOM-based per-unit cost for each SKU
        -- recipe.quantity in recipe.unit × avg purchase price per ingredient base unit
        SELECT
          rec.sku_id,
          SUM(
            COALESCE(ing.unit_cost, iap.avg_unit_price, 0) *
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
        ss.sku_name,
        ss.total_quantity AS quantity_sold,
        ss.total_revenue AS revenue,
        COALESCE(buc.cost_per_unit * ss.total_quantity, 0) AS cost,
        ss.total_revenue - COALESCE(buc.cost_per_unit * ss.total_quantity, 0) AS profit,
        CASE
          WHEN ss.total_revenue > 0
          THEN ((ss.total_revenue - COALESCE(buc.cost_per_unit * ss.total_quantity, 0)) / ss.total_revenue * 100)
          ELSE 0
        END AS margin_percent,
        CASE WHEN buc.cost_per_unit IS NOT NULL THEN true ELSE false END AS has_bom
      FROM sales_summary ss
      LEFT JOIN bom_unit_cost buc ON ss.sku_id = buc.sku_id
      ORDER BY revenue DESC
    `),
    // Total variable costs (all valid purchases - same as dashboard)
    db.execute(sql`
      SELECT COALESCE(SUM(pt.total_amount), 0) AS total_variable_cost
      FROM purchase_transactions pt
      WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
        AND pt.deleted_at IS NULL
        ${purchaseStoreFilter}
    `),
    // Get fixed costs for the period
    db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) AS total_fixed_cost
      FROM fixed_costs
      WHERE cost_date BETWEEN ${startDate}::date AND ${endDate}::date
        AND deleted_at IS NULL
        ${fixedCostStoreFilter}
    `),
  ])

  // Process SKU results
  const skuAnalysis = skuResult.rows.map((row: any) => ({
    skuName: row.sku_name,
    quantitySold: Number(row.quantity_sold),
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    profit: Number(row.profit),
    marginPercent: Number(row.margin_percent),
    hasBom: row.has_bom === true,
  }))

  // Calculate totals using direct purchase costs (same as dashboard)
  const totalRevenue = skuAnalysis.reduce((sum, item) => sum + item.revenue, 0)
  const totalVariableCost = Number(
    totalCostsResult.rows[0]?.total_variable_cost || 0
  )
  const totalFixedCost = Number(fixedCostsResult.rows[0]?.total_fixed_cost || 0)

  // Calculate total costs and profit
  const totalCost = totalVariableCost + totalFixedCost
  const netProfit = totalRevenue - totalCost
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  return {
    success: true,
    data: {
      summary: {
        totalRevenue,
        totalVariableCost,
        totalFixedCost,
        totalCost,
        netProfit,
        marginPercent,
      },
      skuAnalysis,
    },
  }
}

export interface MonthlySkuAnalysisResult {
  success: boolean
  data?: {
    monthlySkuData: Array<{
      month: string // YYYY-MM
      skuId: string
      skuName: string
      quantitySold: number
      revenue: number
    }>
    skuCosts: Array<{
      skuId: string
      skuName: string
      unitPrice: number
      costPerUnit: number
      hasBom: boolean
    }>
  }
  error?: string
}

async function fetchMonthlySkuAnalysis(
  startDate: string,
  endDate: string,
  storeId: string,
  authorizedStoreIds: string[]
): Promise<MonthlySkuAnalysisResult> {
  if (authorizedStoreIds.length === 0) {
    return { success: true, data: { monthlySkuData: [], skuCosts: [] } }
  }

  const salesStoreFilter = buildStoreFilter(storeId, authorizedStoreIds, 'sr')

  const [monthlySkuResult, skuCostsResult] = await Promise.all([
    // Query 1: Monthly SKU sales aggregation
    db.execute(sql`
      SELECT
        TO_CHAR(sr.sale_date, 'YYYY-MM') AS month,
        sr.sku_id,
        s.sku_name,
        SUM(sr.quantity_sold) AS quantity_sold,
        SUM(sr.total_revenue) AS revenue
      FROM sales_records sr
      JOIN skus s ON sr.sku_id = s.id
      WHERE sr.sale_date BETWEEN ${startDate}::date AND ${endDate}::date
        AND sr.deleted_at IS NULL
        AND s.deleted_at IS NULL
        ${salesStoreFilter}
      GROUP BY month, sr.sku_id, s.sku_name
      ORDER BY month, revenue DESC
    `),
    // Query 2: SKU BOM unit costs
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
            COALESCE(ing.unit_cost, iap.avg_unit_price, 0) *
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
        s.id,
        s.sku_name,
        s.unit_price,
        COALESCE(buc.cost_per_unit, 0) AS cost_per_unit,
        (buc.cost_per_unit IS NOT NULL) AS has_bom
      FROM skus s
      LEFT JOIN bom_unit_cost buc ON s.id = buc.sku_id
      WHERE s.deleted_at IS NULL
    `),
  ])

  return {
    success: true,
    data: {
      monthlySkuData: monthlySkuResult.rows.map((row: any) => ({
        month: row.month,
        skuId: row.sku_id,
        skuName: row.sku_name,
        quantitySold: Number(row.quantity_sold),
        revenue: Number(row.revenue),
      })),
      skuCosts: skuCostsResult.rows.map((row: any) => ({
        skuId: row.id,
        skuName: row.sku_name,
        unitPrice: Number(row.unit_price),
        costPerUnit: Number(row.cost_per_unit),
        hasBom: row.has_bom === true,
      })),
    },
  }
}

export async function getMonthlySkuAnalysis(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<MonthlySkuAnalysisResult> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: true, data: { monthlySkuData: [], skuCosts: [] } }
    }

    const normalizedStoreId = storeId ?? 'all'

    return await fetchMonthlySkuAnalysis(
      startDate,
      endDate,
      normalizedStoreId,
      authorizedStoreIds
    )
  } catch (error) {
    logger.error(
      'Failed to get monthly SKU analysis:',
      errorToContext(error)
    )
    return {
      success: false,
      error: '월별 SKU 분석 데이터를 가져오는데 실패했습니다',
    }
  }
}

export async function getAnalysis(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<AnalysisResult> {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        success: true,
        data: {
          summary: {
            totalRevenue: 0,
            totalVariableCost: 0,
            totalFixedCost: 0,
            totalCost: 0,
            netProfit: 0,
            marginPercent: 0,
          },
          skuAnalysis: [],
        },
      }
    }

    const normalizedStoreId = storeId ?? 'all'

    return await fetchAnalysis(
      startDate,
      endDate,
      normalizedStoreId,
      authorizedStoreIds
    )
  } catch (error) {
    logger.error('Failed to get analysis:', errorToContext(error))
    return {
      success: false,
      error: '분석 데이터를 가져오는데 실패했습니다',
    }
  }
}
