# Research & Technology Decisions

**Feature**: Purchase, Sales, and Cost Management System
**Branch**: `1-purchase-sales-management`
**Date**: 2026-01-04

## Technology Stack Decision

### Frontend Framework: Next.js 15

**Decision**: Use Next.js 15 with App Router for the web application

**Rationale**:
- **Server Components**: Enables optimal performance with server-side rendering for data-heavy pages (purchase history, sales records, period analysis)
- **File-based Routing**: Simplifies page structure for CRUD operations (purchases, sales, master data management)
- **API Routes**: Built-in API capabilities eliminate need for separate backend server
- **Vercel Deployment**: First-class support for serverless deployment with zero configuration
- **SEO & Performance**: SSR improves initial load times critical for mobile devices in restaurant environment
- **React 19**: Latest React features including automatic form handling and improved hydration

**Alternatives Considered**:
- **Vite + React SPA**: Rejected because SSR provides better mobile performance and eliminates separate API server requirement
- **Remix**: Strong contender but Next.js has better Vercel integration and larger ecosystem
- **Astro**: Excellent for static content but overkill for data-heavy CRUD application

---

### Styling: Tailwind CSS

**Decision**: Use Tailwind CSS for styling with custom configuration for Korean business UI

**Rationale**:
- **Utility-First**: Rapid development of responsive layouts essential for mobile-first design
- **Design Tokens**: Easy customization for Korean Won currency formatting, date formats, and business-specific styling
- **Performance**: Purges unused CSS automatically, critical for mobile data usage
- **Mobile-First**: Built-in responsive design philosophy aligns with requirement for tablet/mobile support
- **Form Styling**: Excellent support for complex forms (purchase entry, sales entry)

**Alternatives Considered**:
- **CSS Modules**: More verbose and slower development for responsive components
- **Styled Components**: Runtime overhead not suitable for data-heavy pages
- **Material UI / shadcn/ui**: Too opinionated and heavy for simple business CRUD interface

---

### Animation: Framer Motion

**Decision**: Use Framer Motion for UI transitions and micro-interactions

**Rationale**:
- **Declarative Animations**: Simple API for page transitions between purchase/sales/analysis views
- **Gesture Support**: Touch-friendly interactions for mobile/tablet usage
- **Performance**: Hardware-accelerated transforms suitable for lower-end devices
- **Layout Animations**: Automatic animations for list additions (new purchase entries, sales records)
- **Bundle Size**: Tree-shakeable, only includes used animation features

**Alternatives Considered**:
- **CSS Transitions**: Limited capabilities for complex state-based animations
- **React Spring**: More complex API, overkill for simple transitions
- **GSAP**: More powerful but heavier bundle size not justified for business CRUD app

---

### Data Storage: Vercel Postgres

**Decision**: Use Vercel Postgres (Neon) for relational data storage

**Rationale**:
- **Relational Model**: Perfect fit for normalized data model (menus, ingredients, many-to-many relationships)
- **Serverless**: Zero configuration deployment alongside Next.js on Vercel
- **Connection Pooling**: Built-in via `@vercel/postgres`, handles serverless function connections
- **ACID Transactions**: Essential for financial calculations and cost allocation integrity
- **PostgreSQL**: Industry-standard SQL database with excellent date/time handling for period analysis
- **Cost**: Free tier supports small business data volume (<10k records/year)

**Alternatives Considered**:
- **Vercel KV (Redis)**: Not suitable for complex relational queries (menu-ingredient joins, cost calculations)
- **PlanetScale (MySQL)**: Good option but Vercel Postgres has better integration and migration tools
- **Supabase**: Adds unnecessary complexity (auth, real-time features not needed)
- **Local SQLite**: Not compatible with Vercel serverless deployment

---

### ORM/Database Client: Drizzle ORM

**Decision**: Use Drizzle ORM for type-safe database access

