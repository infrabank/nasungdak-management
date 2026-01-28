import Link from 'next/link'
import { getEmployees } from './actions'
import EmployeeRow from './employee-row'
import EmployeeCard from './employee-card'
import { formatCurrency } from '@/lib/utils/format'

interface SearchParams {
  storeId?: string
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  // If no storeId, show message
  const hasStoreId = Boolean(storeId)
  const employees = hasStoreId ? await getEmployees(storeId) : []

  const activeCount = employees.filter((e) => e.isActive).length
  const inactiveCount = employees.filter((e) => !e.isActive).length

  const newEmployeeUrl = storeId
    ? `/dashboard/employees/new?storeId=${storeId}`
    : '/dashboard/employees/new'

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-brutal-black">
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
            className="hidden sm:block px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            새 직원 등록
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
            직원은 매장별로 관리됩니다. 상단에서 매장을 선택하세요.
          </p>
        </div>
      )}

      {/* Summary */}
      {hasStoreId && employees.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 md:static">
          <div className="bg-brutal-blue border-3 border-brutal-black shadow-brutal p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-brutal-black">
                총 {employees.length}명
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-brutal-white border-2 border-brutal-black text-brutal-black">
                재직: {activeCount}명
              </span>
              {inactiveCount > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-brutal-pink border-2 border-brutal-black text-brutal-black">
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
            <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-8 text-center">
              <p className="font-bold text-brutal-black">등록된 직원이 없습니다.</p>
              <Link
                href={newEmployeeUrl}
                className="inline-block mt-4 font-bold text-brutal-black underline"
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
              <thead className="bg-brutal-yellow border-b-3 border-brutal-black">
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
                      등록된 직원이 없습니다. &ldquo;새 직원 등록&rdquo; 버튼을 클릭하여 시작하세요.
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
        <div className="fixed bottom-14 left-0 right-0 bg-brutal-white border-t-3 border-brutal-black p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 lg:hidden">
          <Link
            href={newEmployeeUrl}
            className="block w-full py-3 text-center text-base font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            + 새 직원 등록
          </Link>
        </div>
      )}
    </div>
  )
}
