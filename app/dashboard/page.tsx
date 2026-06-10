import Link from 'next/link'
import { getDashboardStats } from './actions'
import { getLowStockAlerts } from './inventory/actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export default async function DashboardPage() {
  const [result, lowStockAlerts] = await Promise.all([
    getDashboardStats(),
    getLowStockAlerts(),
  ])

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
  const estimatedProfit =
    data.monthlySales - data.monthlyPurchases - data.monthlyFixedCosts

  return (
    <div className="pb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-brutal-black">대시보드</h1>
          <p className="mt-2 text-sm font-medium text-brutal-black">
            {formatDate(new Date(), 'yyyy년 MM월 dd일 (EEE)')}
          </p>
        </div>
        <Link
          href="/dashboard/closing"
          className="border-3 border-brutal-black bg-brutal-yellow px-6 py-3 text-center text-base font-black text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
        >
          오늘 마감하기
        </Link>
      </div>

      {/* 핵심 숫자 4개 */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-3 border-brutal-black bg-brutal-green p-4 shadow-brutal">
          <dt className="text-sm font-bold text-brutal-black">오늘 매출</dt>
          <dd className="mt-1 text-3xl font-black text-brutal-black">
            {formatCurrency(data.todaySales)}
          </dd>
          <dd className="mt-1 text-xs font-medium text-brutal-black">
            {data.todaySales === 0 ? '아직 입력 전' : '판매 기록 기준'}
          </dd>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
          <dt className="text-sm font-bold text-brutal-black">이번 달 매출</dt>
          <dd className="mt-1 text-3xl font-black text-brutal-black">
            {formatCurrency(data.monthlySales)}
          </dd>
          <dd className="mt-1 text-xs font-medium text-brutal-black">
            판매 {data.salesCount}건
          </dd>
        </div>

        <div
          className={`border-3 border-brutal-black p-4 shadow-brutal ${
            estimatedProfit >= 0 ? 'bg-brutal-yellow' : 'bg-brutal-pink'
          }`}
        >
          <dt className="text-sm font-bold text-brutal-black">
            이번 달 추정 순이익
          </dt>
          <dd className="mt-1 text-3xl font-black text-brutal-black">
            {formatCurrency(estimatedProfit)}
          </dd>
          <dd className="mt-1 text-xs font-medium text-brutal-black">
            매출 - 매입 {formatCurrency(data.monthlyPurchases)} - 고정비{' '}
            {formatCurrency(data.monthlyFixedCosts)} · 마진{' '}
            {data.marginPercent.toFixed(1)}%
          </dd>
        </div>

        <Link
          href="/dashboard/inventory"
          className={`border-3 border-brutal-black p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover ${
            lowStockAlerts.length > 0 ? 'bg-brutal-pink' : 'bg-brutal-white'
          }`}
        >
          <dt className="text-sm font-bold text-brutal-black">재고 경고</dt>
          <dd className="mt-1 text-3xl font-black text-brutal-black">
            {lowStockAlerts.length > 0
              ? `${lowStockAlerts.length}건`
              : '정상'}
          </dd>
          <dd className="mt-1 truncate text-xs font-medium text-brutal-black">
            {lowStockAlerts.length > 0
              ? lowStockAlerts
                  .slice(0, 3)
                  .map((a) => `${a.ingredientName} ${a.daysRemaining}일`)
                  .join(', ')
              : '부족 임박 재료 없음'}
          </dd>
        </Link>
      </div>

      {/* 빠른 작업 */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-black text-brutal-black">빠른 작업</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            href="/dashboard/closing"
            className="border-3 border-brutal-black bg-brutal-green p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
          >
            <h3 className="font-bold text-brutal-black">일일 마감</h3>
            <p className="mt-1 text-sm font-medium text-brutal-black">
              오늘 매출·판매량 확정
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
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 최근 매입 */}
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
                        {formatDate(new Date(purchase.date), 'yy-MM-dd(EEE)')}
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

        {/* 최근 판매 */}
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
                        {formatDate(new Date(sale.date), 'yy-MM-dd(EEE)')} ·{' '}
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

      {/* 시작 안내 */}
      {data.purchaseCount === 0 && data.salesCount === 0 && (
        <div className="mt-6 border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
          <h3 className="text-sm font-black text-brutal-black">시작하기</h3>
          <p className="mt-2 text-sm font-medium text-brutal-black">
            영업 종료 후{' '}
            <Link
              href="/dashboard/closing"
              className="px-0.5 font-bold underline underline-offset-2 hover:bg-brutal-white"
            >
              일일 마감
            </Link>
            을 입력하면 매출과 순이익이 자동으로 계산됩니다.
          </p>
        </div>
      )}
    </div>
  )
}
