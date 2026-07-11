import { revalidateTag } from 'next/cache'

/**
 * 캐시 태그 단일 소스.
 *
 * unstable_cache의 tags와 revalidateTag는 반드시 이 모듈을 통해 문자열을 만든다.
 * 읽기·무효화 양쪽이 같은 빌더를 쓰므로, 'entity:all' vs 'entity:<orgId>' 같은
 * 문자열 불일치로 캐시가 안 털리는 버그가 구조적으로 발생하지 않는다.
 *
 * 조직 스코프 캐시는 organizationId가 없으면 'all'로 폴백한다(로그인 전/전체 보기).
 */

const org = (orgId: string | null | undefined): string => orgId ?? 'all'
const store = (storeId: string | null | undefined): string => storeId ?? 'all'

export const cacheTags = {
  skus: (orgId?: string | null) => `skus:${org(orgId)}`,
  skusActive: 'skus:active',
  skusFilter: 'skus:filter',
  skuRecipes: (orgId?: string | null) => `sku-recipes:${org(orgId)}`,
  ingredients: (orgId?: string | null) => `ingredients:${org(orgId)}`,
  ingredientsActive: 'ingredients:active',
  ingredientsAll: 'ingredients:all',
  menus: (orgId?: string | null) => `menus:${org(orgId)}`,
  menusActive: 'menus:active',
  salesMenus: (orgId?: string | null) => `sales-menus:${org(orgId)}`,
  suppliers: (orgId?: string | null) => `suppliers:${org(orgId)}`,
  marginAnalysis: (orgId?: string | null) => `margin-analysis:${org(orgId)}`,
  // 매장 스코프: 읽기(unstable_cache tags)·무효화가 같은 빌더를 쓴다. storeId 없으면 'all'.
  inventory: (storeId?: string | null) => `inventory:${store(storeId)}`,
  inventoryAll: 'inventory:all',
  inventoryAlerts: (storeId?: string | null) => `inventory:alerts:${store(storeId)}`,
  inventoryAlertsAll: 'inventory:alerts:all',
  sales: (storeId?: string | null) => `sales:${store(storeId)}`,
  salesAll: 'sales:all',
  purchases: (storeId?: string | null) => `purchases:${store(storeId)}`,
  purchasesAll: 'purchases:all',
  oilChanges: (storeId?: string | null) => `oil-changes:${store(storeId)}`,
  oilChangesAll: 'oil-changes:all',
  maintenance: (storeId?: string | null) => `maintenance:${store(storeId)}`,
  maintenanceAll: 'maintenance:all',
  employees: (storeId?: string | null) => `employees:${store(storeId)}`,
  attendance: (storeId?: string | null) => `attendance:${store(storeId)}`,
  storesActive: 'stores:active',
  org: (orgId?: string | null) => `org:${org(orgId)}`,
  plans: 'plans',
} as const

const uniqueStoreIds = (storeIds: (string | null | undefined)[]): string[] =>
  Array.from(new Set(storeIds.filter((id): id is string => Boolean(id))))

/**
 * 도메인별 무효화 그룹. mutation은 개별 revalidateTag 대신 이 함수를 호출한다.
 * 각 함수는 "이 데이터가 바뀌면 무효화해야 하는 모든 파생 캐시"를 한곳에 모은다.
 * 새 파생 캐시가 생기면 여기 한 줄만 고치면 모든 mutation에 반영된다.
 */

/** 재료(단가 포함) 변경 → 재료 목록 + 레시피 원가 + 마진 분석 */
export function revalidateIngredientData(orgId: string | null) {
  revalidateTag(cacheTags.ingredients(orgId))
  revalidateTag(cacheTags.ingredientsAll)
  revalidateTag(cacheTags.ingredientsActive)
  revalidateTag(cacheTags.skuRecipes(orgId))
  revalidateTag(cacheTags.marginAnalysis(orgId))
}

/** SKU(단가·이름·활성) 변경 → SKU 목록 + 레시피 + 마진 + 판매 메뉴(skuName join) */
export function revalidateSkuData(orgId: string | null) {
  revalidateTag(cacheTags.skus(orgId))
  revalidateTag(cacheTags.skusActive)
  revalidateTag(cacheTags.skusFilter)
  revalidateTag(cacheTags.skuRecipes(orgId))
  revalidateTag(cacheTags.marginAnalysis(orgId))
  revalidateTag(cacheTags.salesMenus(orgId))
}

/** 레시피(BOM) 변경 → 레시피 원가 + 마진 분석 */
export function revalidateRecipeData(orgId: string | null) {
  revalidateTag(cacheTags.skuRecipes(orgId))
  revalidateTag(cacheTags.marginAnalysis(orgId))
}

/** 메뉴 카테고리 변경 → 메뉴 목록 + 이름이 join되는 SKU·레시피·마진 */
export function revalidateMenuData(orgId: string | null) {
  revalidateTag(cacheTags.menus(orgId))
  revalidateTag(cacheTags.menusActive)
  revalidateTag(cacheTags.skus(orgId))
  revalidateTag(cacheTags.skuRecipes(orgId))
  revalidateTag(cacheTags.marginAnalysis(orgId))
}

