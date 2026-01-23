/**
 * Purchases Page - INPUT CONTRACT
 *
 * Parameters passed to actions:
 * - startDate: REQUIRED (defaults to 30 days ago if not provided)
 * - endDate: REQUIRED (defaults to today if not provided)
 * - menuId: OPTIONAL (undefined = no filter, never empty string)
 * - ingredientId: OPTIONAL (undefined = no filter, never empty string)
 * - storeId: OPTIONAL (undefined = no filter, never empty string)
 *
 * Empty strings from URL params are normalized to undefined before
 * passing to actions. Actions assume valid input.
 *
 * RENDERING POLICY: force-dynamic
 * - Date defaults use new Date() which must be computed at request time
 * - List must reflect real-time data after mutations
 * - Caching is handled at the action layer via unstable_cache
 */

import Link from 'next/link'

// This page must render dynamically because:
// 1. Date defaults (new Date()) must be fresh per request
// 2. Data must reflect recent mutations immediately
// 3. Caching is managed at action layer, not page layer
export const dynamic = 'force-dynamic'
import {
  getPurchases,
  getPurchasesTotals,
  getMenusForFilter,
  getIngredientsForFilter,
} from './actions'
import CSVUpload from './csv-upload'
import PurchaseRow from './purchase-row'
import PurchaseCard from './purchase-card'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { normalizeOptionalParam } from '@/lib/params'

interface SearchParams {
  startDate?: string
  endDate?: string
  menuId?: string
  ingredientId?: string
  storeId?: string
  page?: string
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // Default to last 30 days
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  // Normalize parameters: dates have defaults, filters use undefined for "no filter"
  const startDate = params.startDate || formatDate(thirtyDaysAgo, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const menuId = normalizeOptionalParam(params.menuId)
  const ingredientId = normalizeOptionalParam(params.ingredientId)
  const storeId = normalizeOptionalParam(params.storeId)
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)

  const [purchasesResult, totals, menus, ingredientsList] = await Promise.all([
    getPurchases(startDate, endDate, menuId, ingredientId, storeId, page),
    getPurchasesTotals(startDate, endDate, menuId, ingredientId, storeId),
    getMenusForFilter(),
    getIngredientsForFilter(),
  ])

  const purchases = purchasesResult.items
  const hasMore = purchasesResult.hasMore
  const { totalCount, totalQuantity, totalAmount } = totals

  // Build pagination URLs
  const buildPageUrl = (newPage: number) => {
    const searchParamsObj = new URLSearchParams()
    searchParamsObj.set('startDate', startDate)
    searchParamsObj.set('endDate', endDate)
    if (menuId) searchParamsObj.set('menuId', menuId)
    if (ingredientId) searchParamsObj.set('ingredientId', ingredientId)
    if (storeId) searchParamsObj.set('storeId', storeId)
    if (newPage > 1) searchParamsObj.set('page', String(newPage))
    return `/dashboard/purchases?${searchParamsObj.toString()}`
  }

  const newPurchaseUrl = storeId
    ? `/dashboard/purchases/new?storeId=${storeId}`
    : '/dashboard/purchases/new'

  // Mobile-friendly input classes - Neo-Brutalism
  const inputClass =
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const selectClass =
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all appearance-none'
  const labelClass = 'block text-sm font-bold text-brutal-black mb-2'

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-brutal-black">매입 관리</h1>
          <p className="mt-1 text-sm font-medium text-brutal-black">
            매입 거래 이력 조회 및 관리
          </p>
        </div>
        {/* Desktop buttons */}
        <div className="hidden sm:flex sm:gap-3">
          <CSVUpload />
          <Link
            href={newPurchaseUrl}
            className="block bg-brutal-yellow border-2 border-brutal-black px-4 py-2 text-center text-sm font-bold text-brutal-black shadow-brutal hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            새 매입 등록
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="mt-4 bg-brutal-white border-3 border-brutal-black shadow-brutal p-4"
      >
        {storeId && <input type="hidden" name="storeId" value={storeId} />}

        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className={labelClass}>
              📅 시작일
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              defaultValue={startDate}
              className={inputClass}
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className={labelClass}>
              📅 종료일
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              defaultValue={endDate}
              className={inputClass}
            />
          </div>

