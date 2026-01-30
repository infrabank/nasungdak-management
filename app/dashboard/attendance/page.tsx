import Link from 'next/link'
import { getAttendance, getActiveEmployees } from './actions'
import AttendanceRow from './attendance-row'
import AttendanceCard from './attendance-card'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface SearchParams {
  startDate?: string
  endDate?: string
  storeId?: string
  employeeId?: string
}

export default async function AttendancePage({
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
  const employeeId = params.employeeId || ''

  const hasStoreId = Boolean(storeId)

  const { records, totalSum, totalHours } = hasStoreId
    ? await getAttendance({ storeId, startDate, endDate, employeeId })
    : { records: [], totalSum: 0, totalHours: 0 }

  const activeEmployees = hasStoreId ? await getActiveEmployees(storeId) : []

  const newAttendanceUrl = storeId
    ? `/dashboard/attendance/new?storeId=${storeId}`
    : '/dashboard/attendance/new'

  // Mobile-friendly input classes
  const inputClass =
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const selectClass =
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const labelClass = 'block text-sm font-bold text-brutal-black mb-2'

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-brutal-black">
            출퇴근 기록
          </h1>
          <p className="mt-1 text-sm font-medium text-brutal-black/70">
            직원 근무 시간 및 급여 관리
          </p>
        </div>
        {/* Desktop button */}
        {hasStoreId && (
          <Link
            href={newAttendanceUrl}
            className="hidden sm:block px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            새 출퇴근 기록
          </Link>
        )}
      </div>

      {/* No Store Selected Message */}
      {!hasStoreId && (
        <div className="mt-6 bg-brutal-yellow border-3 border-brutal-black shadow-brutal p-6 text-center">
          <p className="text-lg font-black text-brutal-black mb-2">
            매장을 선택해주세요
          </p>
          <p className="text-sm font-medium text-brutal-black/70">
            출퇴근 기록은 매장별로 관리됩니다. 상단에서 매장을 선택하세요.
          </p>
        </div>
      )}

      {/* Summary - Sticky on Mobile */}
      {hasStoreId && records.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 md:static">
          <div className="bg-brutal-pink border-3 border-brutal-black shadow-brutal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-brutal-black">
                  총 {records.length}건 ({startDate} ~ {endDate})
                </p>
                <p className="text-sm font-medium text-brutal-black/70 mt-1">
                  총 근무시간: {totalHours.toFixed(1)}시간
                </p>
              </div>
              <p className="text-2xl font-black text-brutal-black">
                {formatCurrency(totalSum)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {hasStoreId && (
        <form
          method="GET"
          className="mt-4 bg-brutal-white border-3 border-brutal-black shadow-brutal p-4"
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

            {/* Employee Filter */}
            <div>
              <label htmlFor="employeeId" className={labelClass}>
                👤 직원
              </label>
              <select
                id="employeeId"
                name="employeeId"
                defaultValue={employeeId}
                className={selectClass}
              >
                <option value="">전체</option>
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-3 text-base font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                조회
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Mobile: Card List */}
      {hasStoreId && (
        <div className="mt-4 md:hidden">
          {records.length === 0 ? (
            <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-8 text-center">
              <p className="font-bold text-brutal-black">출퇴근 기록이 없습니다.</p>
              <Link
                href={newAttendanceUrl}
                className="inline-block mt-4 font-bold text-brutal-black underline"
              >
                새 출퇴근 기록 등록하기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <AttendanceCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop: Table */}
      {hasStoreId && (
        <div className="mt-6 hidden md:block">
          <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
            <table className="min-w-full">
              <thead className="bg-brutal-yellow border-b-3 border-brutal-black">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-black text-brutal-black sm:pl-6">
                    날짜
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                    직원
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    근무시간
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    시급
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    지급액
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
                {records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-sm font-medium text-brutal-black"
                    >
                      출퇴근 기록이 없습니다. &ldquo;새 출퇴근 기록&rdquo; 버튼을 클릭하여 시작하세요.
                    </td>
                  </tr>
                ) : (
                  <>
                    {records.map((record) => (
                      <AttendanceRow key={record.id} record={record} />
                    ))}
                    <tr className="bg-brutal-pink/50 font-bold border-t-3 border-brutal-black">
                      <td
                        colSpan={2}
                        className="py-4 pl-4 pr-3 text-sm text-right font-black text-brutal-black sm:pl-6"
                      >
                        총 합계 ({records.length}건)
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right font-black">
                        {totalHours.toFixed(1)}시간
                      </td>
                      <td className="px-3 py-4"></td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right font-black">
                        {formatCurrency(totalSum)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile: Fixed Bottom Action Bar */}
      {hasStoreId && (
        <div className="fixed bottom-14 left-0 right-0 bg-brutal-white border-t-3 border-brutal-black p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 lg:hidden">
          <Link
            href={newAttendanceUrl}
            className="block w-full py-3 text-center text-base font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            + 새 출퇴근 기록
          </Link>
        </div>
      )}
    </div>
  )
}
