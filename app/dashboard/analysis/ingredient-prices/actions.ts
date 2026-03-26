'use server'

import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { sql } from 'drizzle-orm'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export interface IngredientPriceRow {
  ingredientId: string
  ingredientName: string
  month: string
  avgUnitPrice: number
  totalQuantity: number
}

export interface IngredientPriceSummary {
  ingredientId: string
  ingredientName: string
  startPrice: number
  endPrice: number
  changePercent: number
}

export interface IngredientPriceResult {
  success: boolean
  data?: {
    rows: IngredientPriceRow[]
    summaries: IngredientPriceSummary[]
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

export async function getIngredientPriceTrend(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<IngredientPriceResult> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: true, data: { rows: [], summaries: [] } }
    }

    const normalizedStoreId = storeId ?? 'all'
    const purchaseStoreFilter = buildStoreFilter(
      normalizedStoreId,
      authorizedStoreIds,
      'pt'
    )

    const result = await db.execute(sql`
      SELECT
        i.id AS ingredient_id,
        i.ingredient_name,
        TO_CHAR(pt.transaction_date, 'YYYY-MM') AS month,
        CASE
          WHEN SUM(pt.quantity) > 0
          THEN SUM(pt.quantity * pt.unit_price) / SUM(pt.quantity)
          ELSE 0
        END AS avg_unit_price,
        SUM(pt.quantity) AS total_quantity
      FROM purchase_transactions pt
      JOIN ingredients i ON pt.ingredient_id = i.id
      WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
        AND pt.deleted_at IS NULL
        AND pt.is_valid = true
        ${purchaseStoreFilter}
      GROUP BY i.id, i.ingredient_name, TO_CHAR(pt.transaction_date, 'YYYY-MM')
      ORDER BY i.ingredient_name, month
    `)

    const rows: IngredientPriceRow[] = result.rows.map((row: any) => ({
      ingredientId: row.ingredient_id,
      ingredientName: row.ingredient_name,
      month: row.month,
      avgUnitPrice: Number(row.avg_unit_price),
      totalQuantity: Number(row.total_quantity),
    }))

    // Build summaries: first and last month price per ingredient
    const byIngredient = new Map<
      string,
      { name: string; months: { month: string; price: number }[] }
    >()
    for (const row of rows) {
      if (!byIngredient.has(row.ingredientId)) {
        byIngredient.set(row.ingredientId, {
          name: row.ingredientName,
          months: [],
        })
      }
      byIngredient.get(row.ingredientId)!.months.push({
        month: row.month,
        price: row.avgUnitPrice,
      })
    }

    const summaries: IngredientPriceSummary[] = Array.from(
      byIngredient.entries()
    ).map(([id, data]) => {
      const sorted = data.months.sort((a, b) => a.month.localeCompare(b.month))
      const startPrice = sorted[0]?.price ?? 0
      const endPrice = sorted[sorted.length - 1]?.price ?? 0
      const changePercent =
        startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0
      return {
        ingredientId: id,
        ingredientName: data.name,
        startPrice,
        endPrice,
        changePercent,
      }
    })

    // Sort by absolute change descending
    summaries.sort(
      (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
    )

    return { success: true, data: { rows, summaries } }
  } catch (error) {
    logger.error(
      'Failed to get ingredient price trend:',
      errorToContext(error)
    )
    return {
      success: false,
      error: '식재료 가격 추이 데이터를 가져오는데 실패했습니다',
    }
  }
}
