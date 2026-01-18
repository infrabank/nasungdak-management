/**
 * AnalysisContent - Async Server Component
 *
 * Fetches and renders all analysis data (summary cards + detailed tabs).
 * Wrapped in Suspense by the parent page to enable streaming - the form
 * renders immediately while this component loads data.
 */

import { getAnalysis, getMonthlyAnalysis } from './actions'
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
  const [result, monthlyResult] = await Promise.all([
    getAnalysis(startDate, endDate, storeId),
    getMonthlyAnalysis(startDate, endDate, storeId),
  ])

  if (!result.success || !result.data || !monthlyResult.success) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
        <div className="text-center text-sm text-red-600">
          {result.error || monthlyResult.error || '데이터를 불러오는데 실패했습니다'}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-5 mb-6">
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="text-sm font-medium text-gray-700">총 매출</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(result.data.summary.totalRevenue)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="text-sm font-medium text-gray-700">변동비 (원가)</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(result.data.summary.totalVariableCost)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="text-sm font-medium text-gray-700">고정비</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">
            {formatCurrency(result.data.summary.totalFixedCost)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="text-sm font-medium text-gray-700">순이익</div>
          <div className={`mt-2 text-3xl font-bold ${result.data.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(result.data.summary.netProfit)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="text-sm font-medium text-gray-700">마진율</div>
          <div className={`mt-2 text-3xl font-bold ${result.data.summary.marginPercent >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {result.data.summary.marginPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Tabs for Period vs Monthly Analysis */}
      <AnalysisTabs
        skuAnalysis={result.data.skuAnalysis}
        monthlyData={monthlyResult.data || []}
      />

      {/* Help Text */}
      {result.data.skuAnalysis.length === 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>데이터가 없나요?</strong> 다음을 확인하세요:
          </p>
          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>선택한 기간에 판매 기록이 있는지 확인하세요</li>
            <li>선택한 기간에 매입 기록이 있는지 확인하세요</li>
            <li>
              <Link href="/dashboard/master-data/cost-rules" className="underline font-medium">
                원가 배분 규칙
              </Link>
              이 설정되어 있는지 확인하세요
            </li>
          </ul>
        </div>
      )}
    </>
  )
}
