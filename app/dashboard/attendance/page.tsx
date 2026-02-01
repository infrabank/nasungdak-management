import Link from 'next/link'
import { getAttendance, getActiveEmployees } from './actions'
import { getActiveStores } from '../stores/actions'
import AttendanceRow from './attendance-row'
import AttendanceCard from './attendance-card'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface SearchParams {
  startDate?: string
  endDate?: string
  employeeId?: string
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // 사용자의 권한 있는 매장 목록 조회 (이미 auth-context로 필터링됨)
  const stores = await getActiveStores()

  // 매장이 1개면 자동 선택, 여러 개면 첫 번째 매장 선택
  const storeId = stores.length > 0 ? stores[0].id : ''
  const hasStoreId = stores.length > 0

  // Default to current month
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const startDate =
    params.startDate || formatDate(firstDayOfMonth, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const employeeId = params.employeeId || ''

  const attendanceData = hasStoreId
    ? await getAttendance({ storeId, startDate, endDate, employeeId })
    : { records: [], totalSum: 0, totalHours: 0 }
  const { records, totalSum } = attendanceData
  const totalHours = attendanceData.totalHours ?? 0

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-brutal-black sm:text-3xl">
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
            className="hidden border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg sm:block"
          >
            새 출퇴근 기록
          </Link>
        )}
      </div>

      {/* No Store Access Message */}
      {!hasStoreId && (
        <div className="mt-6 border-3 border-brutal-black bg-brutal-pink p-6 text-center shadow-brutal">
          <p className="mb-2 text-lg font-black text-brutal-black">
            접근 권한이 없습니다
          </p>
          <p className="text-sm font-medium text-brutal-black/70">
            할당된 매장이 없습니다. 관리자에게 문의하세요.
          </p>
        </div>
      )}

      {/* Summary - Sticky on Mobile */}
      {hasStoreId && records.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 md:static">
          <div className="border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-brutal-black">
                  총 {records.length}건 ({startDate} ~ {endDate})
                </p>
                <p className="mt-1 text-sm font-medium text-brutal-black/70">
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
          className="mt-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal"
        >
          <div className="space-y-4 md:grid md:grid-cols-4 md:gap-4 md:space-y-0">
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
                className="w-full border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
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
            <div className="border-3 border-brutal-black bg-brutal-white p-8 text-center shadow-brutal">
              <p className="font-bold text-brutal-black">
                출퇴근 기록이 없습니다.
              </p>
              <Link
                href={newAttendanceUrl}
                className="mt-4 inline-block font-bold text-brutal-black underline"
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
              <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
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
                      출퇴근 기록이 없습니다. &ldquo;새 출퇴근 기록&rdquo;
                      버튼을 클릭하여 시작하세요.
                    </td>
                  </tr>
                ) : (
                  <>
                    {records.map((record) => (
                      <AttendanceRow key={record.id} record={record} />
                    ))}
                    <tr className="border-t-3 border-brutal-black bg-brutal-pink/50 font-bold">
                      <td
                        colSpan={2}
                        className="py-4 pl-4 pr-3 text-right text-sm font-black text-brutal-black sm:pl-6"
                      >
                        총 합계 ({records.length}건)
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-black text-brutal-black">
                        {totalHours.toFixed(1)}시간
                      </td>
                      <td className="px-3 py-4"></td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-black text-brutal-black">
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
        <div className="fixed bottom-14 left-0 right-0 z-20 border-t-3 border-brutal-black bg-brutal-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
          <Link
            href={newAttendanceUrl}
            className="block w-full border-2 border-brutal-black bg-brutal-yellow py-3 text-center text-base font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            + 새 출퇴근 기록
          </Link>
        </div>
      )}
    </div>
  )
}
