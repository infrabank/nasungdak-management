# AGENTS.md

This file provides guidance to agentic coding agents working in this repository.

## Build & Development Commands

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
npm run test -- <file>   # Run specific test file (e.g., npm run test -- user.test.ts)
```

## Code Style Guidelines

### Import Patterns
- Use `@/*` path alias for internal imports (configured in tsconfig.json)
- Group imports: external libraries first, then internal modules
- Check relative paths carefully: `./` for same folder, `../` for parent folder
- Example:
```typescript
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { purchaseSchema } from '@/lib/utils/validation'
```

### File Naming Conventions
- Database columns: `snake_case`
- TypeScript variables/functions: `camelCase`
- File names: `kebab-case.tsx` for React components, `kebab-case.ts` for utilities
- Server actions: `actions.ts` in feature directories

### Server Actions Pattern
All server actions must follow this structure:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { [table] } from '@/lib/db/schema'
import { [schema] } from '@/lib/utils/validation'

export async function create[Entity](formData: FormData) {
  try {
    // 1. Parse and validate with Zod
    const rawData = { /* extract from formData */ }
    const validatedData = [schema].parse(rawData)
    
    // 2. Business logic/validation checks
    // 3. Database insert/update
    // 4. revalidatePath() to clear cache
    // 5. Return { success: boolean, data?: T, error?: string }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Database Query Patterns
- Always filter out soft-deleted records: `where(isNull(table.deletedAt))`
- Use explicit joins with Drizzle query builder
- Limit queries to 100 records (no pagination yet)
- Order chronologically: `orderBy(desc(table.createdAt))`
- Never hard delete - use soft delete pattern

### Validation with Zod
- All schemas in `lib/utils/validation.ts`
- Use custom transforms for decimal fields:
```typescript
quantity: z.coerce.string().transform((val, ctx) => {
  const num = Number(val)
  if (isNaN(num) || num <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '수량은 0보다 커야 합니다',
    })
    return z.NEVER
  }
  return val
})
```

### React Component Patterns
- Server components by default (no 'use client')
- Client components only when needed for interactivity
- Use React 19's `useActionState` hook for forms
- Forms submit to server actions with FormData
- Add `as const` to initialState for better type inference:
```typescript
const initialState = {
  success: false,
  error: '',
} as const
```

### Error Handling
- Server actions: wrap in try/catch, return { success: false, error: string }
- Client components: display validation errors from server action response
- Never suppress type errors with `as any` or `@ts-ignore`

### Type Safety
- Use Drizzle type inference: `typeof table.$inferSelect` and `typeof table.$inferInsert`
- Database decimal columns return as strings - convert with `Number()` for calculations
- All server actions use FormData as input, not JSON
- Use `import type` for type-only imports to avoid side effects:
```typescript
import type { OilChangeHistory } from '@/lib/db/schema'
```
- Add `as const` assertion to frozen object literals for better type inference

### UI/UX Guidelines
- Use Tailwind CSS for all styling
- Korean language for all user-facing text
- Responsive design required
- Use HTML5 form validation (required, type, min, max, step)

### Generated Columns
Never insert/update these database-generated columns:
- `purchase_transactions.total_amount` (computed: quantity * unit_price)
- `sales_records.total_revenue` (computed from SKU unit price)
- `oil_change_history.total_cost` (computed: quantity * unit_price)

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
- ESLint with Next.js config
- Prettier with Tailwind plugin
- Run `npm run lint` and `npm run format` before commits
- Use `npm run type-check` to verify TypeScript types

## Key Files to Understand
- `lib/db/schema.ts` - Database schema
- `lib/utils/validation.ts` - Form validation schemas
- `lib/utils/format.ts` - Formatting utilities (Korean locale)
- `middleware.ts` - JWT authentication
- `app/dashboard/oil-changes/` - Oil change history management
- `CLAUDE.md` - Detailed project documentation