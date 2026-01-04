# Implementation Tasks: Purchase, Sales, and Cost Management System

**Feature Branch**: `1-purchase-sales-management`
**Specification**: [spec.md](spec.md)
**Implementation Plan**: [plan.md](plan.md)
**Generated**: 2026-01-04

## Summary

This task list implements a web-based purchase, sales, and cost management system to replace an Excel workflow for a fried chicken restaurant. Tasks are organized by user story to enable independent implementation and testing.

**Technology Stack**: Next.js 15, Drizzle ORM, Vercel Postgres, Tailwind CSS, Framer Motion

**User Stories** (from spec.md):
- **US1 (P1)**: Record Purchase Transactions
- **US2 (P1)**: Record Daily Sales Quantities
- **US3 (P2)**: View Period-Based Cost and Margin Analysis
- **US4 (P3)**: Manage Menu and Ingredient Master Data

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Deliver First**: User Story 1 (US1) - Purchase Transaction Management
- Complete database setup
- Purchase entry with validation
- Purchase history view
- This delivers immediate value: digitize purchase tracking

**Then**: User Story 2 (US2) - Sales Management
**Then**: User Story 3 (US3) - Period Analysis (core business value)
**Finally**: User Story 4 (US4) - Master Data Management (can use static data initially)

### Parallel Execution Opportunities

Tasks marked with **[P]** can be executed in parallel with other **[P]** tasks in the same phase, as they work on different files with no dependencies.

---

## Phase 1: Project Setup & Infrastructure

**Goal**: Initialize Next.js project with all required dependencies and basic configuration.

**Dependencies**: None (blocking tasks for all user stories)

### Tasks

- [ ] T001 Initialize Next.js 15 project with TypeScript and App Router in repository root
- [ ] T002 [P] Install and configure Tailwind CSS with custom theme in tailwind.config.ts
- [ ] T003 [P] Install Drizzle ORM dependencies (@drizzle-team/drizzle-orm, drizzle-kit, @vercel/postgres)
- [ ] T004 [P] Install form dependencies (react-hook-form, zod, @hookform/resolvers)
- [ ] T005 [P] Install Framer Motion for animations
- [ ] T006 [P] Install date-fns for date handling with Korean locale
- [ ] T007 Configure Drizzle ORM in drizzle.config.ts with Vercel Postgres connection
- [ ] T008 Setup environment variables template in .env.example
- [ ] T009 Create Next.js middleware for session validation in app/middleware.ts
- [ ] T010 Setup Vercel Postgres database via Vercel CLI or dashboard
- [ ] T011 [P] Configure ESLint and Prettier for code quality
- [ ] T012 [P] Setup Vitest for unit/integration testing in vitest.config.ts
- [ ] T013 [P] Setup Playwright for E2E testing in playwright.config.ts
- [ ] T014 Create project directory structure per plan.md (app/, components/, lib/, etc.)

**Completion Criteria**:
- ✅ `npm run dev` starts development server successfully
- ✅ Tailwind CSS styles apply correctly
- ✅ Database connection string configured in `.env.local`
- ✅ All directories from plan.md exist

---

## Phase 2: Foundational Layer

**Goal**: Create shared infrastructure that ALL user stories depend on.

**Dependencies**: Phase 1 must be complete

### Tasks

