'use server'

import { db } from '@/lib/db'
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
  tableAlias: 'sr' | 'pt' | 'fc'
): ReturnType<typeof sql> {
  // 특정 매장 선택 시 (권한 있는 경우)
  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
    return sql`AND ${sql.identifier(tableAlias)}.store_id = ${storeId}`
  }

  // 전체 매장 선택 시 - 권한 있는 매장들로 필터
  // Drizzle의 sql 태그를 사용한 parameterized IN clause
  const placeholders = authorizedStoreIds.map(
    (_, i) => sql`${authorizedStoreIds[i]}`
  )
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
    'fc'
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
    console.error('Failed to get monthly analysis:', error)
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
    return sql`AND store_id = ${storeId}`
  }

  const placeholders = authorizedStoreIds.map(
    (_, i) => sql`${authorizedStoreIds[i]}`
  )
  return sql`AND store_id IN (${sql.join(placeholders, sql`, `)})`
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
  // Uses direct purchase costs (same as dashboard) instead of distribution rules
  const [skuResult, totalCostsResult, fixedCostsResult] = await Promise.all([
    // SKU-level sales with costs attributed by menu
    db.execute(sql`
      WITH sales_summary AS (
        SELECT
          sr.sku_id,
          s.sku_name,
          s.menu_id,
          SUM(sr.quantity_sold) AS total_quantity,
          SUM(sr.total_revenue) AS total_revenue
        FROM sales_records sr
        JOIN skus s ON sr.sku_id = s.id
        WHERE sr.sale_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND sr.deleted_at IS NULL
          AND s.deleted_at IS NULL
          ${salesStoreFilter}
        GROUP BY sr.sku_id, s.sku_name, s.menu_id
      ),
      cost_by_menu AS (
        -- Direct purchase costs grouped by menu (no distribution rules)
        SELECT
          pt.menu_id,
          SUM(pt.total_amount) AS total_cost
        FROM purchase_transactions pt
        WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND pt.deleted_at IS NULL
          AND pt.is_valid = true
          ${purchaseStoreFilter}
        GROUP BY pt.menu_id
      )
      SELECT
        ss.sku_name,
        ss.total_quantity AS quantity_sold,
        ss.total_revenue AS revenue,
        COALESCE(cm.total_cost, 0) AS cost,
        ss.total_revenue - COALESCE(cm.total_cost, 0) AS profit,
        CASE
          WHEN ss.total_revenue > 0
          THEN ((ss.total_revenue - COALESCE(cm.total_cost, 0)) / ss.total_revenue * 100)
          ELSE 0
        END AS margin_percent
      FROM sales_summary ss
      LEFT JOIN cost_by_menu cm ON ss.menu_id = cm.menu_id
      ORDER BY revenue DESC
    `),
    // Total variable costs (all valid purchases - same as dashboard)
    db.execute(sql`
      SELECT COALESCE(SUM(pt.total_amount), 0) AS total_variable_cost
      FROM purchase_transactions pt
      WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
        AND pt.deleted_at IS NULL
        AND pt.is_valid = true
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
    console.error('Failed to get analysis:', error)
    return {
      success: false,
      error: '분석 데이터를 가져오는데 실패했습니다',
    }
  }
}
