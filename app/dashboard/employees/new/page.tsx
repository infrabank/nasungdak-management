import { redirect } from 'next/navigation'
import EmployeeForm from '../employee-form'
import { getActiveStores } from '../../stores/actions'

export default async function NewEmployeePage() {
  // 사용자의 권한 있는 매장 목록 조회
  const stores = await getActiveStores()

  // 매장이 없으면 직원 목록 페이지로 리다이렉트 (거기서 권한 없음 메시지 표시)
  if (stores.length === 0) {
    redirect('/dashboard/employees')
  }

  // 첫 번째 매장 자동 선택
  const storeId = stores[0].id

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-brutal-black sm:text-3xl">
          새 직원 등록
        </h1>
        <p className="mt-2 text-sm font-medium text-brutal-black/70">
          직원 정보를 등록합니다
        </p>
      </div>

      <EmployeeForm storeId={storeId} />
    </div>
  )
}
