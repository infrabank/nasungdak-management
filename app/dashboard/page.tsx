import Link from 'next/link'
import { getDashboardStats } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const result = await getDashboardStats()

  if (!result.success) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">대시보드</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{result.error || '데이터를 불러올 수 없습니다'}</p>
        </div>
      </div>
    )
  }

  const { data } = result

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-2 text-sm text-gray-800">
          이번 달 요약 ({formatDate(new Date(), 'yyyy년 MM월')})
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-medium text-gray-700 truncate">
                실제 원가 (이번달)
              </dt>
              <dd className="mt-1 text-3xl font-bold text-gray-900">
                {formatCurrency(data.monthlyPurchases)}
              </dd>
              <dd className="mt-1 text-xs text-gray-700">
                {data.purchaseCount}건
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-medium text-gray-700 truncate">
                총 판매액 (이번달)
              </dt>
              <dd className="mt-1 text-3xl font-bold text-gray-900">
                {formatCurrency(data.monthlySales)}
              </dd>
              <dd className="mt-1 text-xs text-gray-700">
                {data.salesCount}건
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-medium text-gray-700 truncate">
                이번달 마진율 (변동비 기준)
              </dt>
              <dd className="mt-1 text-3xl font-bold text-gray-900">
                {data.marginPercent.toFixed(1)}%
              </dd>
              <dd className="mt-1 text-xs text-gray-700">
                순이익: {formatCurrency(data.monthlySales - data.monthlyPurchases)} (고정비 제외)
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-medium text-gray-700 truncate">
                매입 검증 상태
              </dt>
              <dd className="mt-1 text-3xl font-bold text-gray-900">
                {data.validPurchases}
              </dd>
              <dd className="mt-1 text-xs text-gray-700">
                유효: {data.validPurchases} / 무효: {data.invalidPurchases}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Link
            href="/dashboard/purchases/new"
            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-4 transition-colors"
          >
            <h3 className="font-semibold text-blue-900">매입 등록</h3>
            <p className="text-sm text-blue-700 mt-1">새 매입 기록 추가</p>
          </Link>

          <Link
            href="/dashboard/sales/daily"
            className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl p-4 transition-colors"
          >
            <h3 className="font-semibold text-green-900">일일 판매 입력</h3>
            <p className="text-sm text-green-700 mt-1">오늘 판매 기록</p>
          </Link>

          <Link
            href="/dashboard/fixed-costs/new"
            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl p-4 transition-colors"
          >
            <h3 className="font-semibold text-amber-900">고정비 등록</h3>
            <p className="text-sm text-amber-700 mt-1">인건비, 임대료 등</p>
          </Link>

          <Link
            href="/dashboard/analysis"
            className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl p-4 transition-colors"
          >
            <h3 className="font-semibold text-purple-900">기간 분석</h3>
            <p className="text-sm text-purple-700 mt-1">수익성 분석</p>
          </Link>

          <Link
            href="/dashboard/master-data/cost-rules"
            className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl p-4 transition-colors"
          >
            <h3 className="font-semibold text-orange-900">원가 배분 규칙</h3>
            <p className="text-sm text-orange-700 mt-1">
              {data.costRules > 0 ? `${data.costRules}개 규칙` : '규칙 설정 필요'}
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">최근 매입</h3>
            {data.recentPurchases.length > 0 ? (
              <div className="space-y-3">
                {data.recentPurchases.map((purchase, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {purchase.menuName} - {purchase.ingredientName}
                      </p>
                      <p className="text-xs text-gray-700">
                        {formatDate(new Date(purchase.date), 'yyyy-MM-dd')}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(purchase.amount)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          purchase.isValid
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {purchase.isValid ? '유효' : '무효'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-700">최근 매입 기록이 없습니다</p>
            )}
            <div className="mt-4">
              <Link
                href="/dashboard/purchases"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                모든 매입 보기 →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">최근 판매</h3>
            {data.recentSales.length > 0 ? (
              <div className="space-y-3">
                {data.recentSales.map((sale, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {sale.skuName}
                      </p>
                      <p className="text-xs text-gray-700">
                        {formatDate(new Date(sale.date), 'yyyy-MM-dd')} · {sale.quantity}개
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(sale.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-700">최근 판매 기록이 없습니다</p>
            )}
            <div className="mt-4">
              <Link
                href="/dashboard/sales"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                모든 판매 보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.invalidPurchases > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {data.invalidPurchases}건의 무효 매입이 있습니다
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  무효 매입은 원가 계산에서 제외됩니다.{' '}
                  <Link href="/dashboard/purchases" className="font-medium underline">
                    매입 목록에서 확인
                  </Link>
                  하여 유효로 변경하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {data.costRules === 0 && (
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-orange-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                원가 배분 규칙이 설정되지 않았습니다
              </h3>
              <div className="mt-2 text-sm text-orange-700">
                <p>
                  정확한 원가 계산을 위해{' '}
                  <Link
                    href="/dashboard/master-data/cost-rules"
                    className="font-medium underline"
                  >
                    원가 배분 규칙
                  </Link>
                  을 설정하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
