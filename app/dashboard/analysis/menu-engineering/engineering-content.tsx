'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'
import type { MenuCategory, MenuEngineeringItem } from './actions'

interface EngineeringContentProps {
  items: MenuEngineeringItem[]
  avgQuantity: number
  avgMarginPercent: number
  categoryCounts: Record<MenuCategory, number>
}

const CATEGORY_CONFIG: Record<
  MenuCategory,
  { label: string; labelEn: string; bg: string; color: string; description: string }
> = {
  star: {
    label: 'Star',
    labelEn: 'Star',
    bg: 'bg-brutal-green',
    color: '#77DD77',
    description: '고인기 + 고마진',
  },
  plowhorse: {
    label: 'Plowhorse',
    labelEn: 'Plowhorse',
    bg: 'bg-brutal-yellow',
    color: '#FFD93D',
    description: '고인기 + 저마진',
  },
  puzzle: {
    label: 'Puzzle',
    labelEn: 'Puzzle',
    bg: 'bg-brutal-blue',
    color: '#89CFF0',
    description: '저인기 + 고마진',
  },
  dog: {
    label: 'Dog',
    labelEn: 'Dog',
    bg: 'bg-brutal-pink',
    color: '#FF6B6B',
    description: '저인기 + 저마진',
  },
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const item = payload[0].payload as MenuEngineeringItem
  const config = CATEGORY_CONFIG[item.category]
  return (
    <div className="border-3 border-brutal-black bg-brutal-white p-3 shadow-brutal">
      <p className="text-sm font-black text-brutal-black">{item.skuName}</p>
      <p className="text-xs text-brutal-black/70">
        판매량: {item.quantitySold}개
      </p>
      <p className="text-xs text-brutal-black/70">
        매출: {formatCurrency(item.revenue)}
      </p>
      <p className="text-xs text-brutal-black/70">
        마진율: {item.marginPercent.toFixed(1)}%
      </p>
      <p className="mt-1 text-xs font-bold">
        분류: {config.label} ({config.description})
      </p>
    </div>
  )
}

export default function EngineeringContent({
  items,
  avgQuantity,
  avgMarginPercent,
  categoryCounts,
}: EngineeringContentProps) {
  return (
    <div className="space-y-6">
      {/* Category Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(CATEGORY_CONFIG) as [MenuCategory, typeof CATEGORY_CONFIG.star][]).map(
          ([key, config]) => (
            <div
              key={key}
              className={`border-3 border-brutal-black ${config.bg} p-4 shadow-brutal`}
            >
              <p className="text-sm font-medium text-brutal-black/70">
                {config.label}
              </p>
              <p className="text-xs text-brutal-black/50">{config.description}</p>
              <p className="mt-1 text-2xl font-black text-brutal-black">
                {categoryCounts[key]}개
              </p>
            </div>
          )
        )}
      </div>

      {/* Scatter Chart */}
      <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal sm:p-6">
        <h3 className="mb-2 text-base font-black text-brutal-black">
          메뉴 엔지니어링 매트릭스
        </h3>
        <p className="mb-4 text-xs text-brutal-black/50">
          X축: 판매량 | Y축: 마진율(%) | 점선: 평균
        </p>
        <div className="h-[350px] md:h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                type="number"
                dataKey="quantitySold"
                name="판매량"
                tick={{ fontSize: 12, fontWeight: 700 }}
                stroke="#000"
                label={{
                  value: '판매량',
                  position: 'insideBottom',
                  offset: -10,
                  style: { fontWeight: 900, fontSize: 13 },
                }}
              />
              <YAxis
                type="number"
                dataKey="marginPercent"
                name="마진율"
                tick={{ fontSize: 12, fontWeight: 700 }}
                stroke="#000"
                width={50}
                label={{
                  value: '마진율(%)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontWeight: 900, fontSize: 13 },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x={avgQuantity}
                stroke="#000"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <ReferenceLine
                y={avgMarginPercent}
                stroke="#000"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <Scatter data={items} fill="#000">
                {items.map((item, index) => (
                  <Cell
                    key={index}
                    fill={CATEGORY_CONFIG[item.category].color}
                    stroke="#000"
                    strokeWidth={2}
                    r={8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="overflow-x-auto border-3 border-brutal-black shadow-brutal">
        <table className="min-w-full">
          <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
            <tr>
              <th className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black">
                SKU
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                판매량
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                매출액
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                원가
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                마진율
              </th>
              <th className="px-3 py-3.5 text-center text-sm font-black text-brutal-black">
                분류
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
            {items.map((item) => {
              const config = CATEGORY_CONFIG[item.category]
              return (
                <tr key={item.skuName}>
                  <td className="py-4 pl-6 pr-3 text-sm font-bold text-brutal-black">
                    {item.skuName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
                    {item.quantitySold}개
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
                    {formatCurrency(item.revenue)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
                    {formatCurrency(Math.round(item.cost))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right">
                    <span
                      className={`inline-flex border-2 px-2 py-1 text-xs font-bold ${
                        item.marginPercent >= 50
                          ? 'border-brutal-black bg-brutal-green text-brutal-black'
                          : item.marginPercent >= 30
                            ? 'border-brutal-black bg-brutal-yellow text-brutal-black'
                            : 'border-brutal-black bg-brutal-pink text-brutal-black'
                      }`}
                    >
                      {item.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span
                      className={`inline-flex border-2 border-brutal-black px-2 py-1 text-xs font-bold ${config.bg} text-brutal-black`}
                    >
                      {config.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
