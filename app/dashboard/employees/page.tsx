import Link from 'next/link'
import { getEmployees } from './actions'
import { getActiveStores } from '../stores/actions'
import EmployeeRow from './employee-row'
import EmployeeCard from './employee-card'

export default async function EmployeesPage() {
  // 사용자의 권한 있는 매장 목록 조회 (이미 auth-context로 필터링됨)
  const stores = await getActiveStores()

  // 매장이 1개면 자동 선택, 여러 개면 첫 번째 매장 선택
  const storeId = stores.length > 0 ? stores[0].id : ''
  const hasStoreId = stores.length > 0
  const employees = hasStoreId ? await getEmployees(storeId) : []

  const activeCount = employees.filter((e) => e.isActive).length
  const inactiveCount = employees.filter((e) => !e.isActive).length

  const newEmployeeUrl = storeId
    ? `/dashboard/employees/new?storeId=${storeId}`
    : '/dashboard/employees/new'

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-brutal-black sm:text-3xl">
            직원 관리
          </h1>
          <p className="mt-1 text-sm font-medium text-brutal-black/70">
            직원 정보 및 시급 관리
          </p>
        </div>
        {/* Desktop button */}
        {hasStoreId && (
          <Link
            href={newEmployeeUrl}
            className="hidden border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg sm:block"
          >
            새 직원 등록
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

      {/* Summary */}
      {hasStoreId && employees.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 md:static">
          <div className="border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-brutal-black">
                총 {employees.length}명
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 border-2 border-brutal-black bg-brutal-white px-3 py-1 text-xs font-bold text-brutal-black">
                재직: {activeCount}명
              </span>
              {inactiveCount > 0 && (
                <span className="inline-flex items-center gap-1 border-2 border-brutal-black bg-brutal-pink px-3 py-1 text-xs font-bold text-brutal-black">
                  퇴직: {inactiveCount}명
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Card List */}
      {hasStoreId && (
        <div className="mt-4 md:hidden">
          {employees.length === 0 ? (
            <div className="border-3 border-brutal-black bg-brutal-white p-8 text-center shadow-brutal">
              <p className="font-bold text-brutal-black">
                등록된 직원이 없습니다.
              </p>
              <Link
                href={newEmployeeUrl}
                className="mt-4 inline-block font-bold text-brutal-black underline"
              >
                새 직원 등록하기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
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
                    직원명
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    시급
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                    연락처
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                    입사일
                  </th>
                  <th className="px-3 py-3.5 text-center text-sm font-black text-brutal-black">
                    상태
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm font-medium text-brutal-black"
                    >
                      등록된 직원이 없습니다. &ldquo;새 직원 등록&rdquo; 버튼을
                      클릭하여 시작하세요.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <EmployeeRow key={employee.id} employee={employee} />
                  ))
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
            href={newEmployeeUrl}
            className="block w-full border-2 border-brutal-black bg-brutal-yellow py-3 text-center text-base font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            + 새 직원 등록
          </Link>
        </div>
      )}
    </div>
  )
}
