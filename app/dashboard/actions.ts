'use server'

import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { sql } from 'drizzle-orm'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

/**
 * SQL Injection 방지를 위한 parameterized IN clause 생성
 * sql.raw() 대신 sql 태그 템플릿 사용
 */
function buildInClause(
  storeIds: string[],
  columnPrefix?: string
): ReturnType<typeof sql> {
  const column = columnPrefix ? `${columnPrefix}.store_id` : 'store_id'
  const placeholders = storeIds.map((_, i) => sql`${storeIds[i]}`)
  return sql`AND ${sql.identifier(column.split('.')[0])}${columnPrefix ? sql`.store_id` : sql``} IN (${sql.join(placeholders, sql`, `)})`
}

/**
 * 단순 store_id 필터 (테이블 alias 없음)
 */
function buildSimpleStoreFilter(storeIds: string[]): ReturnType<typeof sql> {
  const placeholders = storeIds.map((_, i) => sql`${storeIds[i]}`)
  return sql`AND store_id IN (${sql.join(placeholders, sql`, `)})`
}

/**
 * store_id 필터 + NULL 포함 (고정비처럼 store_id 없는 레코드도 포함)
 */
function buildSimpleStoreFilterWithNull(storeIds: string[]): ReturnType<typeof sql> {
  const placeholders = storeIds.map((_, i) => sql`${storeIds[i]}`)
  return sql`AND (store_id IN (${sql.join(placeholders, sql`, `)}) OR store_id IS NULL)`
}

/**
 * 테이블 alias 포함 store_id 필터
 */
function buildAliasedStoreFilter(
  storeIds: string[],
  alias: 'pt' | 'sr'
): ReturnType<typeof sql> {
  const placeholders = storeIds.map((_, i) => sql`${storeIds[i]}`)
  return sql`AND ${sql.identifier(alias)}.store_id IN (${sql.join(placeholders, sql`, `)})`
}

async function fetchDashboardStats(
  startDate: string,
  endDate: string,
  authorizedStoreIds: string[]
) {
  // 권한이 있는 매장이 없으면 빈 결과 반환
  if (authorizedStoreIds.length === 0) {
    return {
      success: true,
      data: {
        monthlyPurchases: 0,
        monthlySales: 0,
        monthlyFixedCosts: 0,
        todaySales: 0,
        purchaseCount: 0,
        salesCount: 0,
        marginPercent: 0,
        recentPurchases: [],
        recentSales: [],
      },
    }
  }

  // Build store filters using parameterized queries (SQL Injection 방지)
  const storeFilter = buildSimpleStoreFilter(authorizedStoreIds)
  const storeFilterWithNull = buildSimpleStoreFilterWithNull(authorizedStoreIds)
  const ptStoreFilter = buildAliasedStoreFilter(authorizedStoreIds, 'pt')
  const srStoreFilter = buildAliasedStoreFilter(authorizedStoreIds, 'sr')

  // Execute all queries in parallel for better performance
  const [summary, recentPurchases, recentSales] = await Promise.all([
    // Get monthly summary - actual purchase costs (without distribution rules)
    db.execute(sql`
      WITH cost_summary AS (
        SELECT
          COALESCE(SUM(pt.total_amount), 0) as total_actual_cost
        FROM purchase_transactions pt
        WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND pt.deleted_at IS NULL
          ${ptStoreFilter}
      ),
      monthly_sales AS (
        SELECT
          COUNT(*) as sales_count,
          COALESCE(SUM(total_revenue), 0) as total_sales
        FROM sales_records
        WHERE sale_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND deleted_at IS NULL
          ${storeFilter}
      ),
      purchase_count AS (
        SELECT COUNT(*) as count
        FROM purchase_transactions
        WHERE transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND deleted_at IS NULL
          ${storeFilter}
      ),
      monthly_fixed_costs AS (
        SELECT
          COALESCE(SUM(amount), 0) as total_fixed_costs
        FROM fixed_costs
        WHERE cost_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND deleted_at IS NULL
          ${storeFilterWithNull}
      ),
      today_sales AS (
        SELECT
          COALESCE(SUM(total_revenue), 0) as today_total
        FROM sales_records
        WHERE sale_date = ${endDate}::date
          AND deleted_at IS NULL
          ${storeFilter}
      )
      SELECT
        pc.count as purchase_count,
        cs.total_actual_cost,
        ms.sales_count,
        ms.total_sales,
        mfc.total_fixed_costs,
        ts.today_total,
        CASE
          WHEN ms.total_sales > 0
          THEN ((ms.total_sales - cs.total_actual_cost - mfc.total_fixed_costs) / ms.total_sales * 100)
          ELSE 0
        END as margin_percent
      FROM cost_summary cs
      CROSS JOIN monthly_sales ms
      CROSS JOIN purchase_count pc
      CROSS JOIN monthly_fixed_costs mfc
      CROSS JOIN today_sales ts
    `),
    // Get recent purchases
    db.execute(sql`
      SELECT
        pt.transaction_date,
        mc.menu_name,
        i.ingredient_name,
        pt.total_amount
      FROM purchase_transactions pt
      LEFT JOIN menu_categories mc ON pt.menu_id = mc.id
      LEFT JOIN ingredients i ON pt.ingredient_id = i.id
      WHERE pt.deleted_at IS NULL
        ${ptStoreFilter}
      ORDER BY pt.transaction_date DESC, pt.created_at DESC
      LIMIT 5
    `),
    // Get recent sales
    db.execute(sql`
      SELECT
        sr.sale_date,
        s.sku_name,
        sr.quantity_sold,
        sr.total_revenue
      FROM sales_records sr
      LEFT JOIN skus s ON sr.sku_id = s.id
      WHERE sr.deleted_at IS NULL
        ${srStoreFilter}
      ORDER BY sr.sale_date DESC, sr.created_at DESC
      LIMIT 5
    `),
  ])

  const stats = summary.rows[0]

  return {
    success: true,
    data: {
      monthlyPurchases: Number(stats.total_actual_cost),
      monthlySales: Number(stats.total_sales),
      monthlyFixedCosts: Number(stats.total_fixed_costs),
      todaySales: Number(stats.today_total),
      purchaseCount: Number(stats.purchase_count),
      salesCount: Number(stats.sales_count),
      marginPercent: Number(stats.margin_percent),
      recentPurchases: recentPurchases.rows.map((row: any) => ({
        date: row.transaction_date,
        ingredientName: row.ingredient_name || '-',
        amount: Number(row.total_amount),
      })),
      recentSales: recentSales.rows.map((row: any) => ({
        date: row.sale_date,
        skuName: row.sku_name || '-',
        quantity: Number(row.quantity_sold),
        revenue: Number(row.total_revenue),
      })),
    },
  }
}

export async function getDashboardStats() {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        success: true,
        data: {
          monthlyPurchases: 0,
          monthlySales: 0,
          monthlyFixedCosts: 0,
          todaySales: 0,
          purchaseCount: 0,
          salesCount: 0,
          marginPercent: 0,
          recentPurchases: [],
          recentSales: [],
        },
      }
    }

    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startDate = firstDayOfMonth.toISOString().split('T')[0]
    const endDate = today.toISOString().split('T')[0]

    return await fetchDashboardStats(startDate, endDate, authorizedStoreIds)
  } catch (error) {
    logger.error('Failed to fetch dashboard stats:', errorToContext(error))
    return {
      success: false,
      error: '대시보드 데이터를 가져오는데 실패했습니다',
    }
  }
}