- [ ] T015 Define database schema in lib/db/schema.ts (all 7 tables from data-model.md)
- [ ] T016 Create initial migration in drizzle/0000_initial_schema.sql
- [ ] T017 Run database migration to create all tables and indexes
- [ ] T018 Create database client in lib/db/index.ts with connection pooling
- [ ] T019 [P] Create shared Zod validation schemas in lib/utils/validation.ts
- [ ] T020 [P] Create currency formatting utility in lib/utils/format.ts (Korean Won)
- [ ] T021 [P] Create date formatting utility in lib/utils/format.ts (Korean locale)
- [ ] T022 [P] Create Tailwind class merger utility in lib/utils/cn.ts
- [ ] T023 [P] Create base UI components in components/ui/ (button, input, select, table, card)
- [ ] T024 [P] Create root layout in app/layout.tsx with font and global styles
- [ ] T025 [P] Create global styles in app/globals.css with Tailwind directives
- [ ] T026 Implement session management in lib/auth/session.ts using Vercel KV
- [ ] T027 Create login page in app/(auth)/login/page.tsx
- [ ] T028 Implement login Server Action for password validation
- [ ] T029 Create dashboard layout in app/(dashboard)/layout.tsx with navigation
- [ ] T030 [P] Create navigation component in components/layout/nav.tsx (responsive)
- [ ] T031 [P] Create mobile navigation in components/layout/mobile-nav.tsx
- [ ] T032 Create dashboard home page in app/(dashboard)/page.tsx with summary stats
- [ ] T033 Create seed script in scripts/seed.ts for initial master data from Excel
- [ ] T034 Create Excel import script in scripts/import-excel.ts
- [ ] T035 Run seed script to populate menu_categories, ingredients, menu_ingredients, skus, cost_distribution_rules

**Completion Criteria**:
- ✅ Database has all 7 tables with correct schema
- ✅ User can log in and see dashboard
- ✅ Master data (menus, ingredients, SKUs) exists in database
- ✅ Base UI components render correctly
- ✅ Navigation works on mobile, tablet, desktop

---

## Phase 3: User Story 1 (P1) - Purchase Transaction Management

**Story Goal**: Operators can record purchase transactions with automatic menu-ingredient validation and view cumulative history.

**Independent Test**: Create a purchase transaction with valid menu/ingredient combination, verify it appears in history with "OK" validation status. Create one with invalid combination, verify "부적합" warning.

**Dependencies**: Phase 2 (Foundational) must be complete

### Tasks

#### Database & Models

- [ ] T036 [US1] Verify purchase_transactions table has validation trigger from migration

#### Purchase Entry Form

- [ ] T037 [P] [US1] Create purchase form component in components/forms/purchase-form.tsx
- [ ] T038 [P] [US1] Create purchase entry validation schema in lib/utils/validation.ts (Zod)
- [ ] T039 [US1] Create purchase entry page in app/(dashboard)/purchases/new/page.tsx
- [ ] T040 [US1] Implement createPurchase Server Action in app/(dashboard)/purchases/actions.ts
- [ ] T041 [US1] Add real-time menu-ingredient validation in purchase form (fetch menu_ingredients)
- [ ] T042 [US1] Display validation status (OK/부적합) in purchase form

#### Purchase History View

- [ ] T043 [P] [US1] Create purchase list query in lib/db/queries/purchases.ts with pagination
- [ ] T044 [US1] Create purchase history page in app/(dashboard)/purchases/page.tsx
- [ ] T045 [US1] Implement date range filter for purchase history
- [ ] T046 [US1] Implement menu filter for purchase history
- [ ] T047 [P] [US1] Add pagination controls to purchase history table

#### Edit & Delete

- [ ] T048 [P] [US1] Create edit purchase page in app/(dashboard)/purchases/[id]/edit/page.tsx
- [ ] T049 [US1] Implement updatePurchase Server Action in app/(dashboard)/purchases/actions.ts
- [ ] T050 [US1] Implement deletePurchase Server Action in app/(dashboard)/purchases/actions.ts
- [ ] T051 [US1] Add edit/delete buttons to purchase history table

#### Integration

- [ ] T052 [US1] Add purchase navigation link to main menu
- [ ] T053 [US1] Test complete purchase flow: create → view in history → edit → delete
- [ ] T054 [US1] Verify validation trigger marks invalid menu-ingredient combinations

**Parallel Opportunities within US1**:
- T037, T038 (form component + validation schema)
- T043, T048 (list query + edit page)

