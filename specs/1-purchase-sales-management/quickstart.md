# Quickstart Guide

**Feature**: Purchase, Sales, and Cost Management System
**Branch**: `1-purchase-sales-management`
**Target**: Developers setting up the project for the first time

## Prerequisites

- **Node.js**: 20.x or later
- **npm**: 10.x or later
- **Git**: For version control
- **Vercel Account**: For deployment and database (free tier)
- **Code Editor**: VS Code recommended

---

## Initial Setup (10 minutes)

### 1. Clone Repository

```bash
git clone <repository-url>
cd sajangbook
git checkout 1-purchase-sales-management
```

### 2. Install Dependencies

```bash
npm install
```

**Key Dependencies**:

- `next@15` - Framework
- `react@19` - UI library
- `drizzle-orm` - Database ORM
- `@vercel/postgres` - Database client
- `tailwindcss` - Styling
- `framer-motion` - Animations
- `react-hook-form` - Forms
- `zod` - Validation
- `date-fns` - Date utilities

### 3. Setup Vercel Postgres Database

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link to Vercel project (creates new project if needed)
vercel link

# Create Postgres database
vercel env pull .env.local
```

This will:

- Create a Vercel project
- Provision a Vercel Postgres database
- Download environment variables to `.env.local`

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Create new project or select existing
3. Go to Storage → Create Database → Postgres
4. Copy connection string
5. Create `.env.local`:

```env
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."
```

### 4. Run Database Migrations

```bash
# Generate migration files (already created in this branch)
npm run db:generate

# Apply migrations to database
npm run db:migrate
```

**Migrations Create**:

- All tables (menu_categories, ingredients, skus, etc.)
- Indexes for performance
- Triggers for validation
- Initial constraints

### 5. Seed Master Data

```bash
# Seed initial data from existing Excel file
npm run db:seed
```

**This imports**:

- Menu categories from Excel "메뉴" sheet
- Ingredients from Excel "재료" sheet
- Menu-ingredient relationships
- SKUs with conversion factors from "환산표"
- Cost distribution rules from "기간분석"
- Historical purchase transactions from "매입현황\_누적"
- Historical sales records from "판매수량\_누적"

**Verify seeding**:

```bash
# Open Drizzle Studio to inspect data
npm run db:studio
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default Login**: (Set during first run)

- Password: `admin` (change in production)

---

## Project Structure

```
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   └── login/             # Login page
│   ├── (dashboard)/           # Protected routes
│   │   ├── layout.tsx         # Dashboard layout with nav
│   │   ├── page.tsx           # Dashboard home
│   │   ├── purchases/         # Purchase management
│   │   │   ├── page.tsx       # List view
│   │   │   ├── new/           # Create form
│   │   │   ├── [id]/edit/     # Edit form
│   │   │   └── actions.ts     # Server actions
│   │   ├── sales/             # Sales management
│   │   │   ├── page.tsx       # List view
│   │   │   ├── daily/         # Daily entry form
│   │   │   └── actions.ts     # Server actions
│   │   ├── analysis/          # Period analysis
│   │   │   └── page.tsx       # Analysis dashboard
│   │   └── master-data/       # Master data management
│   │       ├── menus/
│   │       ├── ingredients/
│   │       ├── menu-ingredients/
│   │       ├── skus/
│   │       └── cost-distribution/
│   └── api/                   # API routes (minimal)
│       └── auth/
│           └── logout/
├── components/                # Shared components
│   ├── ui/                    # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── forms/                 # Form components
│   │   ├── purchase-form.tsx
│   │   ├── sales-form.tsx
│   │   └── ...
│   └── layout/                # Layout components
│       ├── nav.tsx
│       ├── header.tsx
│       └── ...
├── lib/                       # Utilities
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema
│   │   ├── index.ts           # DB client
│   │   └── queries.ts         # Complex queries
│   ├── utils/
│   │   ├── format.ts          # Formatting (currency, dates)
│   │   ├── validation.ts      # Zod schemas
│   │   └── ...
│   └── auth/
│       └── session.ts         # Session management
├── scripts/                   # Setup scripts
│   ├── import-excel.ts        # Excel import
│   └── seed.ts                # Database seeding
├── drizzle/                   # Database migrations
│   └── 0000_initial_schema.sql
├── public/                    # Static assets
├── .env.local                 # Local environment variables
├── .env.example               # Example env file
├── drizzle.config.ts          # Drizzle configuration
├── tailwind.config.ts         # Tailwind configuration
├── next.config.js             # Next.js configuration
└── package.json
```

