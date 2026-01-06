import Link from 'next/link'
import { getPurchases } from './actions'
import CSVUpload from './csv-upload'
import PurchaseRow from './purchase-row'

export const dynamic = 'force-dynamic'

export default async function PurchasesPage() {
  const purchases = await getPurchases()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold">매입 관리</h1>
          <p className="mt-2 text-sm text-gray-700">
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
                      <td colSpan={9} className="py-8 text-center text-sm text-gray-500">
                        매입 데이터가 없습니다. &ldquo;새 매입 등록&rdquo; 버튼을 클릭하여 시작하세요.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((purchase) => (
                      <PurchaseRow key={purchase.id} purchase={purchase} />
                    ))
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