**Story Completion Criteria**:
- ✅ Operator can enter purchase in <30 seconds
- ✅ Invalid menu/ingredient combos show "부적합" warning
- ✅ All purchases appear in history with correct totals
- ✅ Can filter history by date range and menu
- ✅ Can edit/delete historical purchases
- ✅ Works on mobile (375px+), tablet, desktop

---

## Phase 4: User Story 2 (P1) - Sales Management

**Story Goal**: Operators can enter daily sales quantities for all SKUs and view cumulative sales history with automatic revenue calculation.

**Independent Test**: Enter daily sales quantities for 5 SKUs, verify system calculates revenue as (quantity × price) for each SKU and displays total daily revenue. View sales history showing all entries.

**Dependencies**: Phase 2 (Foundational) must be complete. Independent of US1.

### Tasks

#### Database & Models

- [ ] T055 [US2] Verify sales_records table and SKU pricing structure from migration

#### Daily Sales Entry Form

- [ ] T056 [P] [US2] Create sales form component in components/forms/sales-form.tsx (all SKUs on one page)
- [ ] T057 [P] [US2] Create sales entry validation schema in lib/utils/validation.ts (Zod)
- [ ] T058 [US2] Create daily sales entry page in app/(dashboard)/sales/daily/page.tsx
- [ ] T059 [US2] Fetch all active SKUs with prices for sales form
- [ ] T060 [US2] Implement saveDailySales Server Action in app/(dashboard)/sales/actions.ts (bulk upsert)
- [ ] T061 [US2] Calculate and display daily revenue preview in sales form (quantity × price per SKU)

#### Sales History View

- [ ] T062 [P] [US2] Create sales list query in lib/db/queries/sales.ts with pagination
- [ ] T063 [US2] Create sales history page in app/(dashboard)/sales/page.tsx
- [ ] T064 [US2] Display quantity, price, and calculated revenue per SKU in history
- [ ] T065 [US2] Implement date range filter for sales history
- [ ] T066 [US2] Implement SKU filter for sales history
- [ ] T067 [P] [US2] Add pagination controls to sales history table

#### Integration

