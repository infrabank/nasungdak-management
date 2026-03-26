'use server'

import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { sql } from 'drizzle-orm'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export type MenuCategory = 'star' | 'plowhorse' | 'puzzle' | 'dog'

export interface MenuEngineeringItem {
  skuName: string
  quantitySold: number
  revenue: number
  cost: number
  margin: number
  marginPercent: number
  category: MenuCategory
}

export interface MenuEngineeringResult {
  success: boolean
  data?: {
    items: MenuEngineeringItem[]
    avgQuantity: number
    avgMarginPercent: number
    categoryCounts: Record<MenuCategory, number>
  }
  error?: string
}

function buildStoreFilter(
  storeId: string,
  authorizedStoreIds: string[],
  tableAlias: string
): ReturnType<typeof sql> {
  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
    return sql`AND ${sql.identifier(tableAlias)}.store_id = ${storeId}`
  }
  const placeholders = authorizedStoreIds.map(
    (_, i) => sql`${authorizedStoreIds[i]}`
  )
  return sql`AND ${sql.identifier(tableAlias)}.store_id IN (${sql.join(placeholders, sql`, `)})`
}

function classifyMenu(
  quantitySold: number,
  marginPercent: number,
  avgQuantity: number,
  avgMarginPercent: number
): MenuCategory {
  const highPopularity = quantitySold >= avgQuantity
  const highProfitability = marginPercent >= avgMarginPercent
  if (highPopularity && highProfitability) return 'star'
  if (highPopularity && !highProfitability) return 'plowhorse'
  if (!highPopularity && highProfitability) return 'puzzle'
  return 'dog'
}

export async function getMenuEngineering(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<MenuEngineeringResult> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        success: true,
        data: {
          items: [],
          avgQuantity: 0,
          avgMarginPercent: 0,
          categoryCounts: { star: 0, plowhorse: 0, puzzle: 0, dog: 0 },
        },
      }
    }

    const normalizedStoreId = storeId ?? 'all'
    const salesStoreFilter = buildStoreFilter(
      normalizedStoreId,
      authorizedStoreIds,
      'sr'
    )

    const result = await db.execute(sql`
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
        SELECT
          pt.ingredient_id,
          CASE
            WHEN SUM(pt.quantity) > 0
            THEN SUM(pt.total_amount) / SUM(pt.quantity)
            ELSE 0
          END AS avg_unit_price
        FROM purchase_transactions pt
        WHERE pt.deleted_at IS NULL
          AND pt.is_valid = true
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
        ss.sku_name,
        ss.total_quantity AS quantity_sold,
        ss.total_revenue AS revenue,
        COALESCE(buc.cost_per_unit, 0) * ss.total_quantity AS cost,
        ss.total_revenue - COALESCE(buc.cost_per_unit, 0) * ss.total_quantity AS margin,
        CASE
          WHEN ss.total_revenue > 0
          THEN ((ss.total_revenue - COALESCE(buc.cost_per_unit, 0) * ss.total_quantity) / ss.total_revenue * 100)
          ELSE 0
        END AS margin_percent
      FROM sales_summary ss
      LEFT JOIN bom_unit_cost buc ON ss.sku_id = buc.sku_id
      ORDER BY revenue DESC
    `)

    const rawItems = result.rows.map((row: any) => ({
      skuName: row.sku_name as string,
      quantitySold: Number(row.quantity_sold),
      revenue: Number(row.revenue),
      cost: Number(row.cost),
      margin: Number(row.margin),
      marginPercent: Number(row.margin_percent),
    }))

    if (rawItems.length === 0) {
      return {
        success: true,
        data: {
          items: [],
          avgQuantity: 0,
          avgMarginPercent: 0,
          categoryCounts: { star: 0, plowhorse: 0, puzzle: 0, dog: 0 },
        },
      }
    }

    const avgQuantity =
      rawItems.reduce((sum, i) => sum + i.quantitySold, 0) / rawItems.length
    const avgMarginPercent =
      rawItems.reduce((sum, i) => sum + i.marginPercent, 0) / rawItems.length

    const items: MenuEngineeringItem[] = rawItems.map((item) => ({
      ...item,
      category: classifyMenu(
        item.quantitySold,
        item.marginPercent,
        avgQuantity,
        avgMarginPercent
      ),
    }))

    const categoryCounts: Record<MenuCategory, number> = {
      star: 0,
      plowhorse: 0,
      puzzle: 0,
      dog: 0,
    }
    for (const item of items) {
      categoryCounts[item.category]++
    }

    return {
      success: true,
      data: { items, avgQuantity, avgMarginPercent, categoryCounts },
    }
  } catch (error) {
    logger.error(
      'Failed to get menu engineering analysis:',
      errorToContext(error)
    )
    return {
      success: false,
      error: '메뉴 엔지니어링 분석 데이터를 가져오는데 실패했습니다',
    }
  }
}
