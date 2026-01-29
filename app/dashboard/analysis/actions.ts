'use server'

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

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

async function fetchMonthlyAnalysis(
  startDate: string,
  endDate: string,
  storeId: string
): Promise<MonthlyAnalysisResult> {
  // Build store filter condition
  const salesStoreFilter = storeId !== 'all' ? sql`AND sr.store_id = ${storeId}` : sql``
  const purchaseStoreFilter = storeId !== 'all' ? sql`AND pt.store_id = ${storeId}` : sql``
  const fixedCostStoreFilter = storeId !== 'all' ? sql`AND fc.store_id = ${storeId}` : sql``

  // Execute all queries in parallel for better performance
  const [monthlyRevenueResult, monthlyVariableCostResult, monthlyFixedCostResult] =
    await Promise.all([
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
          AND pt.is_valid = true
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
  const monthsMap = new Map<string, {
    revenue: number
    variableCost: number
    fixedCost: number
  }>()

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
      const marginPercent = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0

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
    const normalizedStoreId = storeId ?? 'all'

    const getCachedMonthlyAnalysis = unstable_cache(
      fetchMonthlyAnalysis,
      ['analysis:monthly', startDate, endDate, normalizedStoreId],
      { tags: ['analysis:monthly'] }
    )

    return await getCachedMonthlyAnalysis(startDate, endDate, normalizedStoreId)
  } catch (error) {
    console.error('Failed to get monthly analysis:', error)
    return {
      success: false,
      error: '월별 분석 데이터를 가져오는데 실패했습니다',
    }
  }
}

async function fetchAnalysis(
  startDate: string,
  endDate: string,
  storeId: string
): Promise<AnalysisResult> {
  // Build store filter conditions
  const salesStoreFilter = storeId !== 'all' ? sql`AND sr.store_id = ${storeId}` : sql``
  const purchaseStoreFilter = storeId !== 'all' ? sql`AND pt.store_id = ${storeId}` : sql``
  const fixedCostStoreFilter = storeId !== 'all' ? sql`AND store_id = ${storeId}` : sql``

  // Execute both queries in parallel for better performance
  const [result, fixedCostsResult] = await Promise.all([
    // Complex SQL query combining sales, purchases, and cost distribution
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
          -- Check if cost rule date range overlaps with query date range
          AND cdr.effective_from <= ${endDate}::date
          AND COALESCE(cdr.effective_to, '9999-12-31'::date) >= ${startDate}::date
          ${purchaseStoreFilter}
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

  // Process results
  const skuAnalysis = result.rows.map((row: any) => ({
    skuName: row.sku_name,
    quantitySold: Number(row.quantity_sold),
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    profit: Number(row.profit),
    marginPercent: Number(row.margin_percent),
  }))

  // Calculate variable costs (ingredient costs from purchases)
  const totalRevenue = skuAnalysis.reduce((sum, item) => sum + item.revenue, 0)
  const totalVariableCost = skuAnalysis.reduce((sum, item) => sum + item.cost, 0)

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

export async function getAnalysis(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<AnalysisResult> {
  try {
    const normalizedStoreId = storeId ?? 'all'

    const getCachedAnalysis = unstable_cache(
      fetchAnalysis,
      ['analysis:sku', startDate, endDate, normalizedStoreId],
      { tags: ['analysis:sku'] }
    )

    return await getCachedAnalysis(startDate, endDate, normalizedStoreId)
  } catch (error) {
    console.error('Failed to get analysis:', error)
    return {
      success: false,
      error: '분석 데이터를 가져오는데 실패했습니다',
    }
  }
}