---

## Development Workflow

### Adding a New Page

1. Create page file: `app/(dashboard)/my-page/page.tsx`
2. Add to navigation: `components/layout/nav.tsx`
3. Implement Server Component with direct DB queries
4. Style with Tailwind CSS

Example:

```typescript
// app/(dashboard)/my-page/page.tsx
import { db } from '@/lib/db';
import { menuCategories } from '@/lib/db/schema';

export default async function MyPage() {
  const menus = await db.select().from(menuCategories);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Page</h1>
      <ul>
        {menus.map(menu => (
          <li key={menu.id}>{menu.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Adding a Server Action

1. Create actions file: `app/(dashboard)/my-page/actions.ts`
2. Add `'use server'` directive
3. Implement action with Zod validation
4. Return standardized response

Example:

```typescript
// app/(dashboard)/my-page/actions.ts
'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { menuCategories } from '@/lib/db/schema'

const schema = z.object({
  name: z.string().min(1),
})

export async function createMenu(formData: FormData) {
  try {
    const data = schema.parse({
      name: formData.get('name'),
    })

    const [menu] = await db.insert(menuCategories).values(data).returning()

    return { success: true, data: menu }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Database Schema Changes

1. Edit `lib/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Review generated SQL in `drizzle/`
4. Apply migration: `npm run db:migrate`
5. Update TypeScript types (automatic via Drizzle)

### Styling Components

Use Tailwind utility classes:

```tsx
<div className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow md:flex-row">
  <button className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700">
    버튼
  </button>
</div>
```

**Responsive Breakpoints**:

- `sm:` - 640px+ (mobile)
- `md:` - 768px+ (tablet)
- `lg:` - 1024px+ (desktop)
- `xl:` - 1280px+ (large desktop)

### Adding Animations

Use Framer Motion for transitions:

```tsx
'use client'

import { motion } from 'framer-motion'

export function AnimatedCard({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}
```

---

## Testing

### Unit Tests

```bash
npm run test
```

Test validation logic, utilities, and pure functions:

```typescript
// lib/utils/__tests__/format.test.ts
import { formatCurrency } from '../format'

test('formatCurrency formats Korean Won correctly', () => {
  expect(formatCurrency(1000)).toBe('₩1,000')
  expect(formatCurrency(1234567)).toBe('₩1,234,567')
})
```

### Integration Tests

Test Server Actions with test database:

```typescript
// app/(dashboard)/purchases/__tests__/actions.test.ts
import { createPurchase } from '../actions'

test('createPurchase validates menu-ingredient combination', async () => {
  const formData = new FormData()
  // ... set form data

  const result = await createPurchase(formData)

  expect(result.success).toBe(true)
})
```

### E2E Tests

```bash
npm run test:e2e
```

Test critical user flows with Playwright:

```typescript
// tests/e2e/purchase-flow.spec.ts
import { test, expect } from '@playwright/test'

test('user can create purchase transaction', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="password"]', 'admin')
  await page.click('button[type="submit"]')

  await page.goto('/purchases/new')
  // ... fill form and submit
  await expect(page).toHaveURL('/purchases')
})
```

---

## Deployment

### Deploy to Vercel

#### Option A: Git Push (Recommended)

1. Push to GitHub/GitLab/Bitbucket
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import Git repository
4. Vercel auto-detects Next.js
5. Link Postgres database (created in setup)
6. Deploy

**Automatic deployments**:

- Push to `main` → Production
- Push to other branches → Preview deployment

#### Option B: Vercel CLI

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

### Environment Variables

Set in Vercel dashboard (Settings → Environment Variables):

```
POSTGRES_URL=<from-vercel-postgres>
POSTGRES_PRISMA_URL=<from-vercel-postgres>
POSTGRES_URL_NON_POOLING=<from-vercel-postgres>
# ... other Postgres vars

# App-specific
AUTH_PASSWORD_HASH=<bcrypt-hash-of-password>
```

### Post-Deployment Tasks

1. **Run migrations** (automatic on Vercel)
2. **Seed data**: Run import script once
   ```bash
   vercel env pull
   npm run import:excel -- path/to/excel-file.xlsx
   ```
3. **Set password**: Update `AUTH_PASSWORD_HASH` in env vars
4. **Test login**: Visit production URL and login
5. **Verify data**: Check all pages load correctly

---

## Common Tasks

### View Database Data

```bash
npm run db:studio
```

Opens Drizzle Studio at [https://local.drizzle.studio](https://local.drizzle.studio)

### Import Excel Data

```bash
npm run import:excel -- path/to/sajangbook.xlsx
```

Imports all data and generates report.

### Reset Database

```bash
npm run db:drop    # Drop all tables
npm run db:migrate # Recreate tables
npm run db:seed    # Re-seed data
```

### Check TypeScript Types

```bash
npm run type-check
```

### Lint Code

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Format Code

```bash
npm run format
```

---

## Troubleshooting

### Database Connection Errors

**Problem**: `Error: Connection terminated unexpectedly`

**Solution**:

1. Check `.env.local` has correct Postgres credentials
2. Verify database is running in Vercel dashboard
3. Check network/firewall settings
4. Try non-pooling connection: use `POSTGRES_URL_NON_POOLING`

### Migration Errors

**Problem**: `relation "table_name" already exists`

**Solution**:

```bash
# Drop and recreate
npm run db:drop
npm run db:migrate
```

### Type Errors

**Problem**: TypeScript complains about missing types

**Solution**:

```bash
# Regenerate Drizzle types
npm run db:generate
```

### Excel Import Fails

**Problem**: Import script fails with validation errors

**Solution**:

1. Check Excel file format matches expected structure
2. Review error report in console
3. Manually fix data in Excel
4. Re-run import

### Vercel Deployment Fails

**Problem**: Build fails on Vercel

**Solution**:

1. Check build logs in Vercel dashboard
2. Ensure all env vars are set
3. Run `npm run build` locally to reproduce
4. Check Node.js version matches (20.x)

---

## Performance Monitoring

### Local Performance

```bash
# Run production build locally
npm run build
npm run start
```

Check:

- Page load times
- Database query duration
- Bundle sizes: `.next/analyze/`

### Vercel Analytics

Enable in Vercel dashboard:

- Web Vitals (LCP, FID, CLS)
- Edge Function performance
- Database query metrics

### Optimization Tips

1. **Use Server Components** for data-heavy pages
2. **Lazy load** Framer Motion animations
3. **Optimize images** with next/image
4. **Cache master data** with revalidation
5. **Index database** queries (already configured)

---

## Next Steps

1. **Customize UI**: Update colors, fonts in `tailwind.config.ts`
2. **Add features**: Extend based on user feedback
3. **Setup monitoring**: Add error tracking (Sentry)
4. **Backup strategy**: Setup automated database backups
5. **User training**: Create user guide for operators

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)

---

## Support

For issues or questions:

1. Check this guide and documentation
2. Review error messages and logs
3. Search GitHub issues
4. Contact development team

**Happy coding! 🚀**