/** 판매 메뉴/구성 변경 → 판매 메뉴 목록 */
export function revalidateSalesMenuData(orgId: string | null) {
  revalidateTag(cacheTags.salesMenus(orgId))
}

/** 공급업체 변경 → 공급업체 목록 */
export function revalidateSupplierData(orgId: string | null) {
  revalidateTag(cacheTags.suppliers(orgId))
}

/**
 * 매장 스코프 무효화 그룹.
 * per-store 태그와 'all' 태그를 항상 함께 털어, "전체 매장" 화면이 stale로 남던 버그를 구조적으로 막는다.
 */

/** 재고 변경 → 매장별 + 전체 재고 화면 */
export function revalidateInventoryData(storeId?: string | null) {
  revalidateTag(cacheTags.inventoryAll)
  if (storeId) revalidateTag(cacheTags.inventory(storeId))
}

/** 여러 매장 재고 일괄 변경(복사/일괄등록) */
export function revalidateInventoryDataMany(storeIds: (string | null | undefined)[]) {
  revalidateTag(cacheTags.inventoryAll)
  for (const id of uniqueStoreIds(storeIds)) revalidateTag(cacheTags.inventory(id))
}

/** 판매 변경 → 매장별+전체 매출, 그리고 재고(판매는 재고를 차감한다) */
export function revalidateSalesData(storeId?: string | null) {
  revalidateTag(cacheTags.salesAll)
  if (storeId) revalidateTag(cacheTags.sales(storeId))
  revalidateInventoryData(storeId)
}

/** 여러 매장 판매 일괄 변경 */
export function revalidateSalesDataMany(storeIds: (string | null | undefined)[]) {
  revalidateTag(cacheTags.salesAll)
  for (const id of uniqueStoreIds(storeIds)) revalidateTag(cacheTags.sales(id))
  revalidateInventoryDataMany(storeIds)
}

/** 매입 변경 → 매장별+전체 매입, 그리고 재고(매입은 재고를 증가시킨다) */
export function revalidatePurchaseData(storeId?: string | null) {
  revalidateTag(cacheTags.purchasesAll)
  if (storeId) revalidateTag(cacheTags.purchases(storeId))
  revalidateInventoryData(storeId)
}

/** 여러 매장 매입 일괄 변경(복사/일괄등록) */
export function revalidatePurchaseDataMany(storeIds: (string | null | undefined)[]) {
  revalidateTag(cacheTags.purchasesAll)
  for (const id of uniqueStoreIds(storeIds)) revalidateTag(cacheTags.purchases(id))
  revalidateInventoryDataMany(storeIds)
}

/** 일일 마감 → 판매+재고 (마감은 판매 기록을 재작성하고 재고를 조정한다) */
export function revalidateClosingData(storeId?: string | null) {
  revalidateSalesData(storeId)
}

/** 재고 알림 규칙 변경 → 매장별+전체 규칙 목록 */
export function revalidateAlertRuleData(storeId?: string | null) {
  revalidateTag(cacheTags.inventoryAlertsAll)
  if (storeId) revalidateTag(cacheTags.inventoryAlerts(storeId))
}

/** 기름 교체 변경 → 매장별+전체 목록/통계 */
export function revalidateOilChangeData(storeId?: string | null) {
  revalidateTag(cacheTags.oilChangesAll)
  if (storeId) revalidateTag(cacheTags.oilChanges(storeId))
}

/** 정비·청소 기록 변경 → 매장별+전체 목록/통계 */
export function revalidateMaintenanceData(storeId?: string | null) {
  revalidateTag(cacheTags.maintenanceAll)
  if (storeId) revalidateTag(cacheTags.maintenance(storeId))
}

/** 직원 변경 → 매장별 직원/활성 직원 목록 (읽기는 storeId 필수라 'all' 태그 불필요) */
export function revalidateEmployeeData(storeId?: string | null) {
  if (storeId) revalidateTag(cacheTags.employees(storeId))
}

/**
 * 출퇴근 변경 → 매장별 출퇴근 목록.
 * (연동 인건비는 fixed-costs 페이지가 revalidatePath로 갱신하므로 여기서 태그 무효화는 불필요)
 */
export function revalidateAttendanceData(storeId?: string | null) {
  if (storeId) revalidateTag(cacheTags.attendance(storeId))
}

/** 조직 플랜/상태 변경 → 플랜 기능 게이트 캐시 (lib/features.ts) */
export function revalidateOrganizationData(orgId?: string | null) {
  revalidateTag(cacheTags.org(orgId))
  revalidateTag(cacheTags.plans)
}

/** 매장(활성 목록) 변경 → 매장 선택 드롭다운 등 */
export function revalidateStoresData() {
  revalidateTag(cacheTags.storesActive)
}
