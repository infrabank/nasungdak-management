'use server'

import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { sql } from 'drizzle-orm'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export interface DayOfWeekData {
  dayOfWeek: number
  dayLabel: string
  dayCount: number
  totalRevenue: number
  totalQuantity: number
  avgDailyRevenue: number
  avgDailyQuantity: number
}

export interface DayOfWeekResult {
  success: boolean
  data?: DayOfWeekData[]
  error?: string
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

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

export async function getDayOfWeekAnalysis(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<DayOfWeekResult> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: true, data: [] }
    }

    const normalizedStoreId = storeId ?? 'all'
    const salesStoreFilter = buildStoreFilter(
      normalizedStoreId,
      authorizedStoreIds,
      'sr'
    )

    const result = await db.execute(sql`
      SELECT
        EXTRACT(DOW FROM sr.sale_date)::int AS day_of_week,
        COUNT(DISTINCT sr.sale_date) AS day_count,
        COALESCE(SUM(sr.total_revenue), 0) AS total_revenue,
        COALESCE(SUM(sr.quantity_sold), 0) AS total_quantity
      FROM sales_records sr
      WHERE sr.sale_date BETWEEN ${startDate}::date AND ${endDate}::date
        AND sr.deleted_at IS NULL
        ${salesStoreFilter}
      GROUP BY EXTRACT(DOW FROM sr.sale_date)
      ORDER BY day_of_week
    `)

    const data: DayOfWeekData[] = result.rows.map((row: any) => {
      const dayOfWeek = Number(row.day_of_week)
      const dayCount = Number(row.day_count)
      const totalRevenue = Number(row.total_revenue)
      const totalQuantity = Number(row.total_quantity)
      return {
        dayOfWeek,
        dayLabel: DAY_LABELS[dayOfWeek],
        dayCount,
        totalRevenue,
        totalQuantity,
        avgDailyRevenue: dayCount > 0 ? Math.round(totalRevenue / dayCount) : 0,
        avgDailyQuantity:
          dayCount > 0 ? Math.round(totalQuantity / dayCount) : 0,
      }
    })

    return { success: true, data }
  } catch (error) {
    logger.error(
      'Failed to get day-of-week analysis:',
      errorToContext(error)
    )
    return {
      success: false,
      error: '요일별 판매 분석 데이터를 가져오는데 실패했습니다',
    }
  }
}
