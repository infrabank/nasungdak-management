# AGENTS.md

Guidance for AI coding agents working in this Next.js 15 + Drizzle ORM project.

## Commands

```bash
# Development
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run type-check       # TypeScript check (run before commits)
npm run lint             # ESLint (next/core-web-vitals)
npm run format           # Prettier formatting

# Database (Drizzle + Vercel Postgres)
npm run db:generate      # Generate migration from schema changes
npm run db:migrate       # Apply migrations
npm run db:studio        # GUI for database
npm run db:seed          # Seed sample data

# Testing
npm run test             # Run all Vitest tests
npm run test <pattern>   # Run specific test (e.g., npm run test user)
npm run test:e2e         # Playwright E2E tests
```

## Code Style

### Formatting (Prettier)
- No semicolons, single quotes, 2-space indent
- Trailing commas (ES5), 80 char width
- Tailwind class sorting via plugin

### Imports
```typescript
// 1. External libraries first
import { z } from 'zod'
import { eq, isNull, desc } from 'drizzle-orm'
// 2. Internal modules with @/* alias
import { db } from '@/lib/db'
import type { MenuCategory } from '@/lib/db/schema'  // Use 'import type' for types
```

### Naming Conventions
| Context | Convention | Example |
|---------|------------|---------|
| DB columns | snake_case | `created_at`, `menu_id` |
| TS variables | camelCase | `createdAt`, `menuId` |
| Files | kebab-case | `purchase-form.tsx` |
| Components | PascalCase | `PurchaseForm` |

### File Organization
```
app/dashboard/[feature]/
  page.tsx        # Server component (data fetching)
  actions.ts      # Server actions (CRUD)
  *-form.tsx      # Client component ('use client')
  *-row.tsx       # Table row components
```

## Server Actions Pattern

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { tableName } from '@/lib/db/schema'
import { schema } from '@/lib/utils/validation'

export async function createEntity(formData: FormData) {
  try {
    const rawData = {
      field1: formData.get('field1'),
      field2: formData.get('field2'),
    }
    const validated = schema.parse(rawData)
    await db.insert(tableName).values(validated)
    revalidatePath('/dashboard/feature')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
```

**Rules:**
- Input: always `FormData` (not JSON)
- Validation: Zod schemas from `lib/utils/validation.ts`
- After mutation: always call `revalidatePath()`
- Return shape: `{ success: boolean, data?: T, error?: string }`

## Database Patterns

### Soft Delete (NEVER hard delete)
```typescript
// Delete
await db.update(table).set({ deletedAt: new Date() }).where(eq(table.id, id))
// Query (always filter deleted)
.where(isNull(table.deletedAt))
```

### Generated Columns (NEVER insert/update these)
- `purchase_transactions.total_amount` = quantity * unit_price
- `sales_records.total_revenue` = quantity_sold * unit_price
- `oil_change_history.total_cost` = quantity * unit_price

### Query Standards
```typescript
await db.select().from(table)
  .leftJoin(related, eq(table.relatedId, related.id))
  .where(isNull(table.deletedAt))
  .orderBy(desc(table.createdAt))
  .limit(100)  // Always limit
```

### Type Inference
```typescript
type Entity = typeof table.$inferSelect    // For reads
type NewEntity = typeof table.$inferInsert // For inserts
```

**Note:** Decimal columns return strings from Postgres - convert with `Number()`.

## Form Components (React 19)

```typescript
'use client'
import { useActionState } from 'react'
import { createEntity } from './actions'

export function EntityForm() {
  const [state, formAction, isPending] = useActionState(createEntity, null)

  return (
    <form action={formAction}>
      <input name="field" required />
      <button disabled={isPending}>
        {isPending ? '처리중...' : '저장'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  )
}
```

## Validation (Zod)

```typescript
// For form number inputs - use coerce.string() then transform
quantity: z.coerce.string().transform((val, ctx) => {
  const num = Number(val)
  if (isNaN(num) || num <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '수량은 0보다 커야 합니다' })
    return z.NEVER
  }
  return val  // Return string for decimal columns
})
```

**All error messages in Korean.**

## Type Safety Rules

- **NEVER** use `as any`, `@ts-ignore`, `@ts-expect-error`
- **NEVER** suppress type errors - fix them properly
- Use explicit types, leverage Drizzle inference

## Multi-Store Support

All transactional entities have `storeId` FK:
- Filter by `storeId` URL parameter
- Apply filter in queries where applicable

## Authentication

- Single-password JWT system (jose library)
- HTTP-only cookies, 7-day expiration
- Middleware protects all routes except `/login`
- Key files: `middleware.ts`, `app/(auth)/login/actions.ts`

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/db/schema.ts` | Drizzle ORM schema definitions |
| `lib/db/index.ts` | Database client |
| `lib/utils/validation.ts` | Zod validation schemas |
| `lib/utils/format.ts` | Korean locale formatters |
| `middleware.ts` | JWT auth middleware |
| `drizzle.config.ts` | Drizzle Kit config |

## UI Guidelines

- Tailwind CSS only (no CSS modules)
- Korean language for all user-facing text
- Responsive design required
- Use HTML5 validation (required, type, min, max, step)

## Before Committing

```bash
npm run type-check && npm run lint && npm run format
```
