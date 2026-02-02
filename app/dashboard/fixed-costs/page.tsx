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
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const labelClass = 'block text-sm font-bold text-brutal-black mb-2'

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-brutal-black sm:text-3xl">
            고정비 관리
          </h1>
          <p className="mt-1 text-sm font-medium text-brutal-black/70">
            인건비, 임대료, 관리비 등 고정비용 관리
          </p>
        </div>
        {/* Desktop button */}
        <Link
          href={newFixedCostUrl}
          className="hidden border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg sm:block"
        >
          새 고정비 등록
        </Link>
      </div>

      {/* Summary - Sticky on Mobile */}
      {costs.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 md:static">
          <div className="border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-brutal-black">
                총 {costs.length}건 ({startDate} ~ {endDate})
              </p>
              <p className="text-2xl font-black text-brutal-black">
                {formatCurrency(grandTotal)}
              </p>
            </div>
            {/* Type breakdown */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(totalsByType).map(([type, amount]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 border-2 border-brutal-black bg-brutal-white px-3 py-1 text-xs font-bold text-brutal-black"
                >
                  {typeEmoji[type] || '📋'} {type}: {formatCurrency(amount)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <form
        method="GET"
        className="mt-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal"
      >
        {storeId && <input type="hidden" name="storeId" value={storeId} />}

        <div className="space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
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
              className="w-full border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      {/* Mobile: Card List */}
      <div className="mt-4 md:hidden">
        {costs.length === 0 ? (
          <div className="border-3 border-brutal-black bg-brutal-white p-8 text-center shadow-brutal">
            <p className="font-bold text-brutal-black">
              고정비 데이터가 없습니다.
            </p>
            <Link
              href={newFixedCostUrl}
              className="mt-4 inline-block font-bold text-brutal-black underline"
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
        <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
          <table className="min-w-full">
            <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-black text-brutal-black sm:pl-6">
                  날짜
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                  유형
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                  항목명
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  금액
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                  비고
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
              {costs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm font-medium text-brutal-black"
                  >
                    고정비 데이터가 없습니다. &ldquo;새 고정비 등록&rdquo;
                    버튼을 클릭하여 시작하세요.
                  </td>
                </tr>
              ) : (
                <>
                  {costs.map((cost) => (
                    <FixedCostRow key={cost.id} cost={cost} />
                  ))}
                  <tr className="border-t-3 border-brutal-black bg-brutal-pink/50 font-bold">
                    <td
                      colSpan={3}
                      className="py-4 pl-4 pr-3 text-right text-sm font-black text-brutal-black sm:pl-6"
                    >
                      총 합계 ({costs.length}건)
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-black text-brutal-black">
                      {formatCurrency(grandTotal)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: Fixed Bottom Action Bar - positioned above bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 z-20 border-t-3 border-brutal-black bg-brutal-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
        <Link
          href={newFixedCostUrl}
          className="block w-full border-2 border-brutal-black bg-brutal-yellow py-3 text-center text-base font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
        >
          + 새 고정비 등록
        </Link>
      </div>
    </div>
  )
}
