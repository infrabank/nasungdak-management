'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/format'

interface SkuAnalysisItem {
  skuName: string
  quantitySold: number
  revenue: number
  cost: number
  profit: number
  marginPercent: number
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

interface AnalysisTabsProps {
  skuAnalysis: SkuAnalysisItem[]
  monthlyData: MonthlyData[]
}

export default function AnalysisTabs({ skuAnalysis, monthlyData }: AnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState<'sku' | 'monthly'>('sku')

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sku')}
            className={`${
              activeTab === 'sku'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            SKU별 분석
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`${
              activeTab === 'monthly'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            월별 분석
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'sku' ? (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">SKU별 분석</h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      SKU
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      판매량
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      매출액
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      원가
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      순이익
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      마진율
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {skuAnalysis.length > 0 ? (
                    skuAnalysis.map((sku, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                          {sku.skuName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 text-right">
                          {sku.quantitySold.toFixed(0)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-semibold">
                          {formatCurrency(sku.revenue)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 text-right">
                          {formatCurrency(sku.cost)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-semibold">
                          {formatCurrency(sku.profit)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              sku.marginPercent >= 40
                                ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                : sku.marginPercent >= 20
                                ? 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20'
                                : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                            }`}
                          >
                            {sku.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-gray-700">
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
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">월별 분석</h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      월
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      매출액
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      변동비
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      고정비
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      총비용
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      순이익
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      마진율
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyData.length > 0 ? (
                    monthlyData.map((month) => (
                      <tr key={month.month}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                          {month.month}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-semibold">
                          {formatCurrency(month.totalRevenue)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 text-right">
                          {formatCurrency(month.totalVariableCost)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-orange-600 text-right">
                          {formatCurrency(month.totalFixedCost)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 text-right">
                          {formatCurrency(month.totalCost)}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm text-right font-semibold ${
                          month.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(month.netProfit)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              month.marginPercent >= 40
                                ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                : month.marginPercent >= 20
                                ? 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20'
                                : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                            }`}
                          >
                            {month.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-gray-700">
                        해당 기간에 데이터가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
