'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface MonthlySkuDataItem {
  month: string
  skuId: string
  skuName: string
  quantitySold: number
  revenue: number
}

interface MonthlyTrendChartProps {
  monthlySkuData: MonthlySkuDataItem[]
}

const LINE_COLORS = ['#000000', '#E63946', '#457B9D', '#E9C46A', '#2A9D8F']

export default function MonthlyTrendChart({
  monthlySkuData,
}: MonthlyTrendChartProps) {
  if (monthlySkuData.length === 0) {
    return (
      <div className="border-3 border-brutal-black bg-brutal-white p-8 shadow-brutal">
        <h3 className="mb-4 text-base font-black text-brutal-black">
          SKU별 매출 추이
        </h3>
        <div className="py-10 text-center text-sm font-bold text-brutal-black">
          해당 기간에 데이터가 없습니다
        </div>
      </div>
    )
  }

  // Aggregate total revenue per SKU and pick top 5
  const skuTotals = new Map<string, { skuName: string; total: number }>()
  for (const item of monthlySkuData) {
    const existing = skuTotals.get(item.skuId)
    if (existing) {
      existing.total += item.revenue
    } else {
      skuTotals.set(item.skuId, { skuName: item.skuName, total: item.revenue })
    }
  }

  const topSkus = Array.from(skuTotals.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)

  const topSkuIds = new Set(topSkus.map(([id]) => id))
  const topSkuNames = topSkus.map(([, v]) => v.skuName)

  // Build chart data: each row is a month with SKU names as keys
  const months = Array.from(new Set(monthlySkuData.map((d) => d.month))).sort()

  const chartData = months.map((month) => {
    const row: Record<string, string | number> = { month }
    for (const [skuId, { skuName }] of topSkus) {
      const match = monthlySkuData.find(
        (d) => d.month === month && d.skuId === skuId
      )
      row[skuName] = match ? match.revenue : 0
    }
    return row
  })

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
    return String(value)
  }

  return (
    <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal sm:p-6">
      <h3 className="mb-4 text-base font-black text-brutal-black">
        SKU별 매출 추이
      </h3>
      <div className="h-[300px] md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fontWeight: 700 }}
              stroke="#000"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12, fontWeight: 700 }}
              stroke="#000"
              width={60}
            />
            <Tooltip
              formatter={(value?: number, name?: string) => [
                formatCurrency(value ?? 0),
                name ?? '',
              ]}
              contentStyle={{
                border: '3px solid #000',
                borderRadius: 0,
                fontWeight: 700,
                fontSize: 13,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 13, fontWeight: 700 }}
            />
            {topSkuNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
