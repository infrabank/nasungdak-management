import Link from 'next/link'
import { Suspense } from 'react'
import { getDashboardStats } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import BillingWidget from './billing-widget'

export default async function DashboardPage() {
  const result = await getDashboardStats()

  if (!result.success || !('data' in result)) {
    const errorMessage =
      'error' in result ? result.error : '데이터를 불러올 수 없습니다'
    return (
      <div>
        <h1 className="mb-6 text-3xl font-black text-brutal-black">대시보드</h1>
        <div className="border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal">
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
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="truncate text-sm font-bold text-brutal-black">
                실제 원가 (이번달)
              </dt>
              <dd className="mt-1 text-2xl font-black text-brutal-black lg:text-3xl">
                {formatCurrency(data.monthlyPurchases)}
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                {data.purchaseCount}건
              </dd>
            </div>
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-green p-4 shadow-brutal">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="truncate text-sm font-bold text-brutal-black">
                총 판매액 (이번달)
              </dt>
              <dd className="mt-1 text-2xl font-black text-brutal-black lg:text-3xl">
                {formatCurrency(data.monthlySales)}
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                {data.salesCount}건
              </dd>
            </div>
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="truncate text-sm font-bold text-brutal-black">
                이번달 순마진율
              </dt>
              <dd className="mt-1 text-2xl font-black text-brutal-black lg:text-3xl">
                {data.marginPercent.toFixed(1)}%
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                순이익:{' '}
                {formatCurrency(
                  data.monthlySales -
                    data.monthlyPurchases -
                    data.monthlyFixedCosts
                )}
              </dd>
            </div>
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-purple p-4 shadow-brutal">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="truncate text-sm font-bold text-brutal-black">
                고정비 (이번달)
              </dt>
              <dd className="mt-1 text-2xl font-black text-brutal-black lg:text-3xl">
                {formatCurrency(data.monthlyFixedCosts)}
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                인건비, 임대료 등
              </dd>
            </div>
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center">
            <div className="flex-1">
              <dt className="truncate text-sm font-bold text-brutal-black">
                이번달 매입 건수
              </dt>
              <dd className="mt-1 text-2xl font-black text-brutal-black lg:text-3xl">
                {data.purchaseCount}건
              </dd>
              <dd className="mt-1 text-xs font-medium text-brutal-black">
                총 매입액 기준
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Widget */}
      <div className="mb-8 max-w-sm">
        <Suspense
          fallback={
            <div className="h-24 animate-pulse border-3 border-brutal-black bg-brutal-white" />
          }
        >
          <BillingWidget />
        </Suspense>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-black text-brutal-black">빠른 작업</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Link
            href="/dashboard/purchases/new"
            className="border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
          >
            <h3 className="font-bold text-brutal-black">매입 등록</h3>
            <p className="mt-1 text-sm font-medium text-brutal-black">
              새 매입 기록 추가
            </p>
          </Link>

          <Link
            href="/dashboard/sales/daily"
            className="border-3 border-brutal-black bg-brutal-green p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
          >
            <h3 className="font-bold text-brutal-black">일일 판매 입력</h3>
            <p className="mt-1 text-sm font-medium text-brutal-black">
              오늘 판매 기록
            </p>
          </Link>

          <Link
            href="/dashboard/fixed-costs/new"
            className="border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
          >
            <h3 className="font-bold text-brutal-black">고정비 등록</h3>
            <p className="mt-1 text-sm font-medium text-brutal-black">
              인건비, 임대료 등
            </p>
          </Link>

          <Link
            href="/dashboard/analysis"
            className="border-3 border-brutal-black bg-brutal-purple p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
          >
            <h3 className="font-bold text-brutal-black">기간 분석</h3>
            <p className="mt-1 text-sm font-medium text-brutal-black">
              수익성 분석
            </p>
          </Link>

          <Link
            href="/dashboard/master-data/sku-recipes"
            className="border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
          >
            <h3 className="font-bold text-brutal-black">SKU 레시피</h3>
            <p className="mt-1 text-sm font-medium text-brutal-black">
              원재료 구성 관리
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Purchases */}
        <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-base font-black text-brutal-black">
              최근 매입
            </h3>
            {data.recentPurchases.length > 0 ? (
              <div className="space-y-3">
                {data.recentPurchases.map((purchase, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b-2 border-brutal-black/20 py-2 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-brutal-black">
                        {purchase.ingredientName}
                      </p>
                      <p className="text-xs font-medium text-brutal-black/70">
                        {formatDate(new Date(purchase.date), 'yyyy-MM-dd')}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className="text-sm font-black text-brutal-black">
                        {formatCurrency(purchase.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-brutal-black/70">
                최근 매입 기록이 없습니다
              </p>
            )}
            <div className="mt-4">
              <Link
                href="/dashboard/purchases"
                className="px-1 text-sm font-bold text-brutal-black underline underline-offset-4 transition-colors hover:bg-brutal-yellow"
              >
                모든 매입 보기 →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-base font-black text-brutal-black">
              최근 판매
            </h3>
            {data.recentSales.length > 0 ? (
              <div className="space-y-3">
                {data.recentSales.map((sale, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b-2 border-brutal-black/20 py-2 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-brutal-black">
                        {sale.skuName}
                      </p>
                      <p className="text-xs font-medium text-brutal-black/70">
                        {formatDate(new Date(sale.date), 'yyyy-MM-dd')} ·{' '}
                        {sale.quantity}개
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
              <p className="text-sm font-medium text-brutal-black/70">
                최근 판매 기록이 없습니다
              </p>
            )}
            <div className="mt-4">
              <Link
                href="/dashboard/sales"
                className="px-1 text-sm font-bold text-brutal-black underline underline-offset-4 transition-colors hover:bg-brutal-yellow"
              >
                모든 판매 보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State Alerts */}
      {data.purchaseCount === 0 && data.salesCount === 0 && (
        <div className="mt-6 border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-black text-brutal-black">
                시작하기
              </h3>
              <div className="mt-2 text-sm font-medium text-brutal-black">
                <p>
                  매입을 등록하면 원가를 자동으로 분석합니다.{' '}
                  <Link
                    href="/dashboard/purchases/new"
                    className="px-0.5 font-bold underline underline-offset-2 hover:bg-brutal-white"
                  >
                    매입 등록하기
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