**Rationale**:
- **TypeScript-First**: Fully type-safe queries prevent runtime errors in financial calculations
- **Lightweight**: Minimal overhead compared to Prisma, better cold start performance on serverless
- **SQL-Like**: Easy migration from existing Excel formulas to SQL aggregate queries
- **Migrations**: Built-in migration system for schema evolution
- **Vercel Postgres Support**: First-class integration with `@vercel/postgres`
- **Edge Runtime**: Compatible with Vercel Edge Functions if needed for performance

**Alternatives Considered**:
- **Prisma**: More mature but slower cold starts in serverless environment
- **Raw SQL**: Loses type safety critical for financial calculations
- **Kysely**: Good alternative but smaller ecosystem and fewer Vercel examples

---

### Form Handling: React Hook Form + Zod

**Decision**: Use React Hook Form with Zod for validation

**Rationale**:
- **Performance**: Minimizes re-renders critical for complex forms (purchase entry with multiple fields)
- **Validation**: Zod provides type-safe schema validation aligned with database schema
- **User Experience**: Real-time validation for menu/ingredient combinations, price/quantity constraints
- **React 19**: Works seamlessly with new form actions and server actions
- **Bundle Size**: Lightweight compared to Formik

**Alternatives Considered**:
- **Native Forms**: Lacks validation logic for business rules (distribution % sum to 100%)
- **Formik**: Heavier and slower for complex forms with many fields

---

### Date Handling: date-fns

**Decision**: Use date-fns for date operations

**Rationale**:
- **Tree-Shakeable**: Only import needed functions (format, parse, period calculations)
- **Korean Locale**: Built-in Korean locale support for date formatting
- **Functional**: Immutable date operations prevent bugs in period analysis calculations
- **Lightweight**: Much smaller than moment.js

**Alternatives Considered**:
- **Day.js**: Good alternative but date-fns has better TypeScript support
- **Native Date**: Insufficient for Korean locale formatting and timezone handling

---

### State Management: React Context + Server State

**Decision**: Minimal client state using React Context; rely on server components for data

**Rationale**:
- **Server-First**: Most data fetching happens server-side (purchase history, sales analysis)
- **Simplicity**: Avoids complexity of Redux/Zustand for simple CRUD operations
- **Performance**: Server components reduce client-side JavaScript bundle
- **Form State**: React Hook Form handles local form state independently

**Alternatives Considered**:
- **Redux**: Overkill for simple CRUD operations without complex client-side state
- **Zustand**: Not needed when server components handle most data fetching
- **TanStack Query**: Adds complexity when Next.js server components provide caching

---

### Authentication: Simple Password Protection

**Decision**: Implement basic password protection using Next.js middleware

**Rationale**:
- **Single User**: Spec assumes 1-3 operators, no role-based access needed
- **Simplicity**: Avoid OAuth complexity for small business use case
- **Vercel KV**: Store session tokens in Vercel KV for serverless session management
- **Future**: Easy to upgrade to NextAuth.js if multi-user support needed later

**Alternatives Considered**:
- **NextAuth.js**: Too complex for single-user initial requirement
- **Clerk/Auth0**: SaaS overhead not justified for internal business tool

---

### Deployment: Vercel

**Decision**: Deploy on Vercel with zero-configuration setup

**Rationale**:
- **Zero Config**: Automatic deployment from Git push
- **Serverless**: No infrastructure management required
- **Edge Network**: Global CDN for fast asset delivery to mobile devices
- **Preview Deployments**: Automatic staging for testing before production
- **Environment Variables**: Built-in secrets management for database credentials
- **Monitoring**: Built-in analytics and web vitals tracking

**Alternatives Considered**:
- **Netlify**: Good alternative but less optimized for Next.js App Router
- **AWS/Railway**: Requires manual configuration and infrastructure management

---

## Performance Strategy

### Mobile-First Optimization

**Decision**: Prioritize mobile performance through server components and code splitting

**Implementation**:
- Use Next.js Server Components for data-heavy pages (purchase history, period analysis)
- Client components only for interactive forms and animations
- Dynamic imports for Framer Motion animations (loaded only when needed)
- Image optimization via next/image for any future logo/branding assets

**Target Metrics**:
- First Contentful Paint: <1.5s on 3G
- Largest Contentful Paint: <2.5s on 3G
- Time to Interactive: <3.5s on 3G
- Bundle Size: <200KB initial JavaScript

