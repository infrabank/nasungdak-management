'use server'

import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { sql } from 'drizzle-orm'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export interface MonthlyReportMenu {
  skuName: string
  quantity: number
  revenue: number
  costRate: number | null // 레시피 기반 원가율 (%), 레시피 없으면 null
}

export interface MonthlyReportIngredient {
  ingredientName: string
  amount: number
  prevAmount: number
  changePercent: number | null // 전월 대비 (%), 전월 0이면 null
}

export interface MonthlyReport {
  month: string // YYYY-MM
  sales: { total: number; prevTotal: number }
  purchases: { total: number; prevTotal: number }
  fixedCosts: { total: number }
  labor: { totalPay: number; unlinkedPay: number } // unlinked: 고정비 미연동분
  estimatedProfit: number
  prevEstimatedProfit: number
  costRate: number // 매입비/매출 (%)
  payments: { card: number; cash: number; delivery: number } | null
  topQuantityMenus: MonthlyReportMenu[]
  topRevenueMenus: MonthlyReportMenu[]
  highCostMenus: MonthlyReportMenu[] // 원가율 40% 이상
  topPurchases: MonthlyReportIngredient[]
  surgingPurchases: MonthlyReportIngredient[] // 전월 대비 +30% 이상
  unlinkedPurchaseAmount: number // 레시피 미연결 매입비
  unlinkedPurchaseRate: number // 매출 대비 (%) - 공통 원가율 가산용
  checklist: string[]
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${month}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getMonthlyReport(
  month: string
): Promise<{ success: boolean; data?: MonthlyReport; error?: string }> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: false, error: '매장 권한이 없습니다' }
    }

    const cur = monthRange(month)
    const prev = monthRange(prevMonth(month))

    // 권한 매장 필터 (storeId NULL 데이터 포함)
    const storeIn = sql.join(
      authorizedStoreIds.map((id) => sql`${id}::uuid`),
      sql`, `
    )
    const storeFilter = sql`AND (store_id IN (${storeIn}) OR store_id IS NULL)`
    const ptStoreFilter = sql`AND (pt.store_id IN (${storeIn}) OR pt.store_id IS NULL)`

    const [
      summary,
      payments,
      menuSales,
      recipeCosts,
      curPurchasesByIngredient,
      prevPurchasesByIngredient,
      unlinked,
    ] = await Promise.all([
      // 매출/매입/고정비/인건비 - 당월 + 전월
      db.execute(sql`
        SELECT
          (SELECT COALESCE(SUM(total_revenue), 0) FROM sales_records
            WHERE sale_date BETWEEN ${cur.start}::date AND ${cur.end}::date
              AND deleted_at IS NULL ${storeFilter}) as cur_sales,
          (SELECT COALESCE(SUM(total_revenue), 0) FROM sales_records
            WHERE sale_date BETWEEN ${prev.start}::date AND ${prev.end}::date
              AND deleted_at IS NULL ${storeFilter}) as prev_sales,
          (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_transactions
            WHERE transaction_date BETWEEN ${cur.start}::date AND ${cur.end}::date
              AND deleted_at IS NULL ${storeFilter}) as cur_purchases,
          (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_transactions
            WHERE transaction_date BETWEEN ${prev.start}::date AND ${prev.end}::date
              AND deleted_at IS NULL ${storeFilter}) as prev_purchases,
          (SELECT COALESCE(SUM(amount), 0) FROM fixed_costs
            WHERE cost_date BETWEEN ${cur.start}::date AND ${cur.end}::date
              AND deleted_at IS NULL ${storeFilter}) as cur_fixed,
          (SELECT COALESCE(SUM(amount), 0) FROM fixed_costs
            WHERE cost_date BETWEEN ${prev.start}::date AND ${prev.end}::date
              AND deleted_at IS NULL ${storeFilter}) as prev_fixed,
          (SELECT COALESCE(SUM(total_pay), 0) FROM attendance_records
            WHERE work_date BETWEEN ${cur.start}::date AND ${cur.end}::date
              AND deleted_at IS NULL ${storeFilter}) as cur_labor,
          (SELECT COALESCE(SUM(total_pay), 0) FROM attendance_records
            WHERE work_date BETWEEN ${cur.start}::date AND ${cur.end}::date
              AND deleted_at IS NULL AND fixed_cost_id IS NULL ${storeFilter}) as cur_labor_unlinked,
          (SELECT COALESCE(SUM(total_pay), 0) FROM attendance_records
            WHERE work_date BETWEEN ${prev.start}::date AND ${prev.end}::date
              AND deleted_at IS NULL AND fixed_cost_id IS NULL ${storeFilter}) as prev_labor_unlinked
      `),
      // 결제수단 구성 (일일 마감 기준)
      db.execute(sql`
        SELECT
          COALESCE(SUM(card_sales), 0) as card,
          COALESCE(SUM(cash_sales), 0) as cash,
          COALESCE(SUM(delivery_sales), 0) as delivery,
          COUNT(*) as closing_count
        FROM daily_closings
        WHERE closing_date BETWEEN ${cur.start}::date AND ${cur.end}::date
          AND deleted_at IS NULL ${storeFilter}
      `),
      // SKU별 당월 판매
      db.execute(sql`
        SELECT sr.sku_id, s.sku_name,
          COALESCE(SUM(sr.quantity_sold), 0) as qty,
          COALESCE(SUM(sr.total_revenue), 0) as revenue
        FROM sales_records sr
        JOIN skus s ON s.id = sr.sku_id
        WHERE sr.sale_date BETWEEN ${cur.start}::date AND ${cur.end}::date
          AND sr.deleted_at IS NULL
          AND (sr.store_id IN (${storeIn}) OR sr.store_id IS NULL)
        GROUP BY sr.sku_id, s.sku_name
      `),
      // SKU별 레시피 원가 (재료 unitCost 기준)
      db.execute(sql`
        SELECT s.id as sku_id, s.unit_price,
          SUM(r.quantity * COALESCE(i.unit_cost, 0)) as recipe_cost,
          COUNT(r.id) as recipe_items
        FROM skus s
        JOIN sku_recipes r ON r.sku_id = s.id AND r.deleted_at IS NULL
        LEFT JOIN ingredients i ON i.id = r.ingredient_id AND i.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
        GROUP BY s.id, s.unit_price
      `),
      // 당월 재료별 매입액
      db.execute(sql`
        SELECT pt.ingredient_id, i.ingredient_name,
          COALESCE(SUM(pt.total_amount), 0) as total
        FROM purchase_transactions pt
        LEFT JOIN ingredients i ON i.id = pt.ingredient_id
        WHERE pt.transaction_date BETWEEN ${cur.start}::date AND ${cur.end}::date
          AND pt.deleted_at IS NULL ${ptStoreFilter}
        GROUP BY pt.ingredient_id, i.ingredient_name
        ORDER BY total DESC
      `),
      // 전월 재료별 매입액
      db.execute(sql`
        SELECT pt.ingredient_id,
          COALESCE(SUM(pt.total_amount), 0) as total
        FROM purchase_transactions pt
        WHERE pt.transaction_date BETWEEN ${prev.start}::date AND ${prev.end}::date
          AND pt.deleted_at IS NULL ${ptStoreFilter}
        GROUP BY pt.ingredient_id
      `),
      // 레시피 미연결 재료의 매입비 (공통 원가율 가산용)
      db.execute(sql`
        SELECT COALESCE(SUM(pt.total_amount), 0) as total
        FROM purchase_transactions pt
        WHERE pt.transaction_date BETWEEN ${cur.start}::date AND ${cur.end}::date
          AND pt.deleted_at IS NULL ${ptStoreFilter}
          AND NOT EXISTS (
            SELECT 1 FROM sku_recipes r
            WHERE r.ingredient_id = pt.ingredient_id AND r.deleted_at IS NULL
          )
      `),
    ])

    const s = summary.rows[0]
    const curSales = Number(s.cur_sales)
    const prevSales = Number(s.prev_sales)
    const curPurchases = Number(s.cur_purchases)
    const curFixed = Number(s.cur_fixed)
    const curLaborUnlinked = Number(s.cur_labor_unlinked)

    const estimatedProfit = curSales - curPurchases - curFixed - curLaborUnlinked
    const prevEstimatedProfit =
      prevSales -
      Number(s.prev_purchases) -
      Number(s.prev_fixed) -
      Number(s.prev_labor_unlinked)

    // 메뉴 분석: 판매 + 레시피 원가율 결합
    const costMap = new Map(
      recipeCosts.rows.map((r) => [
        String(r.sku_id),
        Number(r.unit_price) > 0
          ? (Number(r.recipe_cost) / Number(r.unit_price)) * 100
          : null,
      ])
    )
    const menus: MonthlyReportMenu[] = menuSales.rows.map((r) => ({
      skuName: String(r.sku_name ?? '-'),
      quantity: Number(r.qty),
      revenue: Number(r.revenue),
      costRate: costMap.get(String(r.sku_id)) ?? null,
    }))

    const topQuantityMenus = [...menus]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
    const topRevenueMenus = [...menus]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    const highCostMenus = menus
      .filter((m) => m.costRate !== null && m.costRate >= 40)
      .sort((a, b) => (b.costRate ?? 0) - (a.costRate ?? 0))
      .slice(0, 5)

    // 매입 분석: 상위 + 급증
    const prevMap = new Map(
      prevPurchasesByIngredient.rows.map((r) => [
        String(r.ingredient_id),
        Number(r.total),
      ])
    )
    const purchaseItems: MonthlyReportIngredient[] =
      curPurchasesByIngredient.rows.map((r) => {
        const amount = Number(r.total)
        const prevAmount = prevMap.get(String(r.ingredient_id)) ?? 0
        return {
          ingredientName: String(r.ingredient_name ?? '-'),
          amount,
          prevAmount,
          changePercent:
            prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : null,
        }
      })

    const topPurchases = purchaseItems.slice(0, 5)
    const surgingPurchases = purchaseItems
      .filter((p) => p.changePercent !== null && p.changePercent >= 30)
      .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
      .slice(0, 5)

    const unlinkedPurchaseAmount = Number(unlinked.rows[0].total)
    const unlinkedPurchaseRate =
      curSales > 0 ? (unlinkedPurchaseAmount / curSales) * 100 : 0

    // 다음 달 점검 항목 (룰 기반)
    const checklist: string[] = []
    for (const m of highCostMenus.slice(0, 2)) {
      checklist.push(
        `${m.skuName} 원가율 ${m.costRate?.toFixed(0)}% - 가격 인상 또는 레시피 조정 검토`
      )
    }
    for (const p of surgingPurchases.slice(0, 2)) {
      checklist.push(
        `${p.ingredientName} 매입비 전월 대비 +${p.changePercent?.toFixed(0)}% - 단가/거래처 확인`
      )
    }
    if (unlinkedPurchaseRate >= 10) {
      checklist.push(
        `레시피 미연결 매입비가 매출의 ${unlinkedPurchaseRate.toFixed(0)}% - 핵심 재료 레시피 등록 검토`
      )
    }
    if (curSales > 0 && estimatedProfit < 0) {
      checklist.push('이번 달 적자 - 고정비와 메뉴 구성 점검 필요')
    }

    const closingCount = Number(payments.rows[0].closing_count)

    return {
      success: true,
      data: {
        month,
        sales: { total: curSales, prevTotal: prevSales },
        purchases: {
          total: curPurchases,
          prevTotal: Number(s.prev_purchases),
        },
        fixedCosts: { total: curFixed },
        labor: {
          totalPay: Number(s.cur_labor),
          unlinkedPay: curLaborUnlinked,
        },
        estimatedProfit,
        prevEstimatedProfit,
        costRate: curSales > 0 ? (curPurchases / curSales) * 100 : 0,
        payments:
          closingCount > 0
            ? {
                card: Number(payments.rows[0].card),
                cash: Number(payments.rows[0].cash),
                delivery: Number(payments.rows[0].delivery),
              }
            : null,
        topQuantityMenus,
        topRevenueMenus,
        highCostMenus,
        topPurchases,
        surgingPurchases,
        unlinkedPurchaseAmount,
        unlinkedPurchaseRate,
        checklist,
      },
    }
  } catch (error) {
    logger.error('Failed to build monthly report:', errorToContext(error))
    return { success: false, error: '월간 리포트 생성에 실패했습니다' }
  }
}
