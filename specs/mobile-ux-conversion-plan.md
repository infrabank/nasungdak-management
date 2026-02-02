# 모바일 UX 전환 계획

> 생성일: 2026-01-13
> 상태: 진행 중

---

## 📊 현재 상태 분석

### 문제점

| 구성요소       | 현재 상태                   | 문제점                                      |
| -------------- | --------------------------- | ------------------------------------------- |
| **네비게이션** | 데스크탑 가로 아코디언 메뉴 | 모바일에서 터치 영역 부족, 메뉴 접근성 낮음 |
| **컨테이너**   | `max-w-7xl` 고정 너비       | 모바일에서 좌우 여백 낭비                   |
| **폼 그리드**  | `sm:grid-cols-6/12`         | 모바일에서 세로 나열되나 최적화 안됨        |
| **입력 필드**  | `py-1.5 text-sm`            | 터치 타겟 44px 미달 (권장)                  |
| **버튼**       | `text-sm px-3 py-2`         | 터치 타겟 작음                              |

---

## ✅ 완료된 페이지

| #   | 페이지         | 파일                                  | 완료일     |
| --- | -------------- | ------------------------------------- | ---------- |
| 1   | 매입 등록      | `purchases/new/purchase-form.tsx`     | 2026-01-12 |
| 2   | 판매 입력      | `sales/daily/sales-form.tsx`          | 2026-01-12 |
| 3   | 기름 교체 등록 | `oil-changes/oil-change-form.tsx`     | 2026-01-12 |
| 4   | 고정비 등록    | `fixed-costs/fixed-cost-form.tsx`     | 2026-01-12 |
| 5   | 토스 매핑 폼   | `toss-mappings/toss-mapping-form.tsx` | 2026-01-12 |

### 적용된 모바일 UI 패턴

- 더 큰 터치 타겟 (`py-3 px-4` inputs)
- 카드 기반 레이아웃 (`rounded-xl shadow-sm ring-1 ring-gray-900/5`)
- 고정된 하단 액션 바 (Cancel/Submit buttons)
- 스티키 총계 표시 (sales-form)
- 이모지 아이콘 (📅, 💰, 📝 등)
- 모바일 우선 수직 스태킹 (`space-y-4`)
- 하단 패딩 (`pb-32`) - 액션 바 오버랩 방지

---

## 📝 변환 대기 페이지

### Phase 1: 목록 페이지 (높은 우선순위)

| #   | 페이지         | 파일                                                   | 상태    |
| --- | -------------- | ------------------------------------------------------ | ------- |
| 1   | 매입 목록      | `purchases/page.tsx` + `purchase-card.tsx`             | ✅ 완료 |
| 2   | 판매 목록      | `sales/page.tsx` + `sales-card.tsx` + `sales-list.tsx` | ✅ 완료 |
| 3   | 기름 교체 목록 | `oil-changes/page.tsx` + `oil-change-card.tsx`         | ✅ 완료 |
| 4   | 고정비 목록    | `fixed-costs/page.tsx` + `fixed-cost-card.tsx`         | ✅ 완료 |

### Phase 2: 관리 페이지 (중간 우선순위)

| #   | 페이지    | 파일                                               | 상태    |
| --- | --------- | -------------------------------------------------- | ------- |
| 5   | 재고 관리 | `inventory/page.tsx` + `inventory-card.tsx`        | ✅ 완료 |
| 6   | 토스 매핑 | `toss-mappings/page.tsx` + `toss-mapping-card.tsx` | ✅ 완료 |
| 7   | 매장 관리 | `stores/page.tsx` + `store-card.tsx`               | ✅ 완료 |

### Phase 3: 기초 데이터 (낮은 우선순위)

