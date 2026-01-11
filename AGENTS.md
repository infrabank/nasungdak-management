# AGENTS.md

This file provides guidance to agentic coding agents working in this repository.

## Build & Development Commands

```bash
# Core Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm start                # Start production server
npm run type-check       # TypeScript type checking
npm run lint             # ESLint
npm run format           # Prettier formatting

# Database Operations
npm run db:generate      # Generate migration files from schema
npm run db:migrate       # Apply migrations to database
npm run db:studio        # Open Drizzle Studio (DB GUI)
npm run db:seed          # Seed database with sample data
npm run import:excel     # Import data from Excel

# Testing
npm run test             # Run Vitest unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run test -- <file>   # Run specific test (e.g., npm run test -- user.test.ts)
```

## Code Style Guidelines

### Import Patterns
- Use `@/*` path alias for internal imports
- Group: external libs first, then internal modules
- Use `import type` for type-only imports:
  ```typescript
  import type { MenuCategory } from '@/lib/db/schema'
  ```

### File Naming
- DB columns: `snake_case`, TS variables: `camelCase`
- Files: `kebab-case.tsx` (components), `kebab-case.ts` (utilities)
- Server actions: `actions.ts` in feature dirs
- Forms: `*-form.tsx` (client components with 'use client')
- Table rows: `*-row.tsx`

### Server Actions Pattern
```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { [table] } from '@/lib/db/schema'
import { [schema] } from '@/lib/utils/validation'

export async function create[Entity](formData: FormData) {
  try {
    const rawData = { field1: formData.get('field1'), /* ... */ }
    const validatedData = [schema].parse(rawData)
    await db.insert(table).values(validatedData)
    revalidatePath('/dashboard/[feature]')
    return { success: true, data?: T, error?: string }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```
**Key:** FormData input, try/catch, revalidatePath(), Zod validation

### Soft Delete Pattern
```typescript
await db.update(table).set({ deletedAt: new Date(), deletedBy: 'user-id' }).where(eq(table.id, id))
// Query: .where(isNull(table.deletedAt))
```

### Database Queries
- Always filter soft-deleted: `where(isNull(table.deletedAt))`
- Use explicit joins with Drizzle query builder
- Limit to 100 records (1000 for CSV imports)
- Order chronologically: `orderBy(desc(table.createdAt))`
- Use `Promise.all()` for parallel fetching

### Validation with Zod
```typescript
quantity: z.coerce.string().transform((val, ctx) => {
  const num = Number(val)
  if (isNaN(num) || num <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '수량은 0보다 커야 합니다' })
    return z.NEVER
  }
  return val
})
```
Use `z.coerce.string()` for form inputs, return Korean errors

### React Components
- Server components by default, add `'use client'` for interactivity
- Use React 19's `useActionState`: `const [state, formAction, isPending] = useActionState(createEntity, null)`
- Add `as const` to initialState
- Real-time data: `export const dynamic = 'force-dynamic'`

### Type Safety
- Never suppress errors with `as any` or `@ts-ignore`
- Use Drizzle inference: `typeof table.$inferSelect` / `typeof table.$inferInsert`
- Decimal columns return strings - convert with `Number()`

### UI/UX
- Tailwind CSS for all styling
- Korean language for all UI text
- Responsive design required
- HTML5 form validation (required, type, min, max, step)

### Generated Columns (Never insert/update)
- `purchase_transactions.total_amount` = `quantity * unit_price`
- `sales_records.total_revenue` = `quantity_sold * unit_price`
- `oil_change_history.total_cost` = `quantity * unit_price`

### Bulk Import
```typescript
export async function bulkCreate[Entity](rows: CSVRow[]) {
  let successCount = 0, failedCount = 0, errors: string[] = []
  for (let i = 0; i < rows.length; i++) {
    try { await db.insert(table).values(schema.parse(rowData)); successCount++ }
    catch (error) { failedCount++; errors.push(`${i + 1}행: ${error.message}`) }
  }
  revalidatePath('/dashboard/[feature]')
  return { success: true, successCount, failedCount, errors }
}
```

### Authentication
- Single-password JWT system (jose library)
- HTTP-only cookies (7-day expiration)
- Middleware protects all routes except `/login`

### Multi-Store Support
- All entities have `storeId` FK to `stores` table
- Filter: `storeId` URL parameter
- Apply `storeId` filter to queries where applicable

### Revalidation
Always `revalidatePath()` after DB mutations

## Testing
- Vitest unit tests, Playwright E2E
- `*.test.ts` for unit, `*.spec.ts` for E2E
- No test config files exist yet

## Linting & Formatting
- ESLint + Next.js config, Prettier + Tailwind plugin
- Run `npm run lint` and `npm run format` before commits
- Use `npm run type-check` to verify types

## Key Files
- `lib/db/schema.ts` - Database schema (Drizzle ORM)
- `lib/utils/validation.ts` - Form validation schemas (Zod)
- `lib/utils/format.ts` - Formatting utilities (Korean locale)
- `middleware.ts` - JWT authentication
- `CLAUDE.md` - Detailed project documentation
