/**
 * AnalysisContent - Async Server Component
 *
 * Fetches and renders all analysis data (summary cards + detailed tabs).
 * Wrapped in Suspense by the parent page to enable streaming - the form
 * renders immediately while this component loads data.
 */

import { getAnalysis, getMonthlyAnalysis, getMonthlySkuAnalysis } from './actions'
import { formatCurrency } from '@/lib/utils/format'
import Link from 'next/link'
import AnalysisTabs from './analysis-tabs'

interface AnalysisContentProps {
  startDate: string
  endDate: string
  storeId: string | undefined
}

export default async function AnalysisContent({
  startDate,
  endDate,
  storeId,
}: AnalysisContentProps) {
  // Fetch analysis data
  const [result, monthlyResult, monthlySkuResult] = await Promise.all([
    getAnalysis(startDate, endDate, storeId),
    getMonthlyAnalysis(startDate, endDate, storeId),
    getMonthlySkuAnalysis(startDate, endDate, storeId),
  ])

  if (!result.success || !result.data || !monthlyResult.success || !monthlySkuResult.success) {
    return (
      <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <div className="text-center text-sm font-bold text-red-600">
          {result.error ||
            monthlyResult.error ||
            monthlySkuResult.error ||
            '데이터를 불러오는데 실패했습니다'}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-6 lg:grid-cols-5">
        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="text-sm font-bold text-brutal-black">총 매출</div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {formatCurrency(result.data.summary.totalRevenue)}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="text-sm font-bold text-brutal-black">
            변동비 (원가)
          </div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {formatCurrency(result.data.summary.totalVariableCost)}
          </div>
          <div className="mt-1 text-xs font-medium text-brutal-black/50">
            기간 내 실제 매입액 기준 (메뉴별 원가는 레시피 단가 기준)
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal">
          <div className="text-sm font-bold text-brutal-black">고정비</div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {formatCurrency(result.data.summary.totalFixedCost)}
          </div>
        </div>

        <div
          className={`border-3 border-brutal-black p-4 shadow-brutal ${result.data.summary.netProfit >= 0 ? 'bg-brutal-green' : 'bg-brutal-pink'}`}
        >
          <div className="text-sm font-bold text-brutal-black">순이익</div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {formatCurrency(result.data.summary.netProfit)}
          </div>
        </div>

        <div
          className={`border-3 border-brutal-black p-4 shadow-brutal ${result.data.summary.marginPercent >= 0 ? 'bg-brutal-white' : 'bg-brutal-pink'}`}
        >
          <div className="text-sm font-bold text-brutal-black">마진율</div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {result.data.summary.marginPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Tabs for Period vs Monthly Analysis */}
      <AnalysisTabs
        skuAnalysis={result.data.skuAnalysis}
        monthlyData={monthlyResult.data || []}
        monthlySkuData={monthlySkuResult.data?.monthlySkuData || []}
        skuCosts={monthlySkuResult.data?.skuCosts || []}
      />

      {/* Help Text */}
      {result.data.skuAnalysis.length === 0 && (
        <div className="mt-6 border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
          <p className="text-sm font-bold text-brutal-black">
            데이터가 없나요? 다음을 확인하세요:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm font-medium text-brutal-black">
            <li>선택한 기간에 판매 기록이 있는지 확인하세요</li>
            <li>선택한 기간에 매입 기록이 있는지 확인하세요</li>
            <li>
              <Link
                href="/dashboard/master-data/sku-recipes"
                className="font-bold underline"
              >
                SKU 레시피
              </Link>
              가 등록되어 있는지 확인하세요 (원가 계산 기준)
            </li>
          </ul>
        </div>
      )}
    </>
  )
}