| #   | 페이지         | 파일                                    | 상태    |
| --- | -------------- | --------------------------------------- | ------- |
| 8   | 메뉴 관리      | `master-data/menus/page.tsx`            | ⏳ 대기 |
| 9   | 재료 관리      | `master-data/ingredients/page.tsx`      | ⏳ 대기 |
| 10  | SKU 관리       | `master-data/skus/page.tsx`             | ⏳ 대기 |
| 11  | 메뉴-재료 매핑 | `master-data/menu-ingredients/page.tsx` | ⏳ 대기 |
| 12  | 원가 배분 규칙 | `master-data/cost-rules/page.tsx`       | ⏳ 대기 |

### Phase 4: 기타 페이지

| #   | 페이지     | 파일                 | 상태    |
| --- | ---------- | -------------------- | ------- |
| 13  | 기간 분석  | `analysis/page.tsx`  | ⏳ 대기 |
| 14  | 대시보드   | `dashboard/page.tsx` | ⏳ 대기 |
| 15  | 네비게이션 | `accordion-menu.tsx` | ⏳ 대기 |

---

## 🎨 목록 페이지 변환 패턴

### Before (데스크탑 테이블)

```
┌────────────────────────────────────────────────────────┐
│ 날짜     │ 메뉴   │ 재료   │ 수량 │ 단가   │ 합계    │
├──────────┼────────┼────────┼──────┼────────┼─────────│
│ 01/12    │ 닭강정 │ 닭     │ 10   │ 5,000  │ 50,000  │
└────────────────────────────────────────────────────────┘
```

### After (모바일 카드)

```
┌─────────────────────────────┐
│ 📅 2026-01-12               │
│ 닭강정 → 닭                 │
│                             │
│ 수량: 10          금액      │
│ 단가: ₩5,000     ₩50,000   │
│                    [수정]   │
└─────────────────────────────┘
```

### CSS 클래스 가이드

```css
/* 입력 필드 */
inputClass = 'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600'

/* Select */
selectClass = 'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 appearance-none bg-white'

/* 레이블 */
labelClass = 'block text-sm font-medium text-gray-700 mb-2'

/* 카드 */
cardClass = 'bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4 mb-4'

/* 하단 고정 액션 바 */
actionBarClass = 'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20'
```

---

## 📐 공통 컴포넌트 계획

| 컴포넌트          | 설명                   | 우선순위 |
| ----------------- | ---------------------- | -------- |
| `MobileCard`      | 목록 아이템용 카드     | 높음     |
| `MobileListPage`  | 목록 페이지 레이아웃   | 높음     |
| `MobileFilterBar` | 필터 드로어/모달       | 중간     |
| `MobileNav`       | 햄버거 메뉴 네비게이션 | 중간     |
| `SwipeActions`    | 스와이프 삭제/수정     | 낮음     |

---

## 📋 실행 순서

1. **1단계: 매입 목록 페이지** (`purchases/page.tsx`)
2. **2단계: 판매 목록 페이지** (`sales/page.tsx`)
3. **3단계: 나머지 목록 페이지들** (기름 교체, 고정비, 재고, 토스 매핑, 매장)
4. **4단계: 기초 데이터 페이지들** (메뉴, 재료, SKU 등)
5. **5단계: 네비게이션 & 대시보드**

---

## 📝 작업 로그

| 날짜       | 작업 내용                            | 결과    |
| ---------- | ------------------------------------ | ------- |
| 2026-01-12 | 폼 페이지 5개 모바일 UI 적용         | ✅ 완료 |
| 2026-01-13 | 계획 문서 작성                       | ✅ 완료 |
| 2026-01-13 | 매입 목록 페이지 모바일 UI 변환      | ✅ 완료 |
| 2026-01-13 | 판매 목록 페이지 모바일 UI 변환      | ✅ 완료 |
| 2026-01-13 | 기름 교체 목록 페이지 모바일 UI 변환 | ✅ 완료 |
| 2026-01-13 | 고정비 목록 페이지 모바일 UI 변환    | ✅ 완료 |
| 2026-01-13 | 재고 관리 페이지 모바일 UI 변환      | ✅ 완료 |
| 2026-01-13 | 토스 매핑 페이지 모바일 UI 변환      | ✅ 완료 |
| 2026-01-13 | 매장 관리 페이지 모바일 UI 변환      | ✅ 완료 |
