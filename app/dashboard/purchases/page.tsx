import Link from 'next/link'
import { getPurchases, getMenusForFilter, getIngredientsForFilter } from './actions'
import CSVUpload from './csv-upload'
import PurchaseRow from './purchase-row'
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

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">매입 관리</h1>
          <p className="mt-2 text-sm text-gray-800">
            매입 거래 이력 조회 및 관리
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none sm:flex sm:gap-3">
          <CSVUpload />
          <Link
            href="/dashboard/purchases/new"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            새 매입 등록
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="mt-6 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-4">
        {/* Preserve storeId from URL */}
        {storeId && <input type="hidden" name="storeId" value={storeId} />}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
            <label htmlFor="menuId" className="block text-sm font-medium text-gray-800 mb-1">
              메뉴
            </label>
            <select
              id="menuId"
              name="menuId"
              defaultValue={menuId}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">전체</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.menuName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ingredientId" className="block text-sm font-medium text-gray-800 mb-1">
              재료
            </label>
            <select
              id="ingredientId"
              name="ingredientId"
              defaultValue={ingredientId}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">전체</option>
              {ingredientsList.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.ingredientName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-800">
            {purchases.length}건의 매입 기록
            {menuId || ingredientId ? ' (필터 적용됨)' : ''}
          </p>
          <div className="flex gap-2">
            <a
              href={storeId ? `/dashboard/purchases?storeId=${storeId}` : '/dashboard/purchases'}
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

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
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
                      <td colSpan={9} className="py-8 text-center text-sm text-gray-800">
                        매입 데이터가 없습니다. &ldquo;새 매입 등록&rdquo; 버튼을 클릭하여 시작하세요.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {purchases.map((purchase) => (
                        <PurchaseRow key={purchase.id} purchase={purchase} />
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={4} className="py-4 pl-4 pr-3 text-sm text-right text-gray-900 sm:pl-6">
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
        </div>
      </div>
    </div>
  )
}
