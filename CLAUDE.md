# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Principles

- Never use emojis.

## Commit Authorship

When committing code changes:

- Never add Claude as a commit author.
- Always commit as using the default git settings

## Documentation Style

When creating or updating markdown documentation files:

- **Never create .md files unless explicitly instructed.**
- **Be extremely concise** - engineers scan, they don't read novels
- **Only include essential information** - what they need to know, not what's possible to explain
- **Prefer examples over prose** - show the pattern, not the theory
- **Assume technical competence** - skip obvious explanations
- **Front-load critical info** - put warnings and key concepts first
- **Delete verbose explanations** - if it takes more than 3 sentences, it's probably too long

Default to 1-2 sentence explanations. Only expand when complexity absolutely requires it.

## Overview

사장북(sajangbook.com) - 요식업 매장 관리 SaaS. Next.js 15 (App Router) + Drizzle ORM + Vercel Postgres. 멀티 조직/매장/유저, Stripe 구독 결제, 카카오 알림톡 발송.

## Development Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run type-check       # TypeScript check
npm run lint             # ESLint
npm run format           # Prettier

npm run db:generate      # Generate migrations from schema
npm run db:migrate       # Apply migrations
npm run db:studio        # Drizzle Studio
npm run db:seed          # Seed sample data (also: scripts/seed-admin.ts, seed-plans.ts, seed-roles.ts)

