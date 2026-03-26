export const dynamic = 'force-dynamic'

import { formatDate } from '@/lib/utils/format'
import { normalizeOptionalParam } from '@/lib/params'
import { getIngredientPriceTrend } from './actions'
import PriceChart from './price-chart'

interface SearchParams {
  startDate?: string
  endDate?: string
  storeId?: string
}

export default async function IngredientPricesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const today = new Date()
  const sixMonthsAgo = new Date(
    today.getFullYear(),
    today.getMonth() - 6,
    today.getDate()
  )

  const startDate =
    params.startDate || formatDate(sixMonthsAgo, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const storeId = normalizeOptionalParam(params.storeId)

  const result = await getIngredientPriceTrend(startDate, endDate, storeId)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-brutal-black">
          식재료 가격 추이
        </h1>
        <p className="mt-2 text-sm font-medium text-brutal-black/70">
          식재료별 월간 매입 단가 변동 추이
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
              htmlFor="startDate"
              className="block text-sm font-bold text-brutal-black"
            >
              시작 날짜
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="startDate"
                id="startDate"
                defaultValue={startDate}
                className="block w-full border-2 border-brutal-black bg-brutal-white px-4 py-3 text-base font-medium text-brutal-black shadow-brutal-sm transition-all focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="endDate"
              className="block text-sm font-bold text-brutal-black"
            >
              종료 날짜
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="endDate"
                id="endDate"
                defaultValue={endDate}
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
      ) : !result.data ||
        result.data.rows.length === 0 ? (
        <div className="border-3 border-brutal-black bg-brutal-white p-10 text-center shadow-brutal">
          <p className="font-bold text-brutal-black">
            해당 기간에 매입 데이터가 없습니다
          </p>
        </div>
      ) : (
        <PriceChart
          rows={result.data.rows}
          summaries={result.data.summaries}
        />
      )}
    </div>
  )
}
