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
npm run import:excel     # Import data from Excel (scripts/import-excel.ts)

# Testing
npm run test             # Run Vitest unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run test -- <file>   # Run specific test file (e.g., npm run test -- user.test.ts)
```

## Code Style Guidelines

### Import Patterns
- Use `@/*` path alias for internal imports
- Group imports: external libraries first, then internal modules
- Use `import type` for type-only imports to avoid side effects

### File Naming Conventions
- Database columns: `snake_case`
- TypeScript variables/functions: `camelCase`
- File names: `kebab-case.tsx` for React components, `kebab-case.ts` for utilities
- Server actions: `actions.ts` in feature directories
- Form components: `*-form.tsx` (client components with 'use client')
- Row components: `*-row.tsx` (for table rows)

### Server Actions Pattern
```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { [table] } from '@/lib/db/schema'
import { [schema] } from '@/lib/utils/validation'

export async function create[Entity](formData: FormData) {
  try {
    const validatedData = [schema].parse(rawData)
    await db.insert(table).values(validatedData)
    revalidatePath('/dashboard/[feature]')
    return { success: boolean, data?: T, error?: string }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Soft Delete Pattern
Never hard delete - use soft delete:
```typescript
await db.update(table).set({ deletedAt: new Date(), deletedBy: 'system' }).where(eq(table.id, id))
// Query: always filter out .where(isNull(table.deletedAt))
```

### Database Query Patterns
- Always filter soft-deleted: `where(isNull(table.deletedAt))`
- Use explicit joins with Drizzle query builder
- Limit to 100 records (1000 for CSV imports)
- Order chronologically: `orderBy(desc(table.createdAt))`
- Use `Promise.all()` for parallel data fetching

### Validation with Zod
- All schemas in `lib/utils/validation.ts`
- Use custom transforms for decimal fields
- Return Korean error messages for user-facing text

### React Component Patterns
- Server components by default (no 'use client')
- Use React 19's `useActionState` hook for forms
- Forms submit to server actions with FormData
- Add `as const` to initialState for better type inference
- Use `export const dynamic = 'force-dynamic'` for real-time data pages

### Error Handling & Type Safety
- Server actions: wrap in try/catch, return { success: false, error: string }
- Never suppress type errors with `as any` or `@ts-ignore`
- Use Drizzle type inference: `typeof table.$inferSelect` and `typeof table.$inferInsert`
- Database decimal columns return as strings - convert with `Number()`
- All server actions use FormData as input, not JSON

### UI/UX Guidelines
- Use Tailwind CSS for all styling
- Korean language for all user-facing text
- Responsive design required
- Use HTML5 form validation (required, type, min, max, step)

### Generated Columns (Never insert/update)
- `purchase_transactions.total_amount` (computed: quantity * unit_price)
- `sales_records.total_revenue` (computed from SKU unit price)
- `oil_change_history.total_cost` (computed: quantity * unit_price)

### Bulk Import Pattern
```typescript
export async function bulkCreate[Entity](rows: CSVRow[]) {
  let successCount = 0, failedCount = 0, errors: string[] = []
  for (let i = 0; i < rows.length; i++) {
    try {
      await db.insert(table).values(schema.parse(rowData))
      successCount++
    } catch (error) {
      failedCount++
      errors.push(`${i + 1}행: ${error.message}`)
    }
  }
  revalidatePath('/dashboard/[feature]')
  return { success: true, successCount, failedCount, errors }
}
```

### Authentication
- Single-password system (not multi-user)
- JWT tokens with HTTP-only cookies
- All routes except `/login` protected by middleware
- Use `jose` library for token operations

### Revalidation
Always call `revalidatePath()` after database mutations:
```typescript
await db.insert(table).values(data)
revalidatePath('/dashboard/[feature]')
```

## Testing
- Unit tests with Vitest (no test files exist yet - create when needed)
- E2E tests with Playwright
- Test files: `*.test.ts` for unit, `*.spec.ts` for E2E

## Linting & Formatting
- ESLint with Next.js config, Prettier with Tailwind plugin
- Run `npm run lint` and `npm run format` before commits
- Use `npm run type-check` to verify TypeScript types

## Key Files to Understand
- `lib/db/schema.ts` - Database schema
- `lib/utils/validation.ts` - Form validation schemas
- `lib/utils/format.ts` - Formatting utilities (Korean locale)
- `middleware.ts` - JWT authentication
- `app/dashboard/oil-changes/` - Oil change history management
- `CLAUDE.md` - Detailed project documentation
