import { getTossMappings, getStoresAndSkus } from './actions'
import TossMappingForm from './toss-mapping-form'
import TossMappingCard from './toss-mapping-card'

export default async function TossMappingsPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  const [mappings, { stores, skus }] = await Promise.all([
    getTossMappings(storeId),
    getStoresAndSkus(),
  ])

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">토스 SKU 매핑</h1>
          <p className="mt-2 text-sm text-gray-700">
            토스 POS 품목과 내부 SKU 연결 관리
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <TossMappingForm stores={stores} skus={skus} />
        </div>
      </div>

      {/* Store Filter */}
      <form method="GET" className="mt-4">
        {storeId && <input type="hidden" name="storeId" value={storeId} />}
        <select
          name="storeId"
          defaultValue={storeId}
          className="block w-full rounded-lg border-0 py-3 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 text-base sm:py-1.5 sm:pl-3 sm:pr-8 sm:text-sm sm:w-auto"
        >
          <option value="">전체 매장</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.storeName} ({store.storeCode})
            </option>
          ))}
        </select>
      </form>

      <div className="mt-8 flow-root">
        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {mappings.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-gray-200">
              등록된 매핑이 없습니다
            </div>
          ) : (
            mappings.map((mapping) => (
              <TossMappingCard
                key={mapping.id}
                mapping={mapping}
                stores={stores}
                skus={skus}
              />
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block -mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      매장
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      토스 품목 코드
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      토스 품목명
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      SKU
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900"
                    >
                      활성
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                    >
                      <span className="sr-only">작업</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {mappings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-sm text-gray-500"
                      >
                        등록된 매핑이 없습니다
                      </td>
                    </tr>
                  ) : (
                    mappings.map((mapping) => (
                      <tr key={mapping.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                          {mapping.storeName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {mapping.tossItemCode}
                          </code>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {mapping.tossItemName || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {mapping.skuName || (
                            <span className="text-amber-600 font-medium">
                              미매핑
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              mapping.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {mapping.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <TossMappingForm
                            mapping={mapping}
                            stores={stores}
                            skus={skus}
                          />
                        </td>
                      </tr>
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
