export const dynamic = 'force-dynamic'

import { formatDate, formatCurrency } from '@/lib/utils/format'
import { normalizeOptionalParam } from '@/lib/params'
import { getBreakEvenAnalysis } from './actions'

interface SearchParams {
  month?: string
  storeId?: string
}

export default async function BreakEvenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const today = new Date()
  const defaultMonth = formatDate(today, 'yyyy-MM')

  const month = params.month || defaultMonth
  const storeId = normalizeOptionalParam(params.storeId)

  const result = await getBreakEvenAnalysis(month, storeId)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-brutal-black">손익분기점 분석</h1>
        <p className="mt-2 text-sm font-medium text-brutal-black/70">
          고정비 기반 SKU별 손익분기 수량 및 달성률
        </p>
      </div>

      <form
        method="GET"
        className="mb-6 border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal"
      >
        {storeId && <input type="hidden" name="storeId" value={storeId} />}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label
              htmlFor="month"
              className="block text-sm font-bold text-brutal-black"
            >
              분석 월
            </label>
            <div className="mt-2">
              <input
                type="month"
                name="month"
                id="month"
                defaultValue={month}
                className="block w-full border-2 border-brutal-black bg-brutal-white px-4 py-3 text-base font-medium text-brutal-black shadow-brutal-sm transition-all focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal"
              />
            </div>
          </div>
          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              className="w-full border-3 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-black text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      {!result.success ? (
        <div className="border-3 border-brutal-black bg-brutal-pink p-6 shadow-brutal">
          <p className="font-bold text-brutal-black">{result.error}</p>
        </div>
      ) : !result.data || result.data.skus.length === 0 ? (
        <div className="border-3 border-brutal-black bg-brutal-white p-10 text-center shadow-brutal">
          <p className="font-bold text-brutal-black">
            해당 월에 분석할 데이터가 없습니다
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
              <p className="text-sm font-medium text-brutal-black/70">
                총 고정비
              </p>
              <p className="mt-1 text-2xl font-black text-brutal-black">
                {formatCurrency(result.data.totalFixedCost)}
              </p>
            </div>
            <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
              <p className="text-sm font-medium text-brutal-black/70">
                공헌이익률 (매출 가중)
              </p>
              <p className="mt-1 text-2xl font-black text-brutal-black">
                {result.data.avgContributionMarginPercent.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs font-medium text-brutal-black/50">
                판매 비중 반영, 레시피 미등록 SKU 제외
              </p>
            </div>
            <div className="border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal">
              <p className="text-sm font-medium text-brutal-black/70">
                손익분기 매출액
              </p>
              <p className="mt-1 text-2xl font-black text-brutal-black">
                {formatCurrency(Math.round(result.data.totalBreakEvenRevenue))}
              </p>
            </div>
          </div>

          {/* SKU Table */}
          <div className="overflow-x-auto border-3 border-brutal-black shadow-brutal">
            <table className="min-w-full">
              <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
                <tr>
                  <th className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black">
                    SKU
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    판매단가
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    변동원가
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    공헌이익
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    BEP 수량
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    실제 판매
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                    달성률
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
                {result.data.skus.map((sku) => (
                  <tr key={sku.skuName}>
                    <td className="py-4 pl-6 pr-3 text-sm font-bold text-brutal-black">
                      {sku.skuName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
                      {formatCurrency(sku.unitPrice)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
                      {formatCurrency(Math.round(sku.variableCost))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                      {formatCurrency(Math.round(sku.contributionMargin))}
                      <span className="ml-1 text-xs text-brutal-black/50">
                        ({sku.contributionMarginPercent.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
                      {sku.bepQuantity}개
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                      {sku.actualQuantity}개
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-3 w-24 border-2 border-brutal-black bg-brutal-white">
                          <div
                            className={`h-full ${
                              sku.achievementPercent >= 100
                                ? 'bg-brutal-green'
                                : 'bg-brutal-pink'
                            }`}
                            style={{
                              width: `${Math.min(sku.achievementPercent, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            sku.achievementPercent >= 100
                              ? 'text-green-700'
                              : 'text-red-600'
                          }`}
                        >
                          {sku.achievementPercent.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
