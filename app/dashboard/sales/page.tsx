/**
 * Sales Page - INPUT CONTRACT
 *
 * Parameters passed to actions:
 * - startDate: REQUIRED (defaults to 30 days ago if not provided)
 * - endDate: REQUIRED (defaults to today if not provided)
 * - skuId: OPTIONAL (undefined = no filter, never empty string)
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
import { getSalesRecords, getSKUsForFilter } from './actions'
import CSVUpload from './csv-upload'
import CSVUploadTranspose from './csv-upload-transpose'
import SalesList from './sales-list'
import { formatDate } from '@/lib/utils/format'
import { normalizeOptionalParam } from '@/lib/params'

interface SearchParams {
  startDate?: string
  endDate?: string
  skuId?: string
  storeId?: string
  page?: string
}

export default async function SalesPage({
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
  const skuId = normalizeOptionalParam(params.skuId)
  const storeId = normalizeOptionalParam(params.storeId)
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)

  const [salesResult, skuList] = await Promise.all([
    getSalesRecords(startDate, endDate, skuId, storeId, page),
    getSKUsForFilter(),
  ])

  const sales = salesResult.items
  const hasMore = salesResult.hasMore

  // Calculate totals for current page
  const totalQuantity = sales.reduce(
    (sum, s) => sum + Number(s.quantitySold),
    0
  )
  const totalRevenue = sales.reduce(
    (sum, s) => sum + Number(s.totalRevenue || 0),
    0
  )

  // Build pagination URLs
  const buildPageUrl = (newPage: number) => {
    const searchParamsObj = new URLSearchParams()
    searchParamsObj.set('startDate', startDate)
    searchParamsObj.set('endDate', endDate)
    if (skuId) searchParamsObj.set('skuId', skuId)
    if (storeId) searchParamsObj.set('storeId', storeId)
    if (newPage > 1) searchParamsObj.set('page', String(newPage))
    return `/dashboard/sales?${searchParamsObj.toString()}`
  }

  const dailySalesUrl = storeId
    ? `/dashboard/sales/daily?storeId=${storeId}`
    : '/dashboard/sales/daily'

  // Mobile-friendly input classes
  const inputClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 appearance-none bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            판매 관리
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            일일 판매 기록 조회 및 관리
          </p>
        </div>
        {/* Desktop buttons */}
        <div className="hidden sm:flex sm:gap-3">
          <CSVUploadTranspose storeId={storeId} />
          <CSVUpload storeId={storeId} />
          <Link
            href={dailySalesUrl}
            className="block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            일일 판매 입력
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="mt-4 bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4"
      >
        {storeId && <input type="hidden" name="storeId" value={storeId} />}

        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
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

          {/* SKU Filter */}
          <div>
            <label htmlFor="skuId" className={labelClass}>
              🏷️ SKU
            </label>
            <div className="relative">
              <select
                id="skuId"
                name="skuId"
                defaultValue={skuId}
                className={selectClass}
              >
                <option value="">전체</option>
                {skuList.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.menuName} - {sku.skuName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg
                  className="h-5 w-5 text-gray-400"
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
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            페이지 {page} · {sales.length}건 표시
            {hasMore ? ' (더 있음)' : ''}
            {skuId ? ' · 필터 적용됨' : ''}
          </p>
          <div className="flex gap-2">
            <a
              href={
                storeId
                  ? `/dashboard/sales?storeId=${storeId}`
                  : '/dashboard/sales'
              }
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              초기화
            </a>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      {/* Sales List */}
      <SalesList
        sales={sales}
        totalQuantity={totalQuantity}
        totalRevenue={totalRevenue}
      />

      {/* Pagination Controls */}
      {(page > 1 || hasMore) && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={buildPageUrl(page - 1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              ← 이전
            </Link>
          )}
          <span className="text-sm text-gray-600">페이지 {page}</span>
          {hasMore && (
            <Link
              href={buildPageUrl(page + 1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              다음 →
            </Link>
          )}
        </div>
      )}

      {/* Mobile: Fixed Bottom Action Bar - positioned above bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 lg:hidden">
        <div className="flex gap-3">
          <CSVUploadTranspose storeId={storeId} />
          <Link
            href={dailySalesUrl}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-center text-base font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            + 일일 판매 입력
          </Link>
        </div>
      </div>
    </div>
  )
}
