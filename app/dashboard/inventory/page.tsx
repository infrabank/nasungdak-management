import { getInventory, getAlertRules, checkInventoryAlerts } from './actions'
import { getActiveStores } from '../stores/actions'
import { getIngredients } from '../master-data/ingredients/actions'
import InventoryForm from './inventory-form'
import EventForm from './event-form'
import AlertRuleForm from './alert-rule-form'
import InventoryCard from './inventory-card'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  const [inventoryList, alertRules, activeStores, ingredientList] =
    await Promise.all([
      getInventory(storeId),
      getAlertRules(storeId),
      getActiveStores(),
      getIngredients(),
    ])

  // UUID를 화면에 노출하지 않도록 선택용 옵션 데이터만 폼에 전달
  const storeOptions = activeStores.map((s) => ({
    id: s.id,
    storeName: s.storeName,
    storeCode: s.storeCode,
  }))
  const ingredientOptions = ingredientList.map((i) => ({
    id: i.id,
    ingredientName: i.ingredientName,
    unit: i.unit,
  }))

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">재고 관리</h1>
          <p className="mt-2 text-sm text-gray-700">
            매장별 현재 재고 현황 및 이벤트 기록
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:ml-16 sm:mt-0 sm:flex-none sm:flex-row sm:gap-3">
          <EventForm stores={storeOptions} ingredients={ingredientOptions} />
          <InventoryForm
            stores={storeOptions}
            ingredients={ingredientOptions}
          />
          <AlertRuleForm
            stores={storeOptions}
            ingredients={ingredientOptions}
          />
        </div>
      </div>

      {/* Mobile View - Cards */}
      <div className="mt-6 space-y-4 md:hidden">
        {inventoryList.length === 0 ? (
          <div className="border-3 border-dashed border-brutal-black bg-brutal-white p-12 text-center">
            <p className="text-sm font-medium text-brutal-black/70">
              재고 데이터가 없습니다
            </p>
          </div>
        ) : (
          inventoryList.map((item) => (
            <InventoryCard
              key={item.id}
              item={{
                ...item,
                lastUpdated: item.lastUpdated
                  ? item.lastUpdated.toISOString()
                  : null,
              }}
            />
          ))
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="mt-8 flow-root hidden md:block">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    재료명
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    매장
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    현재 재고
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    단위
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    마지막 갱신
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventoryList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-sm text-gray-500"
                    >
                      재고 데이터가 없습니다
                    </td>
                  </tr>
                ) : (
                  inventoryList.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {item.ingredientName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.storeName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-900">
                        {Number(item.currentQuantity).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.unit || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.lastUpdated
                          ? new Date(item.lastUpdated).toLocaleDateString(
                              'ko-KR'
                            )
                          : '-'}
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
  )
}
