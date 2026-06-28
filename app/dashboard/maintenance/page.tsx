import Link from 'next/link'
import { getMaintenanceLogs, getMaintenanceStats } from './actions'
import MaintenanceRow from './maintenance-row'
import MaintenanceCard from './maintenance-card'
import { MAINTENANCE_TASK_TYPES } from '@/lib/utils/validation'
import { TASK_META } from './task-meta'
import { formatDate } from '@/lib/utils/format'

interface SearchParams {
  startDate?: string
  endDate?: string
  taskType?: string
  storeId?: string
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // Default to last 90 days (정비는 주기가 길 수 있어 기름교체보다 넓게)
  const today = new Date()
  const ninetyDaysAgo = new Date(today)
  ninetyDaysAgo.setDate(today.getDate() - 90)

  const startDate = params.startDate || formatDate(ninetyDaysAgo, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const taskType = params.taskType || ''
  const storeId = params.storeId || ''

  const [logs, stats] = await Promise.all([
    getMaintenanceLogs({ startDate, endDate, taskType, storeId }),
    getMaintenanceStats(storeId),
  ])

  const newUrl = storeId
    ? `/dashboard/maintenance/new?storeId=${storeId}`
    : '/dashboard/maintenance/new'

  const inputClass =
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const selectClass =
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all appearance-none'
  const labelClass = 'block text-sm font-bold text-brutal-black mb-2'

  // 항목별 경과일 계산 helper
  const daysSince = (dateStr?: string) => {
    if (!dateStr) return null
    return Math.floor(
      (today.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-brutal-black sm:text-3xl">
            정비·청소 기록
          </h1>
          <p className="mt-1 text-sm font-medium text-brutal-black/70">
            아이스크림·튀김기 청소/정비를 언제 했는지 기록·관리
          </p>
        </div>
        <Link
          href={newUrl}
          className="hidden border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg sm:block"
        >
          새 기록 등록
        </Link>
      </div>

      {/* 항목별 마지막 수행일 카드 */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {MAINTENANCE_TASK_TYPES.map((t) => {
          const last = stats.lastByType[t]
          const d = daysSince(last)
          const meta = TASK_META[t]
          return (
            <div
              key={t}
              className={`border-3 border-brutal-black p-4 shadow-brutal ${meta?.color ?? 'bg-brutal-white'}`}
            >
              <p className="text-xs font-bold text-brutal-black/80">
                {meta?.emoji} {t}
              </p>
              <p className="mt-1 text-lg font-black text-brutal-black">
                {last
                  ? formatDate(new Date(last), 'yy-MM-dd(EEE)')
                  : '기록 없음'}
              </p>
              <p className="text-xs font-bold text-brutal-black/70">
                {d === null ? '-' : d <= 0 ? '오늘' : `${d}일 전`}
              </p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="mt-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal"
      >
        {storeId && <input type="hidden" name="storeId" value={storeId} />}

        <div className="space-y-4 md:grid md:grid-cols-4 md:gap-4 md:space-y-0">
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

          <div>
            <label htmlFor="taskType" className={labelClass}>
              🧽 항목
            </label>
            <div className="relative">
              <select
                id="taskType"
                name="taskType"
                defaultValue={taskType}
                className={selectClass}
              >
                <option value="">전체</option>
                {MAINTENANCE_TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TASK_META[t]?.emoji} {t}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg
                  className="h-5 w-5 text-brutal-black"
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

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
            >
              필터 적용
            </button>
          </div>
        </div>
      </form>

      {/* Mobile: Card List */}
      <div className="mt-4 md:hidden">
        {logs.length === 0 ? (
          <div className="border-3 border-brutal-black bg-brutal-white p-8 text-center shadow-brutal">
            <p className="font-bold text-brutal-black">
              등록된 정비·청소 기록이 없습니다
            </p>
            <Link
              href={newUrl}
              className="mt-4 inline-block font-bold text-brutal-black underline"
            >
              첫 기록 등록하기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <MaintenanceCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="mt-6 hidden md:block">
        <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
          <div className="border-b-3 border-brutal-black px-6 py-4">
            <h2 className="text-lg font-black text-brutal-black">
              기록 ({logs.length}건)
            </h2>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-bold text-brutal-black">
                등록된 정비·청소 기록이 없습니다
              </p>
              <Link
                href={newUrl}
                className="mt-4 inline-block font-bold text-brutal-black underline"
              >
                첫 기록 등록하기 →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-black uppercase tracking-wider text-brutal-black">
                      수행일
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-black uppercase tracking-wider text-brutal-black">
                      항목
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-black uppercase tracking-wider text-brutal-black">
                      경과
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-black uppercase tracking-wider text-brutal-black">
                      비고
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-black uppercase tracking-wider text-brutal-black">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
                  {logs.map((log) => (
                    <MaintenanceRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Fixed Bottom Action Bar */}
      <div className="fixed bottom-14 left-0 right-0 z-20 border-t-3 border-brutal-black bg-brutal-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
        <Link
          href={newUrl}
          className="block w-full border-2 border-brutal-black bg-brutal-yellow py-3 text-center text-base font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
        >
          + 새 기록 등록
        </Link>
      </div>
    </div>
  )
}