---

### Database Query Optimization

**Decision**: Use database indexes and aggregation queries for period analysis

**Implementation**:
- Index on `purchase_transactions.date` for date range queries
- Index on `sales_records.date` for cumulative sales queries
- Composite indexes on `(menu_id, ingredient_id)` for validation lookups
- Use SQL aggregations (SUM, GROUP BY) instead of client-side calculations
- Implement database connection pooling via `@vercel/postgres`

**Target Metrics**:
- Period analysis query: <500ms for 1 year of data
- Purchase history load: <300ms for 100 records
- Sales entry validation: <100ms real-time

---

## Security Considerations

### Data Validation

**Decision**: Multi-layer validation (client, server, database)

**Implementation**:
- **Client**: Zod schemas for immediate user feedback
- **Server**: Re-validate all inputs in API routes/Server Actions
- **Database**: CHECK constraints for business rules (price > 0, percentages 0-100)
- **SQL Injection**: Prevented by Drizzle ORM parameterized queries

---

### Financial Data Integrity

**Decision**: Use PostgreSQL transactions for multi-step operations

**Implementation**:
- Wrap cost allocation calculations in database transactions
- Implement optimistic locking for concurrent edits
- Audit trail via `created_at`, `updated_at` timestamps on all tables
- Immutable historical records (soft deletes for corrections)

---

## Development Workflow

### Local Development

**Setup**:
1. Clone repository
2. `npm install`
3. Setup local Vercel Postgres (via `vercel dev` or local PostgreSQL)
4. `npm run db:migrate` to create schema
5. `npm run db:seed` to load initial master data from existing Excel
6. `npm run dev` to start development server

**Tools**:
- Drizzle Studio for database inspection
- Vercel CLI for local serverless function testing
- ESLint + Prettier for code formatting
- TypeScript strict mode for type safety

---

### Testing Strategy

**Unit Tests**:
- Validation schemas (Zod)
- Data transformation functions (SKU conversions, cost calculations)
- Date utilities (period analysis logic)

**Integration Tests**:
- API routes with test database
- Form submissions end-to-end
- Database migrations

**E2E Tests**:
- Critical user flows (purchase entry → history view)
- Cost calculation accuracy

**Tools**: Vitest for unit/integration, Playwright for E2E

---

## Migration from Excel

### Data Import Strategy

**Decision**: Create one-time migration script to import existing Excel data

**Implementation**:
1. Use `xlsx` npm package to parse existing Excel file
2. Extract master data (menus, ingredients, SKUs, conversion factors)
3. Import historical transactions (purchases from 2025-09)
4. Import sales records
5. Validate imported data against business rules
6. Generate migration report for user review

**Deliverable**: `scripts/import-excel.ts` executed once during deployment

---

## Responsive Design Breakpoints

**Decision**: Standard Tailwind breakpoints with mobile-first approach

**Breakpoints**:
- **Mobile**: 0-640px (sm) - Single column layout, bottom navigation
- **Tablet**: 641-1024px (md-lg) - Two column layout, side navigation
- **Desktop**: 1025px+ (xl) - Multi-column dashboard, full navigation

**Components**:
- Responsive tables with horizontal scroll on mobile
- Touch-friendly buttons (min 44px touch targets)
- Mobile-optimized date picker for period selection
- Drawer navigation on mobile, sidebar on desktop

---

## Internationalization

**Decision**: Korean-only for initial release

**Implementation**:
- Hard-coded Korean strings in components (no i18n library overhead)
- Korean locale for date formatting (date-fns/locale/ko)
- Korean Won (₩) currency formatting
- UTF-8 encoding for Korean text in database

**Future**: Easy to add next-intl if internationalization needed later

---

## Research Summary

All technical decisions have been made based on:
1. User requirements for responsive web application
2. Vercel deployment target
3. Small business data scale (<10k records/year)
4. Mobile-first performance requirements
5. Simplicity over premature optimization

No NEEDS CLARIFICATION items remain. Ready to proceed to Phase 1 (Data Model & Contracts).
