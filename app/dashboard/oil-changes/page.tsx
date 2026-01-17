import Link from 'next/link'
import { getOilChanges, getOilChangeStats } from './actions'
import OilChangeRow from './oil-change-row'
import OilChangeCard from './oil-change-card'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

interface SearchParams {
  startDate?: string
  endDate?: string
  fryerType?: string
  storeId?: string
}

export default async function OilChangesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // Default to last 30 days
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const startDate = params.startDate || formatDate(thirtyDaysAgo, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const fryerType = params.fryerType || ''
  const storeId = params.storeId || ''

  const [oilChanges, stats] = await Promise.all([
    getOilChanges({ startDate, endDate, fryerType, storeId }),
    getOilChangeStats(storeId),
  ])

  const newOilChangeUrl = storeId
    ? `/dashboard/oil-changes/new?storeId=${storeId}`
    : '/dashboard/oil-changes/new'

  // Mobile-friendly input classes
  const inputClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 appearance-none bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            기름 교체 이력
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            튀김기 기름 교체 기록 관리
          </p>
        </div>
        {/* Desktop button */}
        <Link
          href={newOilChangeUrl}
          className="hidden sm:block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          새 교체 이력 등록
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            최근 30일
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {stats.recentChanges.count}회
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            🔵 초벌 마지막
          </p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {stats.lastChangeByFryer['초벌']
              ? formatDate(
                  new Date(stats.lastChangeByFryer['초벌'].changeDate),
                  'MM/dd'
                )
              : '-'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="mt-4 bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4"
      >
        {storeId && <input type="hidden" name="storeId" value={storeId} />}

        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
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

          {/* Fryer Type Filter */}
          <div>
            <label htmlFor="fryerType" className={labelClass}>
              🛢️ 튀김기 종류
            </label>
            <div className="relative">
              <select
                id="fryerType"
                name="fryerType"
                defaultValue={fryerType}
                className={selectClass}
              >
                <option value="">전체</option>
                <option value="초벌">🔵 초벌</option>
                <option value="재벌">🟢 재벌</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Filter Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-3 text-base font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700"
            >
              필터 적용
            </button>
          </div>
        </div>
      </form>

      {/* Mobile: Card List */}
      <div className="mt-4 md:hidden">
        {oilChanges.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-8 text-center">
            <p className="text-gray-500">등록된 기름 교체 이력이 없습니다</p>
            <Link
              href={newOilChangeUrl}
              className="inline-block mt-4 text-blue-600 font-medium"
            >
              첫 교체 이력 등록하기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {oilChanges.map((oilChange) => (
              <OilChangeCard key={oilChange.id} oilChange={oilChange} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="mt-6 hidden md:block">
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              교체 이력 ({oilChanges.length}건)
            </h2>
          </div>
          {oilChanges.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>등록된 기름 교체 이력이 없습니다</p>
              <Link
                href={newOilChangeUrl}
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                첫 교체 이력 등록하기 →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      교체일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      튀김기
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용 기간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      비고
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {oilChanges.map((oilChange) => (
                    <OilChangeRow key={oilChange.id} oilChange={oilChange} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Fixed Bottom Action Bar - positioned above bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 lg:hidden">
        <Link
          href={newOilChangeUrl}
          className="block w-full rounded-xl bg-blue-600 py-3 text-center text-base font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          + 새 교체 이력 등록
        </Link>
      </div>
    </div>
  )
}
