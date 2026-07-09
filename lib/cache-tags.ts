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
} as const

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
