import AttendanceForm from '../attendance-form'
import { getActiveEmployees } from '../actions'

interface SearchParams {
  storeId?: string
}

export default async function NewAttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  // Fetch active employees for the dropdown
  const employees = storeId ? await getActiveEmployees(storeId) : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-brutal-black">새 출퇴근 기록</h1>
        <p className="mt-2 text-sm font-medium text-brutal-black/70">
          직원의 근무 시간과 급여를 기록합니다
        </p>
      </div>

      <AttendanceForm storeId={storeId} employees={employees} />
    </div>
  )
}
