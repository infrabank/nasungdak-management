import EmployeeForm from '../employee-form'

interface SearchParams {
  storeId?: string
}

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-brutal-black">새 직원 등록</h1>
        <p className="mt-2 text-sm font-medium text-brutal-black/70">
          직원 정보를 등록합니다
        </p>
      </div>

      <EmployeeForm storeId={storeId} />
    </div>
  )
}
