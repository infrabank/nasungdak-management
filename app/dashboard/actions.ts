'use server'

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function fetchDashboardStats(startDate: string, endDate: string) {
  // Get monthly summary with cost distribution rules applied
  const summary = await db.execute(sql`
      WITH cost_summary AS (
        -- Calculate actual cost using cost distribution rules
        SELECT
          COALESCE(SUM(pt.total_amount * cdr.distribution_percent / 100), 0) as total_actual_cost
        FROM purchase_transactions pt
        JOIN cost_distribution_rules cdr ON pt.ingredient_id = cdr.ingredient_id
        WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND pt.deleted_at IS NULL
          AND pt.is_valid = true
          AND cdr.deleted_at IS NULL
          AND cdr.effective_from <= ${endDate}::date
          AND COALESCE(cdr.effective_to, '9999-12-31'::date) >= ${startDate}::date
      ),
      monthly_sales AS (
        SELECT
          COUNT(*) as sales_count,
          COALESCE(SUM(total_revenue), 0) as total_sales
        FROM sales_records
        WHERE sale_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND deleted_at IS NULL
      ),
      valid_purchases AS (
        SELECT COUNT(*) as valid_count
        FROM purchase_transactions
        WHERE deleted_at IS NULL AND is_valid = true
      ),
      invalid_purchases AS (
        SELECT COUNT(*) as invalid_count
        FROM purchase_transactions
        WHERE deleted_at IS NULL AND is_valid = false
      ),
      cost_rules AS (
        SELECT COUNT(*) as rules_count
        FROM cost_distribution_rules
        WHERE deleted_at IS NULL
      ),
      purchase_count AS (
        SELECT COUNT(*) as count
        FROM purchase_transactions
        WHERE transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND deleted_at IS NULL
      )
      SELECT
        pc.count as purchase_count,
        cs.total_actual_cost,
        ms.sales_count,
        ms.total_sales,
        vp.valid_count,
        ip.invalid_count,
        cr.rules_count,
        CASE
          WHEN ms.total_sales > 0
          THEN ((ms.total_sales - cs.total_actual_cost) / ms.total_sales * 100)
          ELSE 0
        END as margin_percent
      FROM cost_summary cs
      CROSS JOIN monthly_sales ms
      CROSS JOIN valid_purchases vp
      CROSS JOIN invalid_purchases ip
      CROSS JOIN cost_rules cr
      CROSS JOIN purchase_count pc
    `)

    const stats = summary.rows[0]

    // Get recent purchases
    const recentPurchases = await db.execute(sql`
      SELECT
        pt.transaction_date,
        mc.menu_name,
        i.ingredient_name,
        pt.total_amount,
        pt.is_valid
      FROM purchase_transactions pt
      LEFT JOIN menu_categories mc ON pt.menu_id = mc.id
      LEFT JOIN ingredients i ON pt.ingredient_id = i.id
      WHERE pt.deleted_at IS NULL
      ORDER BY pt.transaction_date DESC, pt.created_at DESC
      LIMIT 5
    `)

    // Get recent sales
    const recentSales = await db.execute(sql`
      SELECT
        sr.sale_date,
        s.sku_name,
        sr.quantity_sold,
        sr.total_revenue
      FROM sales_records sr
      LEFT JOIN skus s ON sr.sku_id = s.id
      WHERE sr.deleted_at IS NULL
      ORDER BY sr.sale_date DESC, sr.created_at DESC
      LIMIT 5
    `)

  return {
    success: true,
    data: {
      monthlyPurchases: Number(stats.total_actual_cost),
      monthlySales: Number(stats.total_sales),
      purchaseCount: Number(stats.purchase_count),
      salesCount: Number(stats.sales_count),
      marginPercent: Number(stats.margin_percent),
      validPurchases: Number(stats.valid_count),
      invalidPurchases: Number(stats.invalid_count),
      costRules: Number(stats.rules_count),
      recentPurchases: recentPurchases.rows.map((row: any) => ({
        date: row.transaction_date,
        menuName: row.menu_name || '-',
        ingredientName: row.ingredient_name || '-',
        amount: Number(row.total_amount),
        isValid: row.is_valid,
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
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startDate = firstDayOfMonth.toISOString().split('T')[0]
    const endDate = today.toISOString().split('T')[0]

    const getCachedDashboardStats = unstable_cache(
      fetchDashboardStats,
      ['dashboard:stats', startDate, endDate],
      { tags: ['dashboard:stats'] }
    )

    return await getCachedDashboardStats(startDate, endDate)
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return {
      success: false,
      error: '대시보드 데이터를 가져오는데 실패했습니다',
    }
  }
}
