import Link from 'next/link'
import { getPurchases, getMenusForFilter, getIngredientsForFilter } from './actions'
import CSVUpload from './csv-upload'
import PurchaseRow from './purchase-row'
import PurchaseCard from './purchase-card'
import { formatDate, formatCurrency } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

interface SearchParams {
  startDate?: string
  endDate?: string
  menuId?: string
  ingredientId?: string
  storeId?: string
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

  const startDate = params.startDate || formatDate(thirtyDaysAgo, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const menuId = params.menuId || ''
  const ingredientId = params.ingredientId || ''
  const storeId = params.storeId || ''

  const [purchases, menus, ingredientsList] = await Promise.all([
    getPurchases(startDate, endDate, menuId, ingredientId, storeId),
    getMenusForFilter(),
    getIngredientsForFilter(),
  ])

  // Calculate totals
  const totalQuantity = purchases.reduce((sum, p) => sum + Number(p.quantity), 0)
  const totalAmount = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0)

  const newPurchaseUrl = storeId
    ? `/dashboard/purchases/new?storeId=${storeId}`
    : '/dashboard/purchases/new'

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">매입 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            매입 거래 이력 조회 및 관리
          </p>
        </div>
        {/* Desktop buttons */}
        <div className="hidden sm:flex sm:gap-3">
          <CSVUpload />
          <Link
            href={newPurchaseUrl}
            className="block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            새 매입 등록
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="mt-4 bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4"
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
            {purchases.length}건
            {menuId || ingredientId ? ' (필터 적용됨)' : ''}
          </p>
          <div className="flex gap-2">
            <a
              href={storeId ? `/dashboard/purchases?storeId=${storeId}` : '/dashboard/purchases'}
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

      {/* Summary - Sticky on Mobile */}
      {purchases.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 md:static">
          <div className="bg-blue-50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">총 {purchases.length}건</p>
                <p className="text-xs text-blue-500">
                  수량 합계: {totalQuantity.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600">총 매입액</p>
                <p className="text-2xl font-bold text-blue-700">
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
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-8 text-center">
            <p className="text-gray-500">매입 데이터가 없습니다.</p>
            <Link
              href={newPurchaseUrl}
              className="inline-block mt-4 text-blue-600 font-medium"
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
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  날짜
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  메뉴
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  재료
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  공급업체
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  수량
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  단가
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  합계
                </th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                  검증
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-gray-500">
                    매입 데이터가 없습니다. &ldquo;새 매입 등록&rdquo; 버튼을 클릭하여 시작하세요.
                  </td>
                </tr>
              ) : (
                <>
                  {purchases.map((purchase) => (
                    <PurchaseRow key={purchase.id} purchase={purchase} />
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td
                      colSpan={4}
                      className="py-4 pl-4 pr-3 text-sm text-right text-gray-900 sm:pl-6"
                    >
                      합계
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                      {totalQuantity.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                      -
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
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

      {/* Mobile: Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 md:hidden">
        <div className="flex gap-3">
          <CSVUpload />
          <Link
            href={newPurchaseUrl}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-center text-base font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            + 새 매입 등록
          </Link>
        </div>
      </div>
    </div>
  )
}
