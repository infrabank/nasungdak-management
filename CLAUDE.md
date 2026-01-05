# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

나성닭강정 매입·판매·원가 관리 시스템 - A Next.js 15 purchase, sales, and cost management web application using App Router, Drizzle ORM, and Vercel Postgres.

## Development Commands

### Core Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm start                # Start production server
npm run type-check       # TypeScript type checking
npm run lint             # ESLint
npm run format           # Prettier formatting
```

### Database Operations
```bash
npm run db:generate      # Generate migration files from schema
npm run db:migrate       # Apply migrations to database
npm run db:studio        # Open Drizzle Studio (DB GUI)
npm run db:seed          # Seed database with sample data
npm run import:excel     # Import data from Excel (scripts/import-excel.ts)
```

### Testing
```bash
npm run test             # Run Vitest unit tests
npm run test:e2e         # Run Playwright E2E tests
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js Server Actions (serverless)
- **Database**: Vercel Postgres (PostgreSQL) with Drizzle ORM
- **Validation**: Zod schemas
- **Authentication**: JWT tokens (jose library) with HTTP-only cookies
- **Deployment**: Vercel

### Route Structure

```
app/
├── (auth)/login/              # Unauthenticated login page → /login
└── dashboard/                 # Protected routes (JWT middleware)
    ├── page.tsx               # Dashboard home → /dashboard
    ├── purchases/             # Purchase management → /dashboard/purchases
    ├── sales/                 # Sales management → /dashboard/sales
    ├── analysis/              # Period analysis → /dashboard/analysis
    └── master-data/           # Base data → /dashboard/master-data
```

**URL Paths:**
- `/login` - Login page (public)
- `/dashboard` - Dashboard home (protected)
- `/dashboard/purchases` - Purchase management (protected)
- `/dashboard/sales` - Sales management (protected)
- `/dashboard/analysis` - Period analysis (protected)
- `/dashboard/master-data` - Master data management (protected)

All routes except `/login` and static assets are protected by middleware (middleware.ts) which validates JWT session tokens.

### Database Schema Pattern

All tables follow a consistent pattern:
- **Primary Key**: `id` (UUID, auto-generated)
- **Audit Fields**: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- **Soft Delete**: `deletedAt`, `deletedBy` (never hard delete records)
- **Active Status**: `isActive` boolean (where applicable)

Key tables:
- `menu_categories` - Menu items
- `ingredients` - Ingredient master data
- `skus` - Stock keeping units (sales items linked to menus)
- `menu_ingredients` - Junction table for menu-ingredient mapping
- `purchase_transactions` - Purchase records with auto-validation
- `sales_records` - Sales records
- `cost_distribution_rules` - Cost allocation rules with date ranges

**Important**: `purchaseTransactions.totalAmount` and `salesRecords.totalRevenue` are **generated columns** computed by the database. Do not try to insert/update these fields directly.

### Server Actions Pattern

Each feature area has an `actions.ts` file with CRUD operations following this standard pattern:

**Location**: `app/dashboard/[feature]/actions.ts`

**Standard Structure**:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { [table], ... } from '@/lib/db/schema'
import { [schema] } from '@/lib/utils/validation'

export async function create[Entity](formData: FormData) {
  // 1. Parse and validate with Zod
  // 2. Business logic (e.g., validation checks)
  // 3. Database insert/update
  // 4. revalidatePath() to clear cache
  // 5. Return { success: boolean, data?: T, error?: string }
}
```

**Key Conventions**:
- All server actions use `FormData` as input (not JSON)
- Use Zod schemas from `lib/utils/validation.ts` for validation
- Always call `revalidatePath()` after mutations
- Soft delete: Set `deletedAt` timestamp, don't use `.delete()`
- Return consistent response shape with success/error fields

### Authentication System

**Single-password authentication** (not multi-user):
- Password stored as bcrypt hash in `AUTH_PASSWORD_HASH` env variable
- JWT tokens created with `jose` library, signed with `SESSION_SECRET`
- Tokens stored in HTTP-only cookies (7-day expiration)
- Middleware validates all requests except `/login` and static files

**Key Files**:
- `app/(auth)/login/actions.ts` - Login/logout server actions
- `middleware.ts` - JWT verification and redirect logic
- `app/dashboard/logout-button.tsx` - Logout client component

### Form Implementation Pattern

Forms are client components that submit to server actions:

**Pattern**:
```typescript
'use client'

import { useActionState } from 'react'
import { create[Entity] } from './actions'

