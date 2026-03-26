'use client'

import { useState } from 'react'
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
import type { IngredientPriceRow, IngredientPriceSummary } from './actions'

interface PriceChartProps {
  rows: IngredientPriceRow[]
  summaries: IngredientPriceSummary[]
}

const LINE_COLORS = [
  '#000000',
  '#E63946',
  '#457B9D',
  '#E9C46A',
  '#2A9D8F',
  '#F4A261',
  '#264653',
  '#E76F51',
  '#606C38',
  '#DDA15E',
]

export default function PriceChart({ rows, summaries }: PriceChartProps) {
  // Default: show top 5 by price change
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(summaries.slice(0, 5).map((s) => s.ingredientId))
  )

  const toggleIngredient = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Filter rows to selected ingredients
  const filteredRows = rows.filter((r) => selectedIds.has(r.ingredientId))

  // Build ingredient name map
  const nameMap = new Map(summaries.map((s) => [s.ingredientId, s.ingredientName]))

  // Get unique ingredient names for selected items
  const selectedNames = Array.from(selectedIds)
    .map((id) => nameMap.get(id)!)
    .filter(Boolean)

  // Build chart data
  const months = Array.from(new Set(filteredRows.map((r) => r.month))).sort()
  const chartData = months.map((month) => {
    const row: Record<string, string | number> = { month }
    for (const id of selectedIds) {
      const name = nameMap.get(id)
      if (!name) continue
      const match = filteredRows.find(
        (r) => r.month === month && r.ingredientId === id
      )
      row[name] = match ? Math.round(match.avgUnitPrice) : 0
    }
    return row
  })

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
    return String(value)
  }

  return (
    <div className="space-y-6">
      {/* Ingredient selector */}
      <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <h3 className="mb-3 text-sm font-black text-brutal-black">
          식재료 선택
        </h3>
        <div className="flex flex-wrap gap-2">
          {summaries.map((s) => (
            <button
              key={s.ingredientId}
              onClick={() => toggleIngredient(s.ingredientId)}
              className={`border-2 border-brutal-black px-3 py-1.5 text-xs font-bold transition-all ${
                selectedIds.has(s.ingredientId)
                  ? 'bg-brutal-yellow text-brutal-black shadow-brutal-sm'
                  : 'bg-brutal-white text-brutal-black/60 hover:bg-brutal-yellow/30'
              }`}
            >
              {s.ingredientName}
            </button>
          ))}
        </div>
      </div>

      {/* Line Chart */}
      {chartData.length > 0 && selectedNames.length > 0 && (
        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal sm:p-6">
          <h3 className="mb-4 text-base font-black text-brutal-black">
            월간 단가 추이
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
                <Legend wrapperStyle={{ fontSize: 13, fontWeight: 700 }} />
                {selectedNames.map((name, i) => (
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
      )}

      {/* Summary Table */}
      <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
        <table className="min-w-full">
          <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
            <tr>
              <th className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black">
                식재료명
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                시작 단가
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                현재 단가
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                변동률
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
            {summaries.map((s) => (
              <tr key={s.ingredientId}>
                <td className="py-4 pl-6 pr-3 text-sm font-bold text-brutal-black">
                  {s.ingredientName}
                </td>
                <td className="px-3 py-4 text-right text-sm text-brutal-black">
                  {formatCurrency(Math.round(s.startPrice))}
                </td>
                <td className="px-3 py-4 text-right text-sm text-brutal-black">
                  {formatCurrency(Math.round(s.endPrice))}
                </td>
                <td className="px-3 py-4 text-right">
                  <span
                    className={`inline-flex border-2 px-2 py-1 text-xs font-bold ${
                      s.changePercent > 5
                        ? 'border-brutal-black bg-brutal-pink text-brutal-black'
                        : s.changePercent < -5
                          ? 'border-brutal-black bg-brutal-green text-brutal-black'
                          : 'border-brutal-black bg-brutal-white text-brutal-black'
                    }`}
                  >
                    {s.changePercent > 0 ? '+' : ''}
                    {s.changePercent.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
