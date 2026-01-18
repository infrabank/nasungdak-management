/**
 * Analysis Page - INPUT CONTRACT
 *
 * Parameters passed to actions:
 * - startDate: REQUIRED (defaults to first day of current month)
 * - endDate: REQUIRED (defaults to today)
 * - storeId: OPTIONAL (undefined = no filter, never empty string)
 *
 * Date parameters always have valid defaults ensuring actions receive
 * valid date strings. Empty strings from URL params are normalized
 * to undefined for optional filters. Actions assume valid input.
 *
 * RENDERING POLICY: force-dynamic
 * - Date defaults use new Date() which must be computed at request time
 * - Analysis must reflect real-time data from sales/purchases
 * - Caching is handled at the action layer via unstable_cache
 *
 * STREAMING: Uses Suspense to show form immediately while data loads
 */

// This page must render dynamically because:
// 1. Date defaults (new Date()) must be fresh per request
// 2. Analysis must reflect recent mutations immediately
// 3. Caching is managed at action layer, not page layer
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { formatDate } from '@/lib/utils/format'
import { normalizeOptionalParam } from '@/lib/params'
import AnalysisContent from './analysis-content'
import AnalysisLoading from './analysis-loading'

interface SearchParams {
  startDate?: string
  endDate?: string
  storeId?: string
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams

  // Get date range from search params or use defaults
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  // Normalize parameters: dates have defaults, storeId uses undefined for "no filter"
  const startDate = params.startDate || formatDate(firstDayOfMonth, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const storeId = normalizeOptionalParam(params.storeId)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">기간 분석</h1>
        <p className="mt-2 text-sm text-gray-600">
          판매 원가 및 마진율 분석
        </p>
      </div>

      {/* Date Range Filter - renders immediately */}
      <form method="GET" className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6 mb-6">
        {/* Preserve storeId from URL */}
        {storeId && <input type="hidden" name="storeId" value={storeId} />}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-900">
              시작 날짜
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="startDate"
                id="startDate"
                defaultValue={startDate}
                className="block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-900">
              종료 날짜
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="endDate"
                id="endDate"
                defaultValue={endDate}
                className="block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      {/* Analysis Content - streams in via Suspense */}
      <Suspense fallback={<AnalysisLoading />}>
        <AnalysisContent
          startDate={startDate}
          endDate={endDate}
          storeId={storeId}
        />
      </Suspense>
    </div>
  )
}
