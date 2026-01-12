import Link from 'next/link'
import { getSalesRecords, getSKUsForFilter } from './actions'
import CSVUpload from './csv-upload'
import CSVUploadTranspose from './csv-upload-transpose'
import SalesList from './sales-list'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

interface SearchParams {
  startDate?: string
  endDate?: string
  skuId?: string
  storeId?: string
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

  const startDate = params.startDate || formatDate(thirtyDaysAgo, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const skuId = params.skuId || ''
  const storeId = params.storeId || ''

  const [sales, skuList] = await Promise.all([
    getSalesRecords(startDate, endDate, skuId, storeId),
    getSKUsForFilter(),
  ])

  // Calculate totals
  const totalQuantity = sales.reduce((sum, s) => sum + Number(s.quantitySold), 0)
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalRevenue || 0), 0)

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">판매 관리</h1>
          <p className="mt-2 text-sm text-gray-800">
            일일 판매 기록 조회 및 관리
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none sm:flex sm:gap-3">
          <CSVUploadTranspose storeId={storeId} />
          <CSVUpload storeId={storeId} />
          <Link
            href={storeId ? `/dashboard/sales/daily?storeId=${storeId}` : '/dashboard/sales/daily'}
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            일일 판매 입력
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="mt-6 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-4">
        {/* Preserve storeId from URL */}
        {storeId && <input type="hidden" name="storeId" value={storeId} />}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-800 mb-1">
              시작일
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              defaultValue={startDate}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-800 mb-1">
              종료일
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              defaultValue={endDate}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="skuId" className="block text-sm font-medium text-gray-800 mb-1">
              SKU
            </label>
            <select
              id="skuId"
              name="skuId"
              defaultValue={skuId}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">전체</option>
              {skuList.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.menuName} - {sku.skuName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-800">
            {sales.length}건의 판매 기록
            {skuId ? ' (필터 적용됨)' : ''}
          </p>
          <div className="flex gap-2">
            <a
              href={storeId ? `/dashboard/sales?storeId=${storeId}` : '/dashboard/sales'}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              초기화
            </a>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              조회
            </button>
          </div>
        </div>
      </form>

      <SalesList sales={sales} totalQuantity={totalQuantity} totalRevenue={totalRevenue} />
    </div>
  )
}
