'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface AnalysisResult {
  success: boolean
  data?: {
    summary: {
      totalRevenue: number
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
    }>
  }
  error?: string
}

export async function getAnalysis(
  startDate: string,
  endDate: string
): Promise<AnalysisResult> {
  try {
    // Complex SQL query combining sales, purchases, and cost distribution
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
        GROUP BY sr.sku_id, s.sku_name
      ),
      cost_summary AS (
        SELECT
          s.id AS sku_id,
          SUM(
            pt.total_amount * cdr.distribution_percent / 100
          ) AS total_cost
        FROM skus s
        JOIN menu_categories mc ON s.menu_id = mc.id
        JOIN cost_distribution_rules cdr ON mc.id = cdr.menu_id
        JOIN purchase_transactions pt ON cdr.ingredient_id = pt.ingredient_id
        WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND pt.deleted_at IS NULL
          AND pt.is_valid = true
          AND s.deleted_at IS NULL
          AND mc.deleted_at IS NULL
          AND cdr.deleted_at IS NULL
          AND ${startDate}::date BETWEEN cdr.effective_from AND COALESCE(cdr.effective_to, '9999-12-31'::date)
        GROUP BY s.id
      )
      SELECT
        COALESCE(ss.sku_name, 'Unknown') AS sku_name,
        COALESCE(ss.total_quantity, 0) AS quantity_sold,
        COALESCE(ss.total_revenue, 0) AS revenue,
        COALESCE(cs.total_cost, 0) AS cost,
        COALESCE(ss.total_revenue, 0) - COALESCE(cs.total_cost, 0) AS profit,
        CASE
          WHEN COALESCE(ss.total_revenue, 0) > 0
          THEN ((COALESCE(ss.total_revenue, 0) - COALESCE(cs.total_cost, 0)) / ss.total_revenue * 100)
          ELSE 0
        END AS margin_percent
      FROM sales_summary ss
      FULL OUTER JOIN cost_summary cs ON ss.sku_id = cs.sku_id
      WHERE COALESCE(ss.total_revenue, 0) > 0 OR COALESCE(cs.total_cost, 0) > 0
      ORDER BY revenue DESC
    `)

    // Process results
    const skuAnalysis = result.rows.map((row: any) => ({
      skuName: row.sku_name,
      quantitySold: Number(row.quantity_sold),
      revenue: Number(row.revenue),
      cost: Number(row.cost),
      profit: Number(row.profit),
      marginPercent: Number(row.margin_percent),
    }))

    // Calculate summary totals
    const totalRevenue = skuAnalysis.reduce((sum, item) => sum + item.revenue, 0)
    const totalCost = skuAnalysis.reduce((sum, item) => sum + item.cost, 0)
    const netProfit = totalRevenue - totalCost
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    return {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalCost,
          netProfit,
          marginPercent,
        },
        skuAnalysis,
      },
    }
  } catch (error) {
    console.error('Failed to get analysis:', error)
    return {
      success: false,
      error: '분석 데이터를 가져오는데 실패했습니다',
    }
  }
}
