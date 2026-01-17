import { getAnalysis, getMonthlyAnalysis } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import AnalysisTabs from './analysis-tabs'

interface SearchParams {
  startDate?: string
  endDate?: string
  storeId?: string
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams

  // Get date range from search params or use defaults
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const startDate = params.startDate || formatDate(firstDayOfMonth, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const storeId = params.storeId || undefined

  // Fetch analysis data
  const [result, monthlyResult] = await Promise.all([
    getAnalysis(startDate, endDate, storeId),
    getMonthlyAnalysis(startDate, endDate, storeId)
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">기간 분석</h1>
        <p className="mt-2 text-sm text-gray-600">
          판매 원가 및 마진율 분석
        </p>
      </div>

      {/* Date Range Filter */}
      <form method="GET" className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6 mb-6">
        {/* Preserve storeId from URL */}
        {storeId && <input type="hidden" name="storeId" value={storeId} />}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-900">
              시작 날짜
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="startDate"
                id="startDate"
                defaultValue={startDate}
                className="block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-900">
              종료 날짜
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="endDate"
                id="endDate"
                defaultValue={endDate}
                className="block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      {result.success && result.data && monthlyResult.success ? (
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
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="text-center text-sm text-red-600">
            {result.error || monthlyResult.error || '데이터를 불러오는데 실패했습니다'}
          </div>
        </div>
      )}

      {/* Help Text - Keep old one but update condition */}
      {result.success && result.data && result.data.skuAnalysis.length === 0 && (
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
    </div>
  )
}
