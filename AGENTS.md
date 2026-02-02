# AGENTS.md

Next.js 15 + Drizzle ORM Korean restaurant management system (나성닭강정).

## Commands

```bash
# Development
npm run dev                # Dev server (localhost:3000)
npm run build              # Production build (MUST pass before deploy)
npm run type-check         # TypeScript check (MUST pass before commits)
npm run lint               # ESLint (next/core-web-vitals)
npm run format             # Prettier formatting

# Database (Drizzle + Vercel Postgres)
npm run db:generate        # Generate migration from schema changes
npm run db:migrate         # Apply migrations
npm run db:studio          # GUI for database (Drizzle Studio)
npm run db:seed            # Seed sample data

# Testing (Vitest + Playwright)
npm run test               # Run all unit tests
npm run test validation    # Tests matching "validation"
npm run test -- --watch    # Watch mode
npm run test -- lib/__tests__/validation.test.ts  # Specific file
npm run test:e2e           # Playwright E2E tests
```

## Code Style

**Prettier config**: No semicolons, single quotes, 2-space indent, trailing commas (ES5), 80 char width

**Import order**: External libs → `@/*` internal modules

```typescript
import { useState, useEffect } from 'react' // External
import { z } from 'zod' // External
import { db } from '@/lib/db' // Internal
import { purchaseSchema } from '@/lib/utils/validation'
```

**Naming conventions**:
| Context | Convention | Example |
|---------|------------|---------|
| DB columns | snake_case | `created_at`, `menu_id` |
| TS variables | camelCase | `createdAt`, `menuId` |
| Files | kebab-case | `purchase-form.tsx` |
| Components | PascalCase | `PurchaseForm` |

## Project Structure

```
app/
  (auth)/login/           # Auth pages
  dashboard/[feature]/
    page.tsx              # Server Component (data fetching)
    actions.ts            # Server Actions (mutations + cached queries)
    *-form.tsx            # Client Component ('use client')
components/ui/            # Reusable UI components (Button, Input, etc.)
lib/
  db/schema.ts            # Drizzle schema (all tables)
  utils/validation.ts     # Zod validation schemas
  utils/format.ts         # Korean locale formatters (currency, date)
```

## Server Actions Pattern

```typescript
'use server'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { tableName } from '@/lib/db/schema'
import { schema } from '@/lib/utils/validation'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'

// CREATE - Always return { success, data?, error? }
export async function createEntity(formData: FormData) {
  try {
    const validated = schema.parse({ field: formData.get('field') })
    const [result] = await db.insert(tableName).values(validated).returning()
    revalidatePath('/dashboard/feature')
    revalidateTag('feature:all')
    return { success: true, data: result }
  } catch (error) {
    console.error('Failed:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: '처리 중 오류가 발생했습니다' }
  }
}

// READ - Use unstable_cache with tags
export async function getData(storeId: string) {
  const getCached = unstable_cache(
    () =>
      db
        .select()
        .from(tableName)
        .where(
          and(eq(tableName.storeId, storeId), isNull(tableName.deletedAt))
        ),
    ['feature:list', storeId],
    { tags: [`feature:${storeId}`] }
  )
  return getCached()
}
```

## Client Components Pattern

```typescript
'use client'
import { useState, useCallback } from 'react'
import { toast } from '@/components/ui/toast'
import { createEntity } from './actions'

export default function EntityForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setIsSubmitting(true)
      const result = await createEntity(new FormData(e.currentTarget))
      setIsSubmitting(false)

      if (result.success) {
        toast.success('저장되었습니다')
      } else {
        toast.error(result.error || '오류가 발생했습니다')
      }
    },
    []
  )
  // ...
}
```

## Database Patterns

**Soft Delete (NEVER hard delete)**:

```typescript
await db.update(table).set({ deletedAt: new Date() }).where(eq(table.id, id))
// Always filter: .where(isNull(table.deletedAt))
```

**Generated Columns (NEVER insert/update)**: `total_amount`, `total_revenue`, `total_cost`

**Transactions for Bulk**:

```typescript
await db.transaction(async (tx) => {
  for (const item of items) await tx.insert(table).values(item)
})
```

**Type Inference**:

```typescript
type Entity = typeof table.$inferSelect // For reads
type NewEntity = typeof table.$inferInsert // For inserts
// Decimal columns return strings - convert with Number()
```

## Validation (Zod)

```typescript
// Decimal fields: coerce.string() then transform
quantity: z.coerce.string().transform((val, ctx) => {
  const num = Number(val)
  if (isNaN(num) || num <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '수량은 0보다 커야 합니다',
    })
    return z.NEVER
  }
  return val // Return string for decimal columns
})
```

## Type Safety (STRICT)

- **NEVER** use `as any`, `@ts-ignore`, `@ts-expect-error`
- **NEVER** suppress type errors - fix root cause
- Use Drizzle's `$inferSelect`/`$inferInsert` for DB types

## UI Guidelines

- **Tailwind CSS only** (no external CSS), **Korean language** for all UI text
- **HTML5 validation**: `required`, `type`, `min`, `max`, `step`
- **Toast notifications**: `toast.success('저장되었습니다')` / `toast.error(result.error)`
- **Framer Motion** for animations (use variants from `lib/animations.ts`)
- **Responsive design**: Mobile-first approach

## Formatting Utilities

```typescript
import { formatCurrency, formatDate } from '@/lib/utils/format'
formatCurrency(15000) // "₩15,000"
formatDate(new Date(), 'yyyy-MM-dd') // "2026-01-30"
```

## Multi-Store & Auth

- All transactional tables have `storeId` FK. Filter by URL search param.
- JWT (jose), HTTP-only cookies, 7-day expiry. Middleware protects `/dashboard/*`.

## Pre-Commit Checklist

```bash
npm run type-check && npm run lint && npm run format
```
