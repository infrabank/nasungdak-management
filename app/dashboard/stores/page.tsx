import { getStores } from './actions'
import StoreForm from './store-form'
import StoreCard from './store-card'

export default async function StoresPage() {
  const storeList = await getStores()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-brutal-black">매장 관리</h1>
          <p className="mt-2 text-sm text-brutal-black/70">
            다매장 관리 - 매장 등록 및 설정
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <StoreForm />
        </div>
      </div>

      <div className="mt-8">
        {/* Mobile View - Cards */}
        <div className="space-y-4 md:hidden">
          {storeList.length === 0 ? (
            <div className="border-3 border-dashed border-brutal-black bg-brutal-white py-10 text-center font-medium text-brutal-black/70">
              등록된 매장이 없습니다
            </div>
          ) : (
            storeList.map((store) => <StoreCard key={store.id} store={store} />)
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="flow-root hidden md:block">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-brutal-black border-2 border-brutal-black">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brutal-black sm:pl-0"
                    >
                      매장명
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black"
                    >
                      매장 코드
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black"
                    >
                      주소
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black"
                    >
                      연락처
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black"
                    >
                      관리자 연락처
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-center text-sm font-semibold text-brutal-black"
                    >
                      활성
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-0"
                    >
                      <span className="sr-only">작업</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brutal-black">
                  {storeList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-sm text-brutal-black/70"
                      >
                        등록된 매장이 없습니다
                      </td>
                    </tr>
                  ) : (
                    storeList.map((store) => (
                      <tr key={store.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-0">
                          {store.storeName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
                          {store.storeCode}
                        </td>
                        <td className="max-w-xs truncate px-3 py-4 text-sm text-brutal-black/70">
                          {store.address || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
                          {store.phone || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
                          {store.managerPhone || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
                          <span
                            className={`inline-flex border-2 px-2 text-xs font-semibold leading-5 ${
                              store.isActive
                                ? 'border-brutal-green bg-brutal-green text-brutal-black'
                                : 'border-brutal-black bg-brutal-white text-brutal-black'
                            }`}
                          >
                            {store.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                          <StoreForm store={store} />
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