npm run test             # Vitest
npm run test:e2e         # Playwright
```

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS, Recharts, sonner(toast), framer-motion
- **Backend**: Server Actions (mutations), Route Handlers (webhooks/auth/upload only)
- **DB**: Vercel Postgres + Drizzle ORM
- **Validation**: Zod
- **Auth**: JWT (jose) access/refresh token, HTTP-only cookies
- **Billing**: Stripe subscriptions
- **Notifications**: 재고 부족 알림 웹훅 (`lib/notifications/`, `ALERT_WEBHOOK_URL`), 자동 점검 크론 `/api/cron/inventory-alerts` (`CRON_SECRET`)

### Routes

**Public**: `/` (home), `/login`, `/signup`, `/onboarding`, `/pricing`, `/guide`, `/invite/[token]`

**Protected** (`/dashboard/*`):

| Route | Feature |
|-------|---------|
| `purchases` | 매입 관리 (간편 매입 포함) |
| `sales` | 매출 관리 (CSV import, bulk delete) |
| `inventory` | 재고 관리 + 부족 알림 규칙/발송 |
| `fixed-costs` | 고정비 (인건비/임대료/관리비/기타) |
| `analysis` | 분석: 마진, 메뉴 엔지니어링, 손익분기점, 재료 가격 추이, 요일별 판매 |
| `attendance` | 출퇴근 기록 |
| `employees` | 직원 관리 |
| `oil-changes` | 기름 교체 이력 |
| `stores` | 매장 관리 |
| `master-data` | 기준 데이터 (메뉴/재료/SKU 등) |
| `settings` | 조직/구독/멤버 설정 |

**Admin**: `/admin` (organizations, users) - separate admin session cookie (`lib/admin-auth.ts`)

**API routes**: `/api/auth/refresh`, `/api/health`, `/api/setup/seed-admin`, `/api/upload` (Vercel Blob), `/api/webhooks/stripe`

Middleware (`middleware.ts`) protects everything except public routes and static assets.

### Database Schema (`lib/db/schema.ts`)

All tables: UUID PK `id`, audit fields (`createdAt/updatedAt/createdBy/updatedBy`), soft delete (`deletedAt/deletedBy`). Never hard delete.

**Domain groups**:

- **Core**: `stores`, `suppliers`, `menu_categories`, `ingredients`, `skus`, `menu_ingredients`, `purchase_transactions`, `sales_records`, `cost_distribution_rules`, `fixed_costs`
- **Operations**: `oil_change_history`, `employees`, `attendance_records`
- **Inventory**: `inventory`, `inventory_alert_rules`, `inventory_events`, `alert_history`
- **Auth/SaaS**: `users`, `user_sessions`, `roles`, `user_store_assignments`, `audit_logs`, `organizations`, `organization_members`, `organization_invitations`, `subscriptions`, `invoices`, `webhook_events`, `usage_metrics`, `plan_features`
- **Recipes**: `sku_recipes`, `sales_menus`, `sales_menu_items`

**Generated columns - never insert/update directly**:

- `purchase_transactions.total_amount` = `quantity * unit_price`
- `sales_records.total_revenue` = `quantity_sold * unit_price`

Most business tables are scoped by `storeId`; always filter by the user's accessible stores.

### Authentication

Multi-user JWT auth (access + refresh token):

- **Access token**: `session` cookie, 15min. **Refresh token**: `refresh_token` cookie, 7 days (DB-backed in `user_sessions`)
- Middleware verifies access token; near expiry sets `X-Token-Refresh-Needed` header; expired → redirects to `/api/auth/refresh`
- JWT payload: `userId`, `email`, `name`, `storeIds`, `permissions` (role-based, from `roles` + `user_store_assignments`)
- **`SESSION_SECRET` must come from `@/lib/auth/constants`** (throws in production if env missing; never hardcode fallbacks)
- Key files: `lib/auth.ts` (getAuthContext), `lib/auth/constants.ts` (secret, cookie names, durations), `lib/auth-context.ts`, `middleware.ts`, `app/api/auth/refresh`
- Org membership/plan limits: `lib/features.ts`, usage tracking: `lib/usage.ts`, audit: `lib/audit.ts`

### Server Actions Pattern

`app/dashboard/[feature]/actions.ts`:

```typescript
'use server'

export async function create[Entity](formData: FormData) {
  // 1. getAuthContext() - verify auth + store access
  // 2. Parse/validate with Zod (lib/utils/validation.ts)
  // 3. DB insert/update (soft delete only)
  // 4. revalidatePath()
  // 5. Return { success: boolean, data?: T, error?: string }
}
```

- Input is `FormData`, not JSON
- Soft delete: set `deletedAt`, never `.delete()`
- Always `revalidatePath()` after mutations

### Forms

Client components with React 19 `useActionState`:

```typescript
const [state, formAction, isPending] = useActionState(createEntity, null)
```

Native HTML inputs + Tailwind. No global form library (react-hook-form used in a few places).

### Data Fetching

Server Components by default, direct `await` calls. Query conventions:

- Filter soft-deleted: `where(isNull(table.deletedAt))`
- Filter by accessible `storeId`
- `orderBy(desc(table.createdAt))`, `.limit(100)` (no pagination yet)

### Validation

`lib/utils/validation.ts`. Decimal fields accept string or number:

```typescript
z.union([z.number(), z.string().transform(...)]).pipe(z.number().positive())
```

### Formatting

`lib/utils/format.ts`: `formatCurrency` (₩), `formatDate` (date-fns ko locale, YY-MM-DD(요일) 형식), `formatPercentage`. All Korean locale.

## Business Logic Notes

- **매입 원가 산정**: 매입 시 메뉴 선택 없음 (`isValid` 검증은 폐기됨). 원가 배분은 `cost_distribution_rules`로 처리
- **Cost distribution rules**: `effective_from`/`effective_to` 기간별, 같은 메뉴+기간의 `distribution_percent` 합계 = 100%
- **순이익**: Revenue - (Variable Costs + Fixed Costs)
- **CSV 매출 import**: 날짜/SKU명/수량만 입력, 단가는 SKU 마스터에서 자동 적용 (판매 시점 가격 기록)
- **재고 알림**: `inventory_alert_rules` 기준 부족 감지 → 알림톡 발송, `alert_history`에 기록

## Common Patterns

### Soft Delete

```typescript
await db.update(table).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(table.id, id))
```

### Decimal Fields

Postgres decimal columns return strings. Convert: `Number(record.totalAmount)`

### Type Inference

```typescript
export type Entity = typeof entities.$inferSelect
export type NewEntity = typeof entities.$inferInsert
```

## Environment Variables

```env
POSTGRES_URL=                  # + other POSTGRES_* from Vercel
SESSION_SECRET=                # JWT signing key (required in production)
SETUP_SECRET=                  # /api/setup/seed-admin protection
ADMIN_EMAIL= ADMIN_PASSWORD= ADMIN_NAME=   # admin seed
STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_{BASIC,STANDARD,PRO}_{MONTHLY,YEARLY}=
NEXT_PUBLIC_APP_URL=
LOG_LEVEL= ALERT_WEBHOOK_URL=  # optional, lib/logger.ts
CRON_SECRET=                   # /api/cron/* Bearer 인증
```

## Database Migrations

1. Edit `lib/db/schema.ts`
2. `npm run db:generate` → review SQL in `drizzle/`
3. `npm run db:migrate`

## Code Style

- DB columns `snake_case`, TypeScript `camelCase`, files `kebab-case.tsx`
- Tailwind only (no CSS modules)
- No global state library; useState + server actions
- All user-facing text and errors in Korean

## Documentation

Specs in `specs/`: `1-purchase-sales-management/`, `saas-conversion/`, `mobile-ux-conversion-plan.md`
