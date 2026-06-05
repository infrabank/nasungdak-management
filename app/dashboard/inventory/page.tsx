import { getInventory, getAlertRules, getLowStockAlerts } from './actions'
import { getActiveStores } from '../stores/actions'
import { getIngredients } from '../master-data/ingredients/actions'
import InventoryForm from './inventory-form'
import EventForm from './event-form'
import AlertRuleForm from './alert-rule-form'
import InventoryCard from './inventory-card'
import InventoryRow from './inventory-row'
import AlertRuleRow from './alert-rule-row'
import AlertRuleCard from './alert-rule-card'
import AlertCheckButton from './alert-check-button'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  const [inventoryList, alertRules, activeStores, ingredientList, lowStock] =
    await Promise.all([
      getInventory(storeId),
      getAlertRules(storeId),
      getActiveStores(),
      getIngredients(),
      getLowStockAlerts(storeId),
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
  const storeNameOptions = activeStores.map((s) => ({
    id: s.id,
    storeName: s.storeName,
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
          <AlertCheckButton storeId={storeId || undefined} />
        </div>
      </div>

      {/* 재고 부족 경고 배너 */}
      {lowStock.length > 0 && (
        <div className="mt-6 border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal">
          <p className="mb-2 text-sm font-black uppercase tracking-wide text-brutal-black">
            ⚠️ 재고 부족 예상 {lowStock.length}건
          </p>
          <ul className="space-y-1">
            {lowStock.map((a) => (
              <li
                key={`${a.storeId}:${a.ingredientId}`}
                className="flex flex-wrap items-center gap-x-2 text-sm font-bold text-brutal-black"
              >
                <span>🏪 {a.storeName}</span>
                <span>·</span>
                <span>{a.ingredientName}</span>
                <span className="border-2 border-brutal-black bg-brutal-white px-2 py-0.5 text-xs">
                  잔여 약 {a.daysRemaining}일 (임계값 {a.thresholdDays}일)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 재고 현황 - Mobile View */}
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
                // unstable_cache 역직렬화 시 Date가 문자열로 올 수 있어 new Date()로 정규화
                lastUpdated: item.lastUpdated
                  ? new Date(item.lastUpdated).toISOString()
                  : null,
              }}
            />
          ))
        )}
      </div>

      {/* 재고 현황 - Desktop View */}
      <div className="mt-8 hidden flow-root md:block">
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
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    관리
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
                    <InventoryRow
                      key={item.id}
                      item={{
                        ...item,
                        lastUpdated: item.lastUpdated
                          ? new Date(item.lastUpdated).toISOString()
                          : null,
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 알림 규칙 */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-gray-900">알림 규칙</h2>
        <p className="mt-1 text-sm text-gray-700">
          재료별 재고 부족 예측 알림 설정 (전체 매장 또는 특정 매장)
        </p>

        {alertRules.length === 0 ? (
          <div className="mt-4 border-3 border-dashed border-brutal-black bg-brutal-white p-8 text-center">
            <p className="text-sm font-medium text-brutal-black/70">
              등록된 알림 규칙이 없습니다
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="mt-4 space-y-4 md:hidden">
              {alertRules.map((rule) => (
                <AlertRuleCard
                  key={rule.id}
                  rule={rule}
                  stores={storeNameOptions}
                />
              ))}
            </div>

            {/* Desktop View */}
            <div className="mt-4 hidden flow-root md:block">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          재료명
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          적용 매장
                        </th>
                        <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                          임계값
                        </th>
                        <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                          예측 기간
                        </th>
                        <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                          상태
                        </th>
                        <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {alertRules.map((rule) => (
                        <AlertRuleRow
                          key={rule.id}
                          rule={rule}
                          stores={storeNameOptions}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
