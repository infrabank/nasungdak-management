import Link from 'next/link'
import { getFixedCosts } from './actions'
import FixedCostRow from './fixed-cost-row'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

interface SearchParams {
  startDate?: string
  endDate?: string
  storeId?: string
}

export default async function FixedCostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // Default to current month
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const startDate = params.startDate || formatDate(firstDayOfMonth, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const storeId = params.storeId || ''

  const costs = await getFixedCosts(startDate, endDate, storeId)

  // Calculate totals by type
  const totalsByType = costs.reduce((acc, cost) => {
    const type = cost.costType
    const amount = Number(cost.amount)
    acc[type] = (acc[type] || 0) + amount
    return acc
  }, {} as Record<string, number>)

  const grandTotal = Object.values(totalsByType).reduce((sum, val) => sum + val, 0)

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">고정비 관리</h1>
          <p className="mt-2 text-sm text-gray-800">
            인건비, 임대료, 관리비 등 고정비용 관리
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href={storeId ? `/dashboard/fixed-costs/new?storeId=${storeId}` : '/dashboard/fixed-costs/new'}
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            새 고정비 등록
          </Link>
        </div>
      </div>

      {/* Date Filter */}
      <form method="GET" className="mt-6 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-4">
        {/* Preserve storeId from URL */}
        {storeId && <input type="hidden" name="storeId" value={storeId} />}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-800 mb-1">
              시작일
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              defaultValue={startDate}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-800 mb-1">
              종료일
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              defaultValue={endDate}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              조회
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-800">
          <span>{costs.length}건의 고정비 기록 ({startDate} ~ {endDate})</span>
          <span className="font-semibold">총계: ₩{grandTotal.toLocaleString('ko-KR')}</span>
          {Object.entries(totalsByType).map(([type, amount]) => (
            <span key={type}>
              {type}: ₩{amount.toLocaleString('ko-KR')}
            </span>
          ))}
        </div>
      </form>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      날짜
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      유형
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      항목명
                    </th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      금액
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      비고
                    </th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {costs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-gray-800">
                        고정비 데이터가 없습니다. &ldquo;새 고정비 등록&rdquo; 버튼을 클릭하여 시작하세요.
                      </td>
                    </tr>
                  ) : (
                    costs.map((cost) => (
                      <FixedCostRow key={cost.id} cost={cost} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
