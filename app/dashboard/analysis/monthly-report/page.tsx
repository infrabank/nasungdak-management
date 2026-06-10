import Link from 'next/link'
import { getMonthlyReport, type MonthlyReportMenu } from './actions'
import { formatCurrency } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function changeLabel(cur: number, prev: number): string {
  if (prev === 0) return ''
  const pct = ((cur - prev) / Math.abs(prev)) * 100
  return ` (전월 ${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)`
}

function MenuList({
  title,
  menus,
  metric,
}: {
  title: string
  menus: MonthlyReportMenu[]
  metric: 'quantity' | 'revenue' | 'costRate'
}) {
  return (
    <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-brutal-black">
        {title}
      </h3>
      {menus.length === 0 ? (
        <p className="text-sm font-medium text-brutal-black/60">
          데이터가 없습니다
        </p>
      ) : (
        <ol className="space-y-2">
          {menus.map((m, i) => (
            <li
              key={m.skuName}
              className="flex items-center justify-between text-sm"
            >
              <span className="min-w-0 flex-1 truncate font-bold text-brutal-black">
                {i + 1}. {m.skuName}
              </span>
              <span className="ml-2 font-black text-brutal-black">
                {metric === 'quantity' && `${m.quantity}개`}
                {metric === 'revenue' && formatCurrency(m.revenue)}
                {metric === 'costRate' &&
                  (m.costRate !== null ? `${m.costRate.toFixed(1)}%` : '-')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '')
    ? params.month!
    : currentMonth()

  const result = await getMonthlyReport(month)

  if (!result.success || !result.data) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-black text-brutal-black">
          월간 사장 리포트
        </h1>
        <div className="border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal">
          <p className="text-sm font-bold text-brutal-black">
            {result.error ?? '리포트를 불러올 수 없습니다'}
          </p>
        </div>
      </div>
    )
  }

  const r = result.data
  const [year, monthNum] = month.split('-')
  const isCurrentMonth = month === currentMonth()
  const profitPositive = r.estimatedProfit >= 0

  return (
    <div className="pb-8">
      {/* 헤더 + 월 이동 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-brutal-black">
            월간 사장 리포트
          </h1>
          <p className="mt-1 text-sm font-medium text-brutal-black/70">
            한 달 장사를 숫자로 정리합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/analysis/monthly-report?month=${shiftMonth(month, -1)}`}
            className="border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm"
          >
            ← 전월
          </Link>
          <span className="border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-black text-brutal-black">
            {year}년 {Number(monthNum)}월
          </span>
          {!isCurrentMonth && (
            <Link
              href={`/dashboard/analysis/monthly-report?month=${shiftMonth(month, 1)}`}
              className="border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm"
            >
              다음월 →
            </Link>
          )}
        </div>
      </div>

      {/* 핵심 숫자 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="border-3 border-brutal-black bg-brutal-green p-4 shadow-brutal">
          <dt className="text-sm font-bold text-brutal-black">월매출</dt>
          <dd className="mt-1 text-2xl font-black text-brutal-black">
            {formatCurrency(r.sales.total)}
          </dd>
          <dd className="text-xs font-medium text-brutal-black">
            {changeLabel(r.sales.total, r.sales.prevTotal) || '전월 데이터 없음'}
          </dd>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
          <dt className="text-sm font-bold text-brutal-black">매입비</dt>
          <dd className="mt-1 text-2xl font-black text-brutal-black">
            {formatCurrency(r.purchases.total)}
          </dd>
          <dd className="text-xs font-medium text-brutal-black">
            원가율 {r.costRate.toFixed(1)}%
            {changeLabel(r.purchases.total, r.purchases.prevTotal)}
          </dd>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-purple p-4 shadow-brutal">
          <dt className="text-sm font-bold text-brutal-black">
            고정비 + 인건비
          </dt>
          <dd className="mt-1 text-2xl font-black text-brutal-black">
            {formatCurrency(r.fixedCosts.total + r.labor.unlinkedPay)}
          </dd>
          <dd className="text-xs font-medium text-brutal-black">
            고정비 {formatCurrency(r.fixedCosts.total)}
            {r.labor.unlinkedPay > 0 &&
              ` + 인건비(미반영) ${formatCurrency(r.labor.unlinkedPay)}`}
          </dd>
        </div>

        <div
          className={`border-3 border-brutal-black p-4 shadow-brutal sm:col-span-2 lg:col-span-3 ${
            profitPositive ? 'bg-brutal-yellow' : 'bg-brutal-pink'
          }`}
        >
          <dt className="text-sm font-bold text-brutal-black">
            이번 달 추정 순이익
          </dt>
          <dd className="mt-1 text-3xl font-black text-brutal-black">
            {formatCurrency(r.estimatedProfit)}
            <span className="ml-2 text-sm font-bold">
              {changeLabel(r.estimatedProfit, r.prevEstimatedProfit)}
            </span>
          </dd>
          <dd className="mt-1 text-xs font-medium text-brutal-black">
            매출 - 매입비 - 고정비 - 인건비(고정비 미반영분). 출퇴근 기록 기준
            인건비 합계는 {formatCurrency(r.labor.totalPay)}이며, 고정비에 이미
            반영된 금액은 중복 차감하지 않습니다
          </dd>
        </div>
      </div>

      {/* 결제수단 구성 */}
      {r.payments && (
        <div className="mb-6 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-brutal-black">
            결제수단 구성 (일일 마감 기준)
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs font-bold text-brutal-black/60">카드</div>
              <div className="text-lg font-black text-brutal-black">
                {formatCurrency(r.payments.card)}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-brutal-black/60">현금</div>
              <div className="text-lg font-black text-brutal-black">
                {formatCurrency(r.payments.cash)}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-brutal-black/60">
                배달앱
              </div>
              <div className="text-lg font-black text-brutal-black">
                {formatCurrency(r.payments.delivery)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 분석 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MenuList
          title="많이 판 메뉴"
          menus={r.topQuantityMenus}
          metric="quantity"
        />
        <MenuList
          title="매출 상위 메뉴"
          menus={r.topRevenueMenus}
          metric="revenue"
        />
        <MenuList
          title="원가율 높은 메뉴 (40% 이상)"
          menus={r.highCostMenus}
          metric="costRate"
        />
      </div>

      {/* 매입 분석 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-brutal-black">
            매입액 상위 품목
          </h3>
          {r.topPurchases.length === 0 ? (
            <p className="text-sm font-medium text-brutal-black/60">
              데이터가 없습니다
            </p>
          ) : (
            <ol className="space-y-2">
              {r.topPurchases.map((p, i) => (
                <li
                  key={p.ingredientName}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-bold text-brutal-black">
                    {i + 1}. {p.ingredientName}
                  </span>
                  <span className="ml-2 font-black text-brutal-black">
                    {formatCurrency(p.amount)}
                    {p.changePercent !== null && (
                      <span className="ml-1 text-xs font-bold text-brutal-black/60">
                        ({p.changePercent >= 0 ? '+' : ''}
                        {p.changePercent.toFixed(0)}%)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-brutal-black">
            매입비 급증 품목 (전월 대비 +30%)
          </h3>
          {r.surgingPurchases.length === 0 ? (
            <p className="text-sm font-medium text-brutal-black/60">
              급증 품목이 없습니다
            </p>
          ) : (
            <ol className="space-y-2">
              {r.surgingPurchases.map((p) => (
                <li
                  key={p.ingredientName}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-bold text-brutal-black">
                    {p.ingredientName}
                  </span>
                  <span className="ml-2 font-black text-brutal-black">
                    +{p.changePercent?.toFixed(0)}%{' '}
                    <span className="text-xs font-bold text-brutal-black/60">
                      ({formatCurrency(p.prevAmount)} →{' '}
                      {formatCurrency(p.amount)})
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* 공통 원가율 안내 */}
      {r.unlinkedPurchaseAmount > 0 && (
        <div className="mb-6 border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
          <h3 className="text-sm font-black text-brutal-black">
            공통 원가율 (레시피 미연결 매입비)
          </h3>
          <p className="mt-1 text-sm font-medium text-brutal-black">
            레시피에 연결되지 않은 재료의 매입비가{' '}
            {formatCurrency(r.unlinkedPurchaseAmount)} (매출의{' '}
            {r.unlinkedPurchaseRate.toFixed(1)}%)입니다. 메뉴별 원가율을 볼 때
            이 비율을 가산해서 판단하세요.
          </p>
        </div>
      )}

      {/* 다음 달 점검 */}
      <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-brutal-black">
          다음 달 점검 항목
        </h3>
        {r.checklist.length === 0 ? (
          <p className="text-sm font-medium text-brutal-black/60">
            특별히 점검할 항목이 없습니다
          </p>
        ) : (
          <ul className="space-y-2">
            {r.checklist.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm font-bold text-brutal-black"
              >
                <span className="mt-0.5 inline-block h-2 w-2 shrink-0 border-2 border-brutal-black bg-brutal-yellow" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
