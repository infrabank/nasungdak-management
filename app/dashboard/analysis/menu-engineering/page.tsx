export const dynamic = 'force-dynamic'

import { formatDate } from '@/lib/utils/format'
import { normalizeOptionalParam } from '@/lib/params'
import { getMenuEngineering } from './actions'
import EngineeringContent from './engineering-content'

interface SearchParams {
  startDate?: string
  endDate?: string
  storeId?: string
}

export default async function MenuEngineeringPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const startDate =
    params.startDate || formatDate(firstDayOfMonth, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const storeId = normalizeOptionalParam(params.storeId)

  const result = await getMenuEngineering(startDate, endDate, storeId)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-brutal-black">
          메뉴 엔지니어링
        </h1>
        <p className="mt-2 text-sm font-medium text-brutal-black/70">
          판매량(인기도)과 마진율(수익성) 기준 메뉴 4분면 분류
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
      ) : !result.data || result.data.items.length === 0 ? (
        <div className="border-3 border-brutal-black bg-brutal-white p-10 text-center shadow-brutal">
          <p className="font-bold text-brutal-black">
            해당 기간에 판매 데이터가 없습니다
          </p>
        </div>
      ) : (
        <EngineeringContent
          items={result.data.items}
          avgQuantity={result.data.avgQuantity}
          avgMarginPercent={result.data.avgMarginPercent}
          categoryCounts={result.data.categoryCounts}
        />
      )}
    </div>
  )
}
