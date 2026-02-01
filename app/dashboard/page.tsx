import Link from 'next/link'
import { Suspense } from 'react'
import { getDashboardStats } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import BillingWidget from './billing-widget'

export default async function DashboardPage() {
  const result = await getDashboardStats()

  if (!result.success || !('data' in result)) {
    const errorMessage = 'error' in result ? result.error : '데이터를 불러올 수 없습니다'
    return (
      <div>
        <h1 className="text-3xl font-black text-brutal-black mb-6">대시보드</h1>
        <div className="bg-brutal-pink border-3 border-brutal-black shadow-brutal p-4">
          <p className="text-sm font-bold text-brutal-black">{errorMessage}</p>
        </div>
      </div>
    )
  }

  const { data } = result

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-brutal-black">대시보드</h1>
        <p className="mt-2 text-sm font-medium text-brutal-black">
          이번 달 요약 ({formatDate(new Date(), 'yyyy년 MM월')})
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-8">
        <div className="bg-brutal-yellow border-3 border-brutal-black shadow-brutal p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-bold text-brutal-black truncate">
                실제 원가 (이번달)
              </dt>
              <dd className="mt-1 text-2xl lg:text-3xl font-black text-brutal-black">
                {formatCurrency(data.monthlyPurchases)}
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                {data.purchaseCount}건
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-brutal-green border-3 border-brutal-black shadow-brutal p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-bold text-brutal-black truncate">
                총 판매액 (이번달)
              </dt>
              <dd className="mt-1 text-2xl lg:text-3xl font-black text-brutal-black">
                {formatCurrency(data.monthlySales)}
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                {data.salesCount}건
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-brutal-blue border-3 border-brutal-black shadow-brutal p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-bold text-brutal-black truncate">
                이번달 순마진율
              </dt>
              <dd className="mt-1 text-2xl lg:text-3xl font-black text-brutal-black">
                {data.marginPercent.toFixed(1)}%
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                순이익: {formatCurrency(data.monthlySales - data.monthlyPurchases - data.monthlyFixedCosts)}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-brutal-purple border-3 border-brutal-black shadow-brutal p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-bold text-brutal-black truncate">
                고정비 (이번달)
              </dt>
              <dd className="mt-1 text-2xl lg:text-3xl font-black text-brutal-black">
                {formatCurrency(data.monthlyFixedCosts)}
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                인건비, 임대료 등
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="text-sm font-bold text-brutal-black truncate">
                매입 검증 상태
              </dt>
              <dd className="mt-1 text-2xl lg:text-3xl font-black text-brutal-black">
                {data.validPurchases}
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                유효: {data.validPurchases} / 무효: {data.invalidPurchases}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Widget */}
      <div className="mb-8 max-w-sm">
        <Suspense fallback={<div className="h-24 bg-brutal-white border-3 border-brutal-black animate-pulse" />}>
          <BillingWidget />
        </Suspense>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-black text-brutal-black mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Link
            href="/dashboard/purchases/new"
            className="bg-brutal-blue border-3 border-brutal-black shadow-brutal p-4 transition-all hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
          >
            <h3 className="font-bold text-brutal-black">매입 등록</h3>
            <p className="text-sm font-medium text-brutal-black mt-1">새 매입 기록 추가</p>
          </Link>

          <Link
            href="/dashboard/sales/daily"
            className="bg-brutal-green border-3 border-brutal-black shadow-brutal p-4 transition-all hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
          >
            <h3 className="font-bold text-brutal-black">일일 판매 입력</h3>
            <p className="text-sm font-medium text-brutal-black mt-1">오늘 판매 기록</p>
          </Link>

          <Link
            href="/dashboard/fixed-costs/new"
            className="bg-brutal-yellow border-3 border-brutal-black shadow-brutal p-4 transition-all hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
          >
            <h3 className="font-bold text-brutal-black">고정비 등록</h3>
            <p className="text-sm font-medium text-brutal-black mt-1">인건비, 임대료 등</p>
          </Link>

          <Link
            href="/dashboard/analysis"
            className="bg-brutal-purple border-3 border-brutal-black shadow-brutal p-4 transition-all hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
          >
            <h3 className="font-bold text-brutal-black">기간 분석</h3>
            <p className="text-sm font-medium text-brutal-black mt-1">수익성 분석</p>
          </Link>

          <Link
            href="/dashboard/master-data/cost-rules"
            className="bg-brutal-pink border-3 border-brutal-black shadow-brutal p-4 transition-all hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
          >
            <h3 className="font-bold text-brutal-black">원가 배분 규칙</h3>
            <p className="text-sm font-medium text-brutal-black mt-1">
              {data.costRules > 0 ? `${data.costRules}개 규칙` : '규칙 설정 필요'}
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-black text-brutal-black mb-4">최근 매입</h3>
            {data.recentPurchases.length > 0 ? (
              <div className="space-y-3">
                {data.recentPurchases.map((purchase, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b-2 border-brutal-black/20 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-brutal-black truncate">
                        {purchase.menuName} - {purchase.ingredientName}
                      </p>
                      <p className="text-xs font-medium text-brutal-black/70">
                        {formatDate(new Date(purchase.date), 'yyyy-MM-dd')}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <span className="text-sm font-black text-brutal-black">
                        {formatCurrency(purchase.amount)}
                      </span>
                      <span
                        className={`inline-flex border-2 border-brutal-black px-2 py-0.5 text-xs font-bold ${
                          purchase.isValid
                            ? 'bg-brutal-green text-brutal-black'
                            : 'bg-brutal-pink text-brutal-black'
                        }`}
                      >
                        {purchase.isValid ? '유효' : '무효'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-brutal-black/70">최근 매입 기록이 없습니다</p>
            )}
            <div className="mt-4">
              <Link
                href="/dashboard/purchases"
                className="text-sm text-brutal-black font-bold underline underline-offset-4 hover:bg-brutal-yellow px-1 transition-colors"
              >
                모든 매입 보기 →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-black text-brutal-black mb-4">최근 판매</h3>
            {data.recentSales.length > 0 ? (
              <div className="space-y-3">
                {data.recentSales.map((sale, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b-2 border-brutal-black/20 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-brutal-black truncate">
                        {sale.skuName}
                      </p>
                      <p className="text-xs font-medium text-brutal-black/70">
                        {formatDate(new Date(sale.date), 'yyyy-MM-dd')} · {sale.quantity}개
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className="text-sm font-black text-brutal-black">
                        {formatCurrency(sale.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-brutal-black/70">최근 판매 기록이 없습니다</p>
            )}
            <div className="mt-4">
              <Link
                href="/dashboard/sales"
                className="text-sm text-brutal-black font-bold underline underline-offset-4 hover:bg-brutal-yellow px-1 transition-colors"
              >
                모든 판매 보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.invalidPurchases > 0 && (
        <div className="mt-6 bg-brutal-yellow border-3 border-brutal-black shadow-brutal p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-brutal-black"
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
              <h3 className="text-sm font-black text-brutal-black">
                {data.invalidPurchases}건의 무효 매입이 있습니다
              </h3>
              <div className="mt-2 text-sm font-medium text-brutal-black">
                <p>
                  무효 매입은 원가 계산에서 제외됩니다.{' '}
                  <Link href="/dashboard/purchases" className="font-bold underline underline-offset-2 hover:bg-brutal-white px-0.5">
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
        <div className="mt-6 bg-brutal-pink border-3 border-brutal-black shadow-brutal p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-brutal-black"
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
              <h3 className="text-sm font-black text-brutal-black">
                원가 배분 규칙이 설정되지 않았습니다
              </h3>
              <div className="mt-2 text-sm font-medium text-brutal-black">
                <p>
                  정확한 원가 계산을 위해{' '}
                  <Link
                    href="/dashboard/master-data/cost-rules"
                    className="font-bold underline underline-offset-2 hover:bg-brutal-white px-0.5"
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