          {/* Menu Filter */}
          <div>
            <label htmlFor="menuId" className={labelClass}>
              🍗 메뉴
            </label>
            <div className="relative">
              <select
                id="menuId"
                name="menuId"
                defaultValue={menuId}
                className={selectClass}
              >
                <option value="">전체</option>
                {menus.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.menuName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg
                  className="h-5 w-5 text-brutal-black"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Ingredient Filter */}
          <div>
            <label htmlFor="ingredientId" className={labelClass}>
              🥬 재료
            </label>
            <div className="relative">
              <select
                id="ingredientId"
                name="ingredientId"
                defaultValue={ingredientId}
                className={selectClass}
              >
                <option value="">전체</option>
                {ingredientsList.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.ingredientName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg
                  className="h-5 w-5 text-brutal-black"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-brutal-black/20">
          <p className="text-sm font-medium text-brutal-black">
            페이지 {page} · {purchases.length}건 표시
            {hasMore ? ' (더 있음)' : ''}
            {menuId || ingredientId ? ' · 필터 적용됨' : ''}
          </p>
          <div className="flex gap-2">
            <a
              href={storeId ? `/dashboard/purchases?storeId=${storeId}` : '/dashboard/purchases'}
              className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              초기화
            </a>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      {/* Summary - Sticky on Mobile */}
      {purchases.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 md:static">
          <div className="bg-brutal-blue border-3 border-brutal-black shadow-brutal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-brutal-black">
                  검색 기간 총 {totalCount}건
                </p>
                <p className="text-xs font-medium text-brutal-black">
                  수량 합계: {totalQuantity.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brutal-black">총 매입액</p>
                <p className="text-2xl font-black text-brutal-black">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Card List */}
      <div className="mt-4 md:hidden">
        {purchases.length === 0 ? (
          <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-8 text-center">
            <p className="font-medium text-brutal-black">매입 데이터가 없습니다.</p>
            <Link
              href={newPurchaseUrl}
              className="inline-block mt-4 font-bold text-brutal-black underline underline-offset-4 hover:bg-brutal-yellow px-1"
            >
              새 매입 등록하기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="mt-6 hidden md:block">
        <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
          <table className="min-w-full">
            <thead className="bg-brutal-yellow border-b-3 border-brutal-black">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-black text-brutal-black sm:pl-6">
                  날짜
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                  메뉴
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                  재료
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                  공급업체
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  수량
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  단가
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  합계
                </th>
                <th className="px-3 py-3.5 text-center text-sm font-black text-brutal-black">
                  검증
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm font-medium text-brutal-black">
                    매입 데이터가 없습니다. &ldquo;새 매입 등록&rdquo; 버튼을 클릭하여 시작하세요.
                  </td>
                </tr>
              ) : (
                <>
                  {purchases.map((purchase) => (
                    <PurchaseRow key={purchase.id} purchase={purchase} />
                  ))}
                  <tr className="bg-brutal-yellow/50 font-bold border-t-3 border-brutal-black">
                    <td
                      colSpan={4}
                      className="py-4 pl-4 pr-3 text-sm text-right text-brutal-black sm:pl-6"
                    >
                      검색 기간 합계 ({totalCount}건)
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right">
                      {totalQuantity.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right">
                      -
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right font-black">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {(page > 1 || hasMore) && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={buildPageUrl(page - 1)}
              className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              ← 이전
            </Link>
          )}
          <span className="text-sm font-bold text-brutal-black">페이지 {page}</span>
          {hasMore && (
            <Link
              href={buildPageUrl(page + 1)}
              className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              다음 →
            </Link>
          )}
        </div>
      )}

      {/* Mobile: Fixed Bottom Action Bar - positioned above bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 bg-brutal-yellow border-t-3 border-brutal-black p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 lg:hidden">
        <div className="flex gap-3">
          <CSVUpload />
          <Link
            href={newPurchaseUrl}
            className="flex-1 bg-brutal-white border-3 border-brutal-black py-3 text-center text-base font-bold text-brutal-black shadow-brutal hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            + 새 매입 등록
          </Link>
        </div>
      </div>
    </div>
  )
}
