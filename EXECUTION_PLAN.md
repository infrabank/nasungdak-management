# Execution Plan: Performance Improvements

## 1. 문서 목적과 범위
- 목적: 본 문서는 구현 단계에서 설계 변경 없이 그대로 따라야 하는 실행 기준 문서다.
- 범위: Next.js 15 App Router 기반 대시보드 전반의 렌더링 방식, 캐싱, 클라이언트 fetch 제거에 대한 합의된 개선 사항만 포함한다.

## 2. 전체 작업 원칙 (변경 금지 사항 포함)
- 해야 할 것
  - 이 문서의 체크리스트를 그대로 이행한다.
  - 코드 변경 전후에 빌드/린트/타입체크를 수행한다.
  - 캐싱과 revalidation은 명시된 키/태그 전략을 준수한다.
- 하지 말 것
  - 본 문서에 없는 새로운 최적화 아이디어를 추가하지 않는다.
  - 기존 설계 의도를 변경하거나 재해석하지 않는다.
  - 강제적으로 동작 방식을 바꾸는 리팩터링을 포함하지 않는다.

## 3. 작업 범위 요약
- force-dynamic 제거 대상 페이지/레이아웃 정리 및 제거
- unstable_cache 적용 대상 서버 함수에 캐싱/태그 설계 적용
- row/card 내부 client fetch 제거 및 서버 데이터 전달로 대체
- Optional 항목은 후순위로 분리하여 별도 작업으로 취급

