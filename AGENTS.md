# AGENTS.md

Next.js 15 + Drizzle ORM Korean restaurant management system. This file guides AI agents.

## Commands

```bash
# Development
npm run dev              # Dev server at localhost:3000
npm run build            # Production build (MUST pass before deploy)
npm run type-check       # TypeScript check (MUST pass before commits)
npm run lint             # ESLint (next/core-web-vitals)
npm run format           # Prettier formatting

# Database (Drizzle + Vercel Postgres)
npm run db:generate      # Generate migration from schema changes
npm run db:migrate       # Apply migrations
npm run db:studio        # GUI for database
npm run db:seed          # Seed sample data

# Testing (Vitest)
npm run test                      # Run all tests
npm run test -- validation        # Run tests matching "validation"
npm run test -- --watch           # Watch mode
npm run test -- lib/__tests__/validation.test.ts  # Specific file
```

## Code Style

- **No semicolons**, single quotes, 2-space indent, trailing commas (ES5)
- **80 char width**, Tailwind class auto-sorting via prettier plugin
- **Import order**: External libs first, then `@/*` internal modules

| Context | Convention | Example |
|---------|------------|---------|
| DB columns | snake_case | `created_at`, `menu_id` |
| TS variables | camelCase | `createdAt`, `menuId` |
| Files | kebab-case | `purchase-form.tsx` |
| Components | PascalCase | `PurchaseForm` |

## Project Structure

```
app/dashboard/[feature]/
  page.tsx           # Server component (data fetching)
  actions.ts         # Server actions (mutations + cached queries)
  *-form.tsx         # Client component ('use client')

lib/
  db/schema.ts       # Drizzle schema (all tables)
  utils/validation.ts # Zod validation schemas
  utils/format.ts    # Korean locale formatters
```

## Server Actions

```typescript
'use server'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { tableName } from '@/lib/db/schema'
import { schema } from '@/lib/utils/validation'
import { z } from 'zod'

export async function createEntity(formData: FormData) {
  try {
    const validated = schema.parse({ field: formData.get('field') })
    await db.insert(tableName).values(validated)
    revalidatePath('/dashboard/feature')
    revalidateTag('feature:all')
    return { success: true }
  } catch (error) {
    console.error('Failed:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: '처리 중 오류가 발생했습니다' }
  }
}

// Cached queries with tags
export async function getData(storeId: string) {
  const getCached = unstable_cache(
    () => db.select().from(tableName).where(eq(tableName.storeId, storeId)),
    ['feature:list', storeId],
    { tags: [`feature:${storeId}`] }
  )
  return getCached()
}
```

**Rules:** Input `FormData` | Validate Zod | Return `{ success, data?, error? }` | Korean errors | Cache with tags

## Database Patterns

### Soft Delete (NEVER hard delete)
```typescript
await db.update(table).set({ deletedAt: new Date() }).where(eq(table.id, id))
// Always filter: .where(isNull(table.deletedAt))
```

### Generated Columns (NEVER insert/update)
- `purchase_transactions.total_amount`, `sales_records.total_revenue`, `oil_change_history.total_cost`

### Transactions for Bulk Operations
```typescript
await db.transaction(async (tx) => {
  for (const item of items) await tx.insert(table).values(item)
})
```

### Type Inference
```typescript
type Entity = typeof table.$inferSelect    // For reads
type NewEntity = typeof table.$inferInsert // For inserts
```
**Note:** Decimal columns return strings - convert with `Number()`.

## Validation (Zod)

```typescript
// Decimal fields: coerce.string() then transform
quantity: z.coerce.string().transform((val, ctx) => {
  const num = Number(val)
  if (isNaN(num) || num <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '수량은 0보다 커야 합니다' })
    return z.NEVER
  }
  return val  // Return string for decimal columns
})
```

## Type Safety (STRICT)

- **NEVER** use `as any`, `@ts-ignore`, `@ts-expect-error`
- **NEVER** suppress type errors - fix root cause
- Use Drizzle's `$inferSelect`/`$inferInsert`

## UI Guidelines

- **Tailwind CSS only**, **Korean language**, **Responsive design**
- **HTML5 validation**: `required`, `type`, `min`, `max`, `step`
- **Toast**: `toast.success('저장되었습니다')` / `toast.error(result.error)`

## Multi-Store & Auth

- All transactional tables have `storeId` FK. Filter by URL param.
- JWT (jose), HTTP-only cookies, 7-day expiry. Middleware protects `/dashboard/*`.

## Pre-Commit

```bash
npm run type-check && npm run lint && npm run format
```
