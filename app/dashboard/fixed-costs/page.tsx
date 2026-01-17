import Link from 'next/link'
import { getFixedCosts } from './actions'
import FixedCostRow from './fixed-cost-row'
import FixedCostCard from './fixed-cost-card'
import { formatDate, formatCurrency } from '@/lib/utils/format'

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

  const startDate =
    params.startDate || formatDate(firstDayOfMonth, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const storeId = params.storeId || ''

  const costs = await getFixedCosts(startDate, endDate, storeId)

  // Calculate totals by type
  const totalsByType = costs.reduce(
    (acc, cost) => {
      const type = cost.costType
      const amount = Number(cost.amount)
      acc[type] = (acc[type] || 0) + amount
      return acc
    },
    {} as Record<string, number>
  )

  const grandTotal = Object.values(totalsByType).reduce(
    (sum, val) => sum + val,
    0
  )

  const newFixedCostUrl = storeId
    ? `/dashboard/fixed-costs/new?storeId=${storeId}`
    : '/dashboard/fixed-costs/new'

  // Mobile-friendly input classes
  const inputClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'

  // Type emoji map
  const typeEmoji: Record<string, string> = {
    인건비: '👷',
    임대료: '🏠',
    관리비: '🔧',
    기타: '📋',
  }

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            고정비 관리
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            인건비, 임대료, 관리비 등 고정비용 관리
          </p>
        </div>
        {/* Desktop button */}
        <Link
          href={newFixedCostUrl}
          className="hidden sm:block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          새 고정비 등록
        </Link>
      </div>

      {/* Summary - Sticky on Mobile */}
      {costs.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 md:static">
          <div className="bg-red-50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-red-600">
                총 {costs.length}건 ({startDate} ~ {endDate})
              </p>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(grandTotal)}
              </p>
            </div>
            {/* Type breakdown */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(totalsByType).map(([type, amount]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white rounded-full text-gray-700"
                >
                  {typeEmoji[type] || '📋'} {type}:{' '}
                  {formatCurrency(amount)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <form
        method="GET"
        className="mt-4 bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4"
      >
        {storeId && <input type="hidden" name="storeId" value={storeId} />}

        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className={labelClass}>
              📅 시작일
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              defaultValue={startDate}
              className={inputClass}
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className={labelClass}>
              📅 종료일
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              defaultValue={endDate}
              className={inputClass}
            />
          </div>

          {/* Filter Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      {/* Mobile: Card List */}
      <div className="mt-4 md:hidden">
        {costs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-8 text-center">
            <p className="text-gray-500">고정비 데이터가 없습니다.</p>
            <Link
              href={newFixedCostUrl}
              className="inline-block mt-4 text-blue-600 font-medium"
            >
              새 고정비 등록하기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {costs.map((cost) => (
              <FixedCostCard key={cost.id} cost={cost} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="mt-6 hidden md:block">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
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
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-gray-500"
                  >
                    고정비 데이터가 없습니다. &ldquo;새 고정비 등록&rdquo;
                    버튼을 클릭하여 시작하세요.
                  </td>
                </tr>
              ) : (
                costs.map((cost) => <FixedCostRow key={cost.id} cost={cost} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: Fixed Bottom Action Bar - positioned above bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 lg:hidden">
        <Link
          href={newFixedCostUrl}
          className="block w-full rounded-xl bg-blue-600 py-3 text-center text-base font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          + 새 고정비 등록
        </Link>
      </div>
    </div>
  )
}
