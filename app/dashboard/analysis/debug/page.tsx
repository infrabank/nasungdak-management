import { debugCostCalculation } from '../debug-actions'
import { formatDate } from '@/lib/utils/format'

export default async function DebugPage() {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startDate = formatDate(firstDayOfMonth, 'yyyy-MM-dd')
  const endDate = formatDate(today, 'yyyy-MM-dd')

  const debug = await debugCostCalculation(startDate, endDate)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">원가 계산 디버그</h1>
        <p className="text-sm text-gray-600">조회 기간: {startDate} ~ {endDate}</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">1. 원가 배분 규칙</h2>
        <p className="text-sm text-gray-600 mb-2">총 {debug.rules.length}개</p>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
          {JSON.stringify(debug.rules, null, 2)}
        </pre>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">2. 매입 기록 (기간 내)</h2>
        <p className="text-sm text-gray-600 mb-2">총 {debug.purchases.length}개</p>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
          {JSON.stringify(debug.purchases, null, 2)}
        </pre>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">3. SKU 목록</h2>
        <p className="text-sm text-gray-600 mb-2">총 {debug.skus.length}개</p>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
          {JSON.stringify(debug.skus, null, 2)}
        </pre>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">4. 원가 배분 계산</h2>
        <p className="text-sm text-gray-600 mb-2">총 {debug.costAllocation.length}개</p>
        {debug.costAllocation.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ 원가 배분 결과가 없습니다!</strong>
            </p>
            <ul className="mt-2 text-xs text-yellow-700 list-disc list-inside space-y-1">
              <li>원가 배분 규칙이 설정되어 있는지 확인하세요</li>
              <li>규칙의 유효 기간이 조회 기간과 겹치는지 확인하세요</li>
              <li>매입 기록의 is_valid가 true인지 확인하세요</li>
              <li>메뉴-재료 매핑이 있는지 확인하세요</li>
            </ul>
          </div>
        ) : (
          <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(debug.costAllocation, null, 2)}
          </pre>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">5. 판매 기록 (기간 내)</h2>
        <p className="text-sm text-gray-600 mb-2">총 {debug.sales.length}개</p>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
          {JSON.stringify(debug.sales, null, 2)}
        </pre>
      </div>
    </div>
  )
}
