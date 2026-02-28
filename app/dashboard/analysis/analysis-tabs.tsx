'use client'

import { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils/format'
import MonthlyTrendChart from './monthly-trend-chart'

interface SkuAnalysisItem {
  skuName: string
  quantitySold: number
  revenue: number
  cost: number
  profit: number
  marginPercent: number
  hasBom: boolean
}

interface MonthlyData {
  month: string
  totalRevenue: number
  totalVariableCost: number
  totalFixedCost: number
  totalCost: number
  netProfit: number
  marginPercent: number
}

interface MonthlySkuDataItem {
  month: string
  skuId: string
  skuName: string
  quantitySold: number
  revenue: number
}

interface SkuCostItem {
  skuId: string
  skuName: string
  unitPrice: number
  costPerUnit: number
  hasBom: boolean
}

interface AnalysisTabsProps {
  skuAnalysis: SkuAnalysisItem[]
  monthlyData: MonthlyData[]
  monthlySkuData: MonthlySkuDataItem[]
  skuCosts: SkuCostItem[]
}

export default function AnalysisTabs({
  skuAnalysis,
  monthlyData,
  monthlySkuData,
  skuCosts,
}: AnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState<'sku' | 'monthly'>('sku')

  // TOP 3 by sales quantity
  const salesTop3 = useMemo(() => {
    const skuTotals = new Map<string, { skuName: string; total: number }>()
    for (const item of monthlySkuData) {
      const existing = skuTotals.get(item.skuId)
      if (existing) {
        existing.total += item.quantitySold
      } else {
        skuTotals.set(item.skuId, {
          skuName: item.skuName,
          total: item.quantitySold,
        })
      }
    }
    return Array.from(skuTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
  }, [monthlySkuData])

  // TOP 3 by margin rate
  const marginTop3 = useMemo(() => {
    return skuCosts
      .filter((s) => s.hasBom && s.unitPrice > 0)
      .map((s) => ({
        skuName: s.skuName,
        marginPercent:
          ((s.unitPrice - s.costPerUnit) / s.unitPrice) * 100,
      }))
      .sort((a, b) => b.marginPercent - a.marginPercent)
      .slice(0, 3)
  }, [skuCosts])

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6 border-b-3 border-brutal-black">
        <nav className="-mb-px flex space-x-4">
          <button
            onClick={() => setActiveTab('sku')}
            className={`${
              activeTab === 'sku'
                ? '-translate-y-0.5 border-3 border-b-0 border-brutal-black bg-brutal-yellow font-black text-brutal-black shadow-brutal-sm'
                : 'border-3 border-b-0 border-brutal-black bg-brutal-white font-bold text-brutal-black hover:bg-brutal-yellow/50'
            } whitespace-nowrap px-4 py-3 text-sm transition-all`}
          >
            SKU별 분석
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`${
              activeTab === 'monthly'
                ? '-translate-y-0.5 border-3 border-b-0 border-brutal-black bg-brutal-yellow font-black text-brutal-black shadow-brutal-sm'
                : 'border-3 border-b-0 border-brutal-black bg-brutal-white font-bold text-brutal-black hover:bg-brutal-yellow/50'
            } whitespace-nowrap px-4 py-3 text-sm transition-all`}
          >
            월별 분석
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'sku' ? (
        <div className="border-3 border-brutal-black bg-brutal-white shadow-brutal">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-base font-black text-brutal-black">
              SKU별 분석
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-3 border-brutal-black">
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-black text-brutal-black sm:pl-0"
                    >
                      SKU
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                    >
                      판매량
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                    >
                      매출액
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                    >
                      원가
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                    >
                      순이익
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                    >
                      마진율
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-brutal-black">
                  {skuAnalysis.length > 0 ? (
                    skuAnalysis.map((sku, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-brutal-black sm:pl-0">
                          {sku.skuName}
                          {sku.hasBom && (
                            <span className="ml-1 inline-flex items-center border border-brutal-black bg-brutal-blue px-1 text-[10px] font-bold">
                              BOM
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-brutal-black">
                          {sku.quantitySold.toFixed(0)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                          {formatCurrency(sku.revenue)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-brutal-black">
                          {formatCurrency(sku.cost)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                          {formatCurrency(sku.profit)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
                          <span
                            className={`inline-flex items-center border-2 border-brutal-black px-2 py-1 text-xs font-bold ${
                              sku.marginPercent >= 40
                                ? 'bg-brutal-green text-brutal-black'
                                : sku.marginPercent >= 20
                                  ? 'bg-brutal-yellow text-brutal-black'
                                  : 'bg-brutal-pink text-brutal-black'
                            }`}
                          >
                            {sku.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-sm font-bold text-brutal-black"
                      >
                        해당 기간에 데이터가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TOP 3 Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Sales Quantity TOP 3 */}
            <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
              <h4 className="mb-3 text-sm font-black text-brutal-black">
                판매량 TOP 3
              </h4>
              {salesTop3.length > 0 ? (
                <ol className="space-y-2">
                  {salesTop3.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-bold text-brutal-black">
                        {i + 1}. {item.skuName}
                      </span>
                      <span className="font-black text-brutal-black">
                        {item.total.toFixed(0)}개
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm font-bold text-brutal-black">
                  데이터 없음
                </p>
              )}
            </div>

            {/* Margin Rate TOP 3 */}
            <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
              <h4 className="mb-3 text-sm font-black text-brutal-black">
                마진율 TOP 3
              </h4>
              {marginTop3.length > 0 ? (
                <ol className="space-y-2">
                  {marginTop3.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-bold text-brutal-black">
                        {i + 1}. {item.skuName}
                      </span>
                      <span
                        className={`inline-flex items-center border-2 border-brutal-black px-2 py-0.5 text-xs font-bold ${
                          item.marginPercent >= 40
                            ? 'bg-brutal-green text-brutal-black'
                            : item.marginPercent >= 20
                              ? 'bg-brutal-yellow text-brutal-black'
                              : 'bg-brutal-pink text-brutal-black'
                        }`}
                      >
                        {item.marginPercent.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm font-bold text-brutal-black">
                  BOM 등록된 SKU가 없습니다
                </p>
              )}
            </div>
          </div>

          {/* SKU Revenue Trend Chart */}
          <MonthlyTrendChart monthlySkuData={monthlySkuData} />

          {/* Monthly Summary Table */}
          <div className="border-3 border-brutal-black bg-brutal-white shadow-brutal">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="mb-4 text-base font-black text-brutal-black">
                월별 요약
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-3 border-brutal-black">
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-black text-brutal-black sm:pl-0"
                      >
                        월
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                      >
                        매출액
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                      >
                        변동비
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                      >
                        고정비
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                      >
                        총비용
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                      >
                        순이익
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                      >
                        마진율
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-brutal-black">
                    {monthlyData.length > 0 ? (
                      monthlyData.map((month) => (
                        <tr key={month.month}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-brutal-black sm:pl-0">
                            {month.month}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                            {formatCurrency(month.totalRevenue)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-brutal-black">
                            {formatCurrency(month.totalVariableCost)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                            {formatCurrency(month.totalFixedCost)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-brutal-black">
                            {formatCurrency(month.totalCost)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                            {formatCurrency(month.netProfit)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
                            <span
                              className={`inline-flex items-center border-2 border-brutal-black px-2 py-1 text-xs font-bold ${
                                month.marginPercent >= 40
                                  ? 'bg-brutal-green text-brutal-black'
                                  : month.marginPercent >= 20
                                    ? 'bg-brutal-yellow text-brutal-black'
                                    : 'bg-brutal-pink text-brutal-black'
                              }`}
                            >
                              {month.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-sm font-bold text-brutal-black"
                        >
                          해당 기간에 데이터가 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