export default function [Entity]Form() {
  const [state, formAction, isPending] = useActionState(create[Entity], null)

  // Handle form submission with FormData
  // Display validation errors from server action
  // Use HTML5 validation (required, type, min, max, step)
}
```

**Notes**:
- Uses React 19's `useActionState` hook (not react-hook-form in most places)
- Server actions receive raw FormData
- Forms use native HTML inputs styled with Tailwind
- No global form library - simple, direct approach

### Data Fetching

**Server Components** (default):
```typescript
export default async function [Entity]Page() {
  const data = await get[Entities]()  // Direct async/await in component
  return <div>{/* Render data */}</div>
}
```

**Client Components** (when needed):
```typescript
useEffect(() => {
  get[Entities]().then(setData)
}, [])
```

**Query Patterns**:
- Use Drizzle's query builder with explicit joins
- Always filter out soft-deleted records: `where(isNull(table.deletedAt))`
- Limit queries to 100 records (no pagination implemented yet)
- Use `orderBy(desc(table.createdAt))` for chronological ordering

### Validation with Zod

**Location**: `lib/utils/validation.ts`

**Custom Number Transform** (important for decimal fields):
```typescript
const decimalSchema = z.union([
  z.number(),
  z.string().transform((val) => {
    const num = parseFloat(val)
    if (isNaN(num)) throw new Error('Invalid number')
    return num
  })
]).pipe(z.number().positive())
```

This pattern handles both string and numeric inputs from forms and ensures positive numbers.

### Utility Functions

**Location**: `lib/utils/format.ts`

```typescript
formatCurrency(amount: number)        // ₩15,000 (Korean won)
formatDate(date, format)              // Uses date-fns with ko locale
formatPercentage(value)               // 40.0%
```

All formatting uses Korean locale (ko-KR).

## Business Logic Notes

### Purchase Transaction Validation

When creating a purchase transaction, the system automatically validates whether the menu-ingredient combination is valid:

1. Check if `menu_ingredients` table has a mapping for the selected menuId + ingredientId
2. Set `isValid` field accordingly
3. Users can manually toggle validation status via `togglePurchaseValidation()` action

This ensures purchases match expected ingredient usage for each menu item.

### Cost Distribution Rules

Cost distribution rules define how to allocate purchase costs to menus:
- Must have `effective_from` and optional `effective_to` dates
- Sum of `distribution_percent` for same menu + date range must equal 100%
- Used in period analysis queries to calculate cost of goods sold

### Database-Computed Fields

**Never insert/update these generated columns**:
- `purchase_transactions.total_amount` = `quantity * unit_price`
- `sales_records.total_revenue` = `quantity_sold * (SELECT unit_price FROM skus WHERE id = sku_id)`

The database computes these automatically using `generatedAlwaysAs()`.

## Common Patterns

### Soft Delete Pattern
```typescript
// Soft delete (correct)
await db.update(table)
  .set({ deletedAt: new Date(), deletedBy: 'user-id' })
  .where(eq(table.id, id))

// Hard delete (never do this)
await db.delete(table).where(eq(table.id, id))
```

### Query with Joins
```typescript
const results = await db
  .select({
    id: table1.id,
    name: table1.name,
    relatedName: table2.name,
  })
  .from(table1)
  .leftJoin(table2, eq(table1.relatedId, table2.id))
  .where(isNull(table1.deletedAt))
  .orderBy(desc(table1.createdAt))
  .limit(100)
```

### Revalidation After Mutations
```typescript
await db.insert(table).values(data)
revalidatePath('/dashboard/[feature]')  // Clear Next.js cache
```

## Environment Variables

Required environment variables (see `.env`):

```env
# Database (auto-provided by Vercel Postgres)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NO_SSL=
POSTGRES_URL_NON_POOLING=

# Authentication
SESSION_SECRET=          # JWT signing key (generate random string)
AUTH_PASSWORD_HASH=      # Bcrypt hash of login password
```

To generate password hash:
```typescript
import bcrypt from 'bcryptjs'
const hash = await bcrypt.hash('your-password', 10)
```

## Database Migrations

When modifying schema in `lib/db/schema.ts`:

1. Generate migration: `npm run db:generate`
2. Review generated SQL in `drizzle/` directory
3. Apply migration: `npm run db:migrate`
4. Restart TypeScript server in IDE to pick up new types

## Type Safety

**Drizzle Type Inference**:
```typescript
export type MenuCategory = typeof menuCategories.$inferSelect
export type NewMenuCategory = typeof menuCategories.$inferInsert
```

Use `$inferSelect` for read types and `$inferInsert` for create/update types.

**Decimal Fields**: Database decimal columns are returned as strings by the Postgres driver. Convert to numbers for calculations:
```typescript
const amount = Number(record.totalAmount)
```

## Code Style

- **Naming**: Database columns use `snake_case`, TypeScript uses `camelCase`
- **UI**: Tailwind CSS throughout, no CSS modules or styled-components
- **File naming**: `kebab-case.tsx` for files
- **No global state**: Component-level state with useState, server actions for mutations
- **Korean language**: All user-facing text and error messages in Korean

## Documentation

Detailed specs and planning docs in `specs/1-purchase-sales-management/`:
- `spec.md` - Feature specifications
- `data-model.md` - Database schema documentation
- `plan.md` - Implementation plan
- `tasks.md` - Task breakdown

See `QUICKSTART.md` for setup guide and `IMPLEMENTATION_GUIDE.md` for detailed implementation patterns.
