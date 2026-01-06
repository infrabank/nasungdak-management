import { getAnalysis } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Link from 'next/link'

interface SearchParams {
  startDate?: string
  endDate?: string
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

  // Fetch analysis data
  const result = await getAnalysis(startDate, endDate)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">기간 분석</h1>
        <p className="mt-2 text-sm text-gray-700">
          판매 원가 및 마진율 분석
        </p>
      </div>

      {/* Date Range Filter */}
      <form method="GET" className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 mb-6">
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
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
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
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      {result.success && result.data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
              <div className="text-sm font-medium text-gray-500">총 매출</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(result.data.summary.totalRevenue)}
              </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
              <div className="text-sm font-medium text-gray-500">변동비 (원가)</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(result.data.summary.totalVariableCost)}
              </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
              <div className="text-sm font-medium text-gray-500">고정비</div>
              <div className="mt-2 text-3xl font-bold text-orange-600">
                {formatCurrency(result.data.summary.totalFixedCost)}
              </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
              <div className="text-sm font-medium text-gray-500">순이익</div>
              <div className={`mt-2 text-3xl font-bold ${result.data.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(result.data.summary.netProfit)}
              </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
              <div className="text-sm font-medium text-gray-500">마진율</div>
              <div className={`mt-2 text-3xl font-bold ${result.data.summary.marginPercent >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {result.data.summary.marginPercent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* SKU Analysis Table */}
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
                    {result.data.skuAnalysis.length > 0 ? (
                      result.data.skuAnalysis.map((sku, index) => (
                        <tr key={index}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {sku.skuName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                            {sku.quantitySold.toFixed(0)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-semibold">
                            {formatCurrency(sku.revenue)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
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
                        <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                          해당 기간에 데이터가 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
          <div className="text-center text-sm text-red-600">
            {result.error || '데이터를 불러오는데 실패했습니다'}
          </div>
        </div>
      )}

      {/* Help Text */}
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
