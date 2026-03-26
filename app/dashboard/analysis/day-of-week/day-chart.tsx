'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'
import type { DayOfWeekData } from './actions'

interface DayChartProps {
  data: DayOfWeekData[]
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon-Sun

export default function DayChart({ data }: DayChartProps) {
  // Reorder Mon-Sun and fill missing days
  const allDays = ['월', '화', '수', '목', '금', '토', '일']
  const dataMap = new Map(data.map((d) => [d.dayOfWeek, d]))

  const chartData = DAY_ORDER.map((dow, idx) => {
    const d = dataMap.get(dow)
    return {
      dayLabel: allDays[idx],
      avgDailyRevenue: d?.avgDailyRevenue ?? 0,
      avgDailyQuantity: d?.avgDailyQuantity ?? 0,
      totalRevenue: d?.totalRevenue ?? 0,
      dayCount: d?.dayCount ?? 0,
    }
  })

  const maxRevenue = Math.max(...chartData.map((d) => d.avgDailyRevenue))
  const minRevenue = Math.min(
    ...chartData.filter((d) => d.avgDailyRevenue > 0).map((d) => d.avgDailyRevenue)
  )

  const bestDay = chartData.find((d) => d.avgDailyRevenue === maxRevenue)
  const worstDay = chartData.find(
    (d) => d.avgDailyRevenue === minRevenue && d.avgDailyRevenue > 0
  )

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
    return String(value)
  }

  return (
    <div className="space-y-6">
      {/* Highlight Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-3 border-brutal-black bg-brutal-green p-4 shadow-brutal">
          <p className="text-sm font-medium text-brutal-black/70">
            최고 매출 요일
          </p>
          <p className="mt-1 text-2xl font-black text-brutal-black">
            {bestDay?.dayLabel ?? '-'}요일
          </p>
          <p className="mt-1 text-sm font-bold text-brutal-black/70">
            평균 {formatCurrency(bestDay?.avgDailyRevenue ?? 0)}
          </p>
        </div>
        <div className="border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal">
          <p className="text-sm font-medium text-brutal-black/70">
            최저 매출 요일
          </p>
          <p className="mt-1 text-2xl font-black text-brutal-black">
            {worstDay?.dayLabel ?? '-'}요일
          </p>
          <p className="mt-1 text-sm font-bold text-brutal-black/70">
            평균 {formatCurrency(worstDay?.avgDailyRevenue ?? 0)}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal sm:p-6">
        <h3 className="mb-4 text-base font-black text-brutal-black">
          요일별 평균 매출
        </h3>
        <div className="h-[300px] md:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                dataKey="dayLabel"
                tick={{ fontSize: 14, fontWeight: 900 }}
                stroke="#000"
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12, fontWeight: 700 }}
                stroke="#000"
                width={60}
              />
              <Tooltip
                formatter={(value?: number) => [
                  formatCurrency(value ?? 0),
                  '평균 매출',
                ]}
                contentStyle={{
                  border: '3px solid #000',
                  borderRadius: 0,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="avgDailyRevenue" stroke="#000" strokeWidth={2}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.avgDailyRevenue === maxRevenue
                        ? '#77DD77'
                        : entry.avgDailyRevenue === minRevenue &&
                            entry.avgDailyRevenue > 0
                          ? '#FF6B6B'
                          : '#FFD93D'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
        <table className="min-w-full">
          <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
            <tr>
              <th className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black">
                요일
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                집계 일수
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                총 매출
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                평균 매출
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                평균 판매량
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
            {chartData.map((row) => (
              <tr key={row.dayLabel}>
                <td className="py-4 pl-6 pr-3 text-sm font-bold text-brutal-black">
                  {row.dayLabel}요일
                </td>
                <td className="px-3 py-4 text-right text-sm text-brutal-black">
                  {row.dayCount}일
                </td>
                <td className="px-3 py-4 text-right text-sm text-brutal-black">
                  {formatCurrency(row.totalRevenue)}
                </td>
                <td className="px-3 py-4 text-right text-sm font-bold text-brutal-black">
                  {formatCurrency(row.avgDailyRevenue)}
                </td>
                <td className="px-3 py-4 text-right text-sm text-brutal-black">
                  {row.avgDailyQuantity}개
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