## 4. Phase 1: force-dynamic 제거 계획
### 대상 파일 목록
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/sales/page.tsx`
- `app/dashboard/purchases/page.tsx`
- `app/dashboard/inventory/page.tsx`
- `app/dashboard/master-data/menus/page.tsx`
- `app/dashboard/master-data/ingredients/page.tsx`
- `app/dashboard/master-data/skus/page.tsx`
- `app/dashboard/master-data/menu-ingredients/page.tsx`
- `app/dashboard/master-data/cost-rules/page.tsx`
- `app/dashboard/master-data/suppliers/page.tsx`
- `app/dashboard/stores/page.tsx`
- `app/dashboard/toss-mappings/page.tsx`
- `app/dashboard/oil-changes/page.tsx`
- `app/dashboard/fixed-costs/page.tsx`

### 제거 근거
- 해당 페이지/레이아웃은 서버 데이터 조회 중심이며 캐싱과 revalidation으로 충분히 최신성을 보장할 수 있다.

### 선행 조건
- Phase 2의 캐싱 및 revalidation 설계가 적용되어야 한다.

### 리스크
- 캐시 무효화가 누락되면 데이터가 오래 보일 수 있다.

## 5. Phase 2: unstable_cache 적용 계획
### 캐싱 대상 함수
- `app/dashboard/actions.ts`
  - `getDashboardStats()`
- `app/dashboard/analysis/actions.ts`
  - `getAnalysis(startDate, endDate, storeId)`
  - `getMonthlyAnalysis(startDate, endDate, storeId)`
- `app/dashboard/sales/actions.ts`
  - `getSalesRecords(startDate, endDate, skuId, storeId)`
  - `getSKUsForFilter()`
  - `getActiveSKUs()`
- `app/dashboard/purchases/actions.ts`
  - `getPurchases(startDate, endDate, menuId, ingredientId, storeId)`
  - `getMenusForFilter()`
  - `getIngredientsForFilter()`
- `app/dashboard/inventory/actions.ts`
  - `getInventory(storeId)`
  - `getAlertRules(storeId)`
- `app/dashboard/stores/actions.ts`
  - `getActiveStores()`

### cache key 설계
- `getDashboardStats()`
  - `['dashboard:stats', startDate, endDate]`
- `getAnalysis()`
  - `['analysis:sku', startDate, endDate, storeId ?? 'all']`
- `getMonthlyAnalysis()`
  - `['analysis:monthly', startDate, endDate, storeId ?? 'all']`
- `getSalesRecords()`
  - `['sales:list', startDate, endDate, skuId ?? 'all', storeId ?? 'all']`
- `getSKUsForFilter()`
  - `['skus:filter']`
- `getActiveSKUs()`
  - `['skus:active']`
- `getPurchases()`
  - `['purchases:list', startDate, endDate, menuId ?? 'all', ingredientId ?? 'all', storeId ?? 'all']`
- `getMenusForFilter()`
  - `['menus:active']`
- `getIngredientsForFilter()`
  - `['ingredients:active']`
- `getInventory()`
  - `['inventory:list', storeId ?? 'all']`
- `getAlertRules()`
  - `['inventory:alerts', storeId ?? 'all']`
- `getActiveStores()`
  - `['stores:active']`

### revalidation tag 설계
- `dashboard:stats`
- `analysis:sku`
- `analysis:monthly`
- `purchases:${storeId ?? 'all'}`
- `sales:${storeId ?? 'all'}`
- `cost-rules:${storeId ?? 'all'}`
- `fixed-costs:${storeId ?? 'all'}`
- `skus:active`
- `skus:filter`
- `menus:active`
- `ingredients:active`
- `inventory:${storeId ?? 'all'}`
- `inventory:alerts:${storeId ?? 'all'}`
- `stores:active`

### 어떤 action에서 revalidateTag를 호출하는지
- `app/dashboard/purchases/actions.ts`
  - 구매 생성/수정/삭제/검증토글/일괄 등록 시
  - 호출 태그: `purchases:${storeId ?? 'all'}`, `dashboard:stats`, `analysis:sku`, `analysis:monthly`
- `app/dashboard/sales/actions.ts`
  - 판매 생성/수정/삭제/일괄 등록 시
  - 호출 태그: `sales:${storeId ?? 'all'}`, `dashboard:stats`, `analysis:sku`, `analysis:monthly`
- `app/dashboard/master-data/cost-rules/actions.ts`
  - 규칙 생성/수정/삭제 시
  - 호출 태그: `cost-rules:${storeId ?? 'all'}`, `dashboard:stats`, `analysis:sku`, `analysis:monthly`
- `app/dashboard/fixed-costs/actions.ts`
  - 고정비 생성/수정/삭제 시
  - 호출 태그: `fixed-costs:${storeId ?? 'all'}`, `analysis:sku`, `analysis:monthly`
- `app/dashboard/inventory/actions.ts`
  - 재고/이벤트/알림규칙 변경 시
  - 호출 태그: `inventory:${storeId ?? 'all'}`, `inventory:alerts:${storeId ?? 'all'}`
- `app/dashboard/master-data/menus/actions.ts`
  - 메뉴 변경 시
  - 호출 태그: `menus:active`
- `app/dashboard/master-data/ingredients/actions.ts`
  - 재료 변경 시
  - 호출 태그: `ingredients:active`
- `app/dashboard/master-data/skus/actions.ts`
  - SKU 변경 시
  - 호출 태그: `skus:active`, `skus:filter`
- `app/dashboard/stores/actions.ts`
  - 매장 변경 시
  - 호출 태그: `stores:active`

## 6. Phase 3: row/card 내부 client fetch 제거 계획
### 대상 컴포넌트
- `app/dashboard/purchases/purchase-row.tsx`
- `app/dashboard/purchases/purchase-card.tsx`
- `app/dashboard/sales/sales-row.tsx`
- `app/dashboard/sales/sales-card.tsx`

### 서버에서 내려줄 데이터
- 구매 편집용
  - `menus` (활성 메뉴 목록)
  - `ingredients` (활성 재료 목록)
- 판매 편집용
  - `skuList` (활성 SKU 목록)

### 제거되는 client fetch 목록
- `getMenus()` 호출 제거 (`purchase-row.tsx`, `purchase-card.tsx`)
- `getIngredients()` 호출 제거 (`purchase-row.tsx`, `purchase-card.tsx`)
- `getActiveSKUs()` 호출 제거 (`sales-row.tsx`, `sales-card.tsx`)

## 7. Optional (후순위): 별도 작업으로 분리된 항목
- `app/dashboard/purchases/new/purchase-form.tsx`
  - lookup 데이터 `useEffect` fetch 제거 후 서버에서 전달
- `app/dashboard/sales/daily/sales-form.tsx`
  - SKU 목록 `useEffect` fetch 제거 후 서버에서 전달

## 8. 구현 순서 및 PR 분리 전략
- PR 1: Phase 2 (unstable_cache + revalidateTag) 적용
- PR 2: Phase 1 (force-dynamic 제거) 적용
- PR 3: Phase 3 (row/card client fetch 제거) 적용
- Optional PR: Phase 7 항목 분리 적용

## 9. 검증 기준 (빌드, 동작, 성능 관점)
- 빌드/품질
  - `npm run type-check`
  - `npm run lint`
  - `npm run format`
- 동작 검증
  - 각 페이지 진입 시 데이터 로딩 정상
  - CRUD 이후 즉시 데이터 반영 (revalidateTag 확인)
- 성능 관점
  - 동일 페이지 반복 접근 시 TTFB 감소
  - 대시보드/분석 페이지 초기 로딩 체감 개선