- [ ] T068 [US2] Add sales navigation link to main menu
- [ ] T069 [US2] Test complete sales flow: enter daily sales → view in history → verify revenue calculations
- [ ] T070 [US2] Verify upsert logic (updating existing date's sales vs creating new)

**Parallel Opportunities within US2**:
- T056, T057 (form component + validation schema)
- T062 (sales query - independent of form)

**Story Completion Criteria**:
- ✅ Operator can enter daily sales for all SKUs in <2 minutes
- ✅ System calculates revenue automatically (quantity × price)
- ✅ Sales history shows all entries with revenue
- ✅ Can filter history by date range and SKU
- ✅ Updating same date's sales uses upsert (no duplicates)
- ✅ Works on mobile, tablet, desktop

---

## Phase 5: User Story 3 (P2) - Period Cost & Margin Analysis

**Story Goal**: Operators can select a date range and view automated cost/margin analysis showing purchase costs, allocated costs (via distribution %), revenue, and profit margins by menu.

**Independent Test**: Enter start date "2025-12-01" and end date "2025-12-31". Verify system displays: (1) purchase costs by menu, (2) allocated costs using distribution percentages, (3) revenue by menu, (4) margin percentages calculated as (revenue - allocated cost) / revenue.

**Dependencies**: Phase 2 (Foundational) must be complete. US1 and US2 provide data but US3 can be implemented independently (works with any purchase/sales data).

### Tasks

#### Analysis Queries

- [ ] T071 [P] [US3] Create purchase cost query in lib/db/queries/analysis.ts (SUM by menu for date range)
- [ ] T072 [P] [US3] Create revenue query in lib/db/queries/analysis.ts (SUM quantity × price by menu)
- [ ] T073 [US3] Create margin analysis query in lib/db/queries/analysis.ts (combines costs + revenue + distribution %)
- [ ] T074 [US3] Add distribution percentage validation (must sum to 100%)

#### Analysis Dashboard

- [ ] T075 [P] [US3] Create date range selector component (date picker with start/end dates)
- [ ] T076 [US3] Create analysis dashboard page in app/(dashboard)/analysis/page.tsx
- [ ] T077 [US3] Display purchase costs table by menu for selected period
- [ ] T078 [US3] Display cost allocation table with distribution percentages
- [ ] T079 [US3] Display revenue table by menu for selected period
- [ ] T080 [US3] Display margin analysis table (revenue, cost, profit, margin %)
- [ ] T081 [P] [US3] Add summary cards (total purchases, total revenue, overall margin)
- [ ] T082 [P] [US3] Add visual charts for margin comparison (optional, using Chart.js or Recharts)

#### Integration

- [ ] T083 [US3] Add analysis navigation link to main menu
- [ ] T084 [US3] Test analysis flow: select period → verify calculations match Excel formulas
- [ ] T085 [US3] Verify distribution % validation prevents calculation if sum ≠ 100%

**Parallel Opportunities within US3**:
- T071, T072 (purchase query + revenue query - independent)
- T075, T081, T082 (UI components - independent of main page)

**Story Completion Criteria**:
- ✅ Analysis displays for any date range in <3 seconds
- ✅ Purchase costs correctly grouped by menu
- ✅ Cost allocation applies distribution percentages correctly
- ✅ Margin percentages calculated accurately
- ✅ System validates distribution % sums to 100%
- ✅ Reduces analysis time from 2+ hours to <10 minutes
- ✅ Works on mobile, tablet, desktop

---

## Phase 6: User Story 4 (P3) - Master Data Management

**Story Goal**: Operators can manage menu categories, ingredients, menu-ingredient relationships, SKU prices/conversions, and cost distribution percentages.

**Independent Test**: Add new menu "신메뉴" with 3 ingredients. Create SKU "신메뉴_봉" with conversion factor 1.5 and price ₩15,000. Verify: (1) purchase entry validates new menu-ingredient combos, (2) sales form shows new SKU, (3) revenue calculates using new price.

**Dependencies**: Phase 2 (Foundational) must be complete. Independent of US1, US2, US3 (but enhances them).

### Tasks

#### Menu Category Management

- [ ] T086 [P] [US4] Create menu form component in components/forms/menu-form.tsx
- [ ] T087 [P] [US4] Create menu validation schema in lib/utils/validation.ts
- [ ] T088 [US4] Create menu management page in app/(dashboard)/master-data/menus/page.tsx
- [ ] T089 [US4] Implement createMenu Server Action in app/(dashboard)/master-data/menus/actions.ts
- [ ] T090 [US4] Implement updateMenu Server Action (including soft delete via is_active)
- [ ] T091 [US4] Add inline create/edit UI for menus

#### Ingredient Management

- [ ] T092 [P] [US4] Create ingredient form component in components/forms/ingredient-form.tsx
- [ ] T093 [P] [US4] Create ingredient validation schema in lib/utils/validation.ts
- [ ] T094 [US4] Create ingredient management page in app/(dashboard)/master-data/ingredients/page.tsx
- [ ] T095 [US4] Implement createIngredient Server Action in app/(dashboard)/master-data/ingredients/actions.ts
- [ ] T096 [US4] Implement updateIngredient Server Action
- [ ] T097 [US4] Add inline create/edit UI for ingredients

#### Menu-Ingredient Relationships

- [ ] T098 [P] [US4] Create menu-ingredient matrix view component
- [ ] T099 [US4] Create menu-ingredient management page in app/(dashboard)/master-data/menu-ingredients/page.tsx
- [ ] T100 [US4] Implement linkMenuIngredient Server Action in app/(dashboard)/master-data/menu-ingredients/actions.ts
- [ ] T101 [US4] Implement unlinkMenuIngredient Server Action
- [ ] T102 [US4] Display matrix showing which ingredients are valid for each menu

#### SKU Management (Prices + Conversions)

- [ ] T103 [P] [US4] Create SKU form component in components/forms/sku-form.tsx
- [ ] T104 [P] [US4] Create SKU validation schema in lib/utils/validation.ts (price > 0, conversion > 0)
- [ ] T105 [US4] Create SKU management page in app/(dashboard)/master-data/skus/page.tsx
- [ ] T106 [US4] Implement createSku Server Action in app/(dashboard)/master-data/skus/actions.ts
- [ ] T107 [US4] Implement updateSku Server Action (update price and/or conversion factor)
- [ ] T108 [US4] Display SKUs with menu, price, conversion factor, and description

#### Cost Distribution Rules

- [ ] T109 [P] [US4] Create distribution rules form component (editable table)
- [ ] T110 [P] [US4] Create distribution validation schema (sum must equal 100%)
- [ ] T111 [US4] Create distribution management page in app/(dashboard)/master-data/cost-distribution/page.tsx
- [ ] T112 [US4] Implement updateDistributionRules Server Action (batch update) in actions.ts
- [ ] T113 [US4] Display real-time validation of percentage sum in UI

#### Integration

- [ ] T114 [US4] Add master data navigation menu with sub-items (menus, ingredients, etc.)
- [ ] T115 [US4] Test master data flow: add menu + ingredients → link them → create SKU → verify in purchase/sales forms
- [ ] T116 [US4] Verify changes to master data reflect immediately in purchase/sales pages

**Parallel Opportunities within US4**:
- T086-T087, T092-T093, T098, T103-T104, T109-T110 (all form components + validation schemas)
- T088, T094, T099, T105, T111 (all management pages - work on different routes)

**Story Completion Criteria**:
- ✅ Can add/edit/delete menus, ingredients, SKUs
- ✅ Can link/unlink menu-ingredient relationships
- ✅ Can update SKU prices and conversion factors
- ✅ Can update cost distribution percentages
- ✅ Distribution % validation prevents save if sum ≠ 100%
- ✅ Changes immediately visible in purchase/sales forms
- ✅ Works on mobile, tablet, desktop

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Final touches for production readiness - responsive design, animations, error handling, loading states.

**Dependencies**: All user stories (US1-US4) complete

### Tasks

#### Responsive Design

- [ ] T117 [P] Optimize mobile layout for purchase form (single column, larger touch targets)
- [ ] T118 [P] Optimize mobile layout for sales form (scrollable SKU list)
- [ ] T119 [P] Optimize mobile layout for analysis dashboard (stacked tables)
- [ ] T120 [P] Test all pages on mobile (375px), tablet (768px), desktop (1024px+)
- [ ] T121 [P] Ensure minimum 44px touch targets for all buttons on mobile

#### Animations & Transitions

- [ ] T122 [P] Add page transition animations using Framer Motion (fade in/out)
- [ ] T123 [P] Add form submission loading states with spinners
- [ ] T124 [P] Add skeleton screens for data loading states
- [ ] T125 [P] Add toast notifications for success/error messages (Korean)

#### Error Handling

- [ ] T126 [P] Implement global error boundary in app/error.tsx
- [ ] T127 [P] Add user-friendly error messages in Korean for all Server Actions
- [ ] T128 [P] Handle network errors gracefully with retry options
- [ ] T129 [P] Display validation errors inline on forms with clear guidance

#### Performance Optimization

- [ ] T130 [P] Add database query indexes (already in schema, verify performance)
- [ ] T131 [P] Implement server component caching for master data (revalidate: 300)
- [ ] T132 [P] Lazy load Framer Motion using dynamic imports
- [ ] T133 [P] Optimize Tailwind CSS bundle size (purge unused classes)
- [ ] T134 [P] Test page load performance on 3G network (target <1.5s FCP)

#### Documentation

- [ ] T135 [P] Create user guide in Korean (PDF or markdown)
- [ ] T136 [P] Document deployment process in quickstart.md (if not already complete)
- [ ] T137 [P] Create operator training materials (screenshots + workflow)

**Completion Criteria**:
- ✅ All pages responsive on mobile/tablet/desktop
- ✅ Smooth animations without performance impact
- ✅ User-friendly error messages in Korean
- ✅ Page loads in <1.5s on 3G
- ✅ User documentation complete

---

## Phase 8: Testing & Quality Assurance

**Goal**: Ensure quality through automated tests and manual QA.

**Dependencies**: All phases complete

### Tasks

#### Unit Tests

- [ ] T138 [P] Write unit tests for currency formatting utility (format.ts)
- [ ] T139 [P] Write unit tests for date formatting utility (format.ts)
- [ ] T140 [P] Write unit tests for Zod validation schemas (validation.ts)
- [ ] T141 [P] Write unit tests for margin calculation logic

#### Integration Tests

- [ ] T142 [P] Write integration test for createPurchase Server Action (with test DB)
- [ ] T143 [P] Write integration test for saveDailySales Server Action (upsert logic)
- [ ] T144 [P] Write integration test for margin analysis query (verify calculations)
- [ ] T145 [P] Write integration test for distribution % validation

#### E2E Tests

- [ ] T146 [P] Write E2E test for purchase flow (login → create → view history)
- [ ] T147 [P] Write E2E test for sales flow (login → daily entry → view history)
- [ ] T148 [P] Write E2E test for analysis flow (login → select period → view report)
- [ ] T149 [P] Write E2E test for master data flow (login → add menu → create SKU)

#### Manual QA

- [ ] T150 Test on real mobile devices (iOS Safari, Android Chrome)
- [ ] T151 Test on tablets (iPad Safari, Android tablets)
- [ ] T152 Perform accessibility audit (keyboard navigation, screen reader)
- [ ] T153 Test with real data (import from Excel, verify calculations match)
- [ ] T154 Load test with 1 year of data (verify <500ms query times)

**Completion Criteria**:
- ✅ 80%+ test coverage for utilities and business logic
- ✅ All E2E tests pass on mobile, tablet, desktop
- ✅ Manual QA checklist complete
- ✅ Accessibility meets WCAG 2.1 AA standards

---

## Phase 9: Deployment & Production Readiness

**Goal**: Deploy to Vercel production and prepare for user launch.

**Dependencies**: All phases complete, all tests passing

### Tasks

#### Deployment Setup

- [ ] T155 Create Vercel project and link to Git repository
- [ ] T156 Configure environment variables in Vercel dashboard (Postgres, auth, KV)
- [ ] T157 Deploy to Vercel preview environment for final testing
- [ ] T158 Run database migrations on production database
- [ ] T159 Run Excel import script to load historical data
- [ ] T160 Verify all functionality in production environment

#### Security & Monitoring

- [ ] T161 [P] Set production password and hash in AUTH_PASSWORD_HASH env var
- [ ] T162 [P] Enable Vercel Web Analytics for performance monitoring
- [ ] T163 [P] Setup error tracking (Sentry or alternative)
- [ ] T164 [P] Configure database backup schedule (daily snapshots)

#### User Onboarding

- [ ] T165 Conduct operator training session (2-3 users)
- [ ] T166 Create training environment with test data
- [ ] T167 Provide user guide and quick reference materials
- [ ] T168 Setup support channel for user questions

#### Launch

- [ ] T169 Deploy to production (merge to main branch)
- [ ] T170 Monitor first week of production usage
- [ ] T171 Collect user feedback and create backlog for v2

**Completion Criteria**:
- ✅ Application deployed to Vercel production
- ✅ Historical data imported successfully
- ✅ All operators trained and onboarded
- ✅ Monitoring and error tracking active
- ✅ Zero critical bugs in first week

---

## Dependency Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
    ├─→ Phase 3 (US1: Purchases) ────────┐
    ├─→ Phase 4 (US2: Sales) ────────────┼─→ Phase 7 (Polish) ─→ Phase 8 (Testing) ─→ Phase 9 (Deploy)
    ├─→ Phase 5 (US3: Analysis) ─────────┤
    └─→ Phase 6 (US4: Master Data) ──────┘
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 7 → Phase 8 → Phase 9

**Parallel Execution**: Phases 3, 4, 5, 6 can be developed independently after Phase 2 is complete.

---

## Parallel Execution Examples

### Within Phase 2 (Foundational):
- T019-T022 (all utilities - independent files)
- T023-T025 (UI components + styles - independent)
- T030-T031 (navigation components - independent)

### Within Phase 3 (US1):
```
Start together:
- T037 (purchase form component)
- T038 (validation schema)
- T043 (list query)

Then in parallel:
- T039-T042 (form page + actions)
- T044-T047 (history page + filters)
- T048-T050 (edit/delete pages + actions)
```

### Across User Stories:
```
After Phase 2 complete, start in parallel:
- Team A: Phase 3 (US1 - Purchases)
- Team B: Phase 4 (US2 - Sales)
- Team C: Phase 5 (US3 - Analysis)
- Team D: Phase 6 (US4 - Master Data)
```

---

## Task Summary

**Total Tasks**: 171
**Breakdown by Phase**:
- Phase 1 (Setup): 14 tasks
- Phase 2 (Foundational): 21 tasks
- Phase 3 (US1 - Purchases): 19 tasks
- Phase 4 (US2 - Sales): 16 tasks
- Phase 5 (US3 - Analysis): 15 tasks
- Phase 6 (US4 - Master Data): 31 tasks
- Phase 7 (Polish): 21 tasks
- Phase 8 (Testing): 17 tasks
- Phase 9 (Deployment): 17 tasks

**Tasks with [P] (Parallel)**: 68 tasks (40%)
**Tasks with [US#] (Story-specific)**: 81 tasks

**Estimated Completion Time** (single developer):
- MVP (US1): ~3-4 weeks
- MVP + US2 + US3: ~6-8 weeks
- Full system (US1-US4 + Polish): ~10-12 weeks

---

## Independent Test Criteria by User Story

### US1 (Purchases)
✅ Create purchase with menu "양념치킨" + ingredient "닭다리살" → validation shows "OK"
✅ Create purchase with invalid combo → validation shows "부적합"
✅ View purchase history → all entries display with calculated totals
✅ Filter by date range → only matching records shown
✅ Edit purchase → changes saved and visible in history

### US2 (Sales)
✅ Enter sales: 양념치킨_봉 (15 qty) at ₩15,000 → revenue shows ₩225,000
✅ View sales history → all daily entries shown with revenue
✅ Re-enter same date → upsert updates instead of creating duplicate
✅ Filter by SKU → only selected SKU's sales shown

### US3 (Analysis)
✅ Select period 2025-12-01 to 2025-12-31 → analysis displays
✅ Purchase costs grouped by menu → totals match
✅ Distribution % (양념치킨: 40%, 순살치킨: 25%) applied → allocated costs correct
✅ Margin % calculated as (revenue - cost) / revenue → percentages accurate
✅ Change distribution % to sum ≠ 100% → system prevents calculation

### US4 (Master Data)
✅ Add menu "신메뉴" → appears in menu list and purchase form
✅ Link ingredient "재료A" to "신메뉴" → purchase validation allows this combo
✅ Create SKU "신메뉴_봉" with price ₩15,000 → appears in sales form
✅ Update SKU price → new price used in revenue calculation
✅ Update distribution % → changes reflected in analysis

---

## Next Steps

1. **Review this task list** with development team
2. **Prioritize MVP**: Start with Phase 1 → Phase 2 → Phase 3 (US1)
3. **Assign tasks**: Distribute [P] tasks across team members
4. **Setup tracking**: Import tasks into project management tool (GitHub Projects, Jira, etc.)
5. **Begin implementation**: Execute tasks in dependency order
6. **Test incrementally**: Complete independent test criteria after each user story

**Ready to begin implementation!** 🚀
