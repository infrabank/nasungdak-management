# Implementation Plan: Purchase, Sales, and Cost Management System

**Branch**: `1-purchase-sales-management` | **Date**: 2026-01-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/1-purchase-sales-management/spec.md`

## Summary

Build a responsive web application to replace an Excel-based workflow for managing purchases, sales, and cost analysis for a fried chicken restaurant. The system provides data entry forms for purchase transactions and daily sales, cumulative history views, and period-based margin analysis with configurable cost allocation. The application uses Next.js 15 with App Router for server-side rendering, Drizzle ORM with Vercel Postgres for data storage, and deploys to Vercel with zero configuration.

**Core Value**: Reduce monthly cost analysis time from 2+ hours (manual Excel) to under 10 minutes with automated calculations and real-time validation.

---

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 20.x
**Primary Dependencies**: Next.js 15 (App Router), React 19, Drizzle ORM, Tailwind CSS, Framer Motion
**Storage**: PostgreSQL 15+ (Vercel Postgres with connection pooling)
**Testing**: Vitest (unit/integration) + Playwright (E2E)
**Target Platform**: Modern web browsers (Chrome, Safari, Edge, Firefox); Mobile/tablet/desktop responsive
**Project Type**: Web application (full-stack Next.js, single codebase)
**Performance Goals**:

- First Contentful Paint < 1.5s on 3G
- Period analysis query < 500ms for 1 year of data
- Purchase entry form response < 100ms
  **Constraints**:
- Mobile-first design (must work on 375px+ screens)
- Korean language only (UTF-8 encoding)
- Offline not required (assumes internet connectivity)
- Single-user initially (simple password protection)
  **Scale/Scope**:
- ~600 purchase transactions/year
- ~3,600 sales records/year
- <100 master data records
- 1-3 concurrent users

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Status**: ✅ NO CONSTITUTION FILE DEFINED

The project `.specify/memory/constitution.md` contains a template without specific principles. No violations to check.

**Recommendation**: Consider establishing a constitution for this project if recurring patterns emerge (e.g., "Mobile-First Always", "Server Components by Default").

---

## Project Structure

### Documentation (this feature)

```text
specs/1-purchase-sales-management/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # Database schema
├── quickstart.md        # Developer setup guide
├── contracts/
│   └── api-spec.md      # API specifications
└── tasks.md             # NOT CREATED - run /speckit.tasks
```

### Source Code (repository root)

```text
app/                              # Next.js 15 App Router
├── (auth)/                       # Public routes
│   └── login/
│       └── page.tsx              # Login page
│
├── (dashboard)/                  # Protected routes
│   ├── layout.tsx                # Dashboard layout
│   ├── page.tsx                  # Dashboard home
│   ├── purchases/                # Purchase management
│   │   ├── page.tsx              # List view
│   │   ├── new/page.tsx          # Create form
│   │   ├── [id]/edit/page.tsx   # Edit form
│   │   └── actions.ts            # Server actions
│   ├── sales/                    # Sales management
│   │   ├── page.tsx
│   │   ├── daily/page.tsx
│   │   └── actions.ts
│   ├── analysis/                 # Period analysis
│   │   └── page.tsx
│   └── master-data/              # Master data
│       ├── menus/
│       ├── ingredients/
│       ├── menu-ingredients/
│       ├── skus/
│       └── cost-distribution/
│
├── api/auth/logout/route.ts      # Logout endpoint
├── layout.tsx                    # Root layout
├── globals.css                   # Global styles
└── middleware.ts                 # Session validation

components/
├── ui/                           # Base components
├── forms/                        # Domain forms
└── layout/                       # Layout components

lib/
├── db/
│   ├── index.ts                  # DB client
│   ├── schema.ts                 # Drizzle schema
│   └── queries/                  # Complex queries
├── utils/
│   ├── format.ts                 # Formatting
│   ├── validation.ts             # Zod schemas
│   └── cn.ts                     # Class merger
└── auth/
    └── session.ts                # Session management

scripts/
├── import-excel.ts               # Excel import
├── seed.ts                       # DB seeding
└── migrate.ts                    # Migration runner

drizzle/
├── 0000_initial_schema.sql       # Initial migration
└── meta/                         # Migration metadata

tests/
├── unit/                         # Vitest
├── integration/                  # Server Actions
└── e2e/                          # Playwright

Configuration:
├── .env.local
├── drizzle.config.ts
├── tailwind.config.ts
├── next.config.js
└── package.json
```

**Structure Decision**: Web application using Next.js App Router with server-first architecture. Route groups `(auth)` and `(dashboard)` separate public/protected sections. Server Components for data fetching, Client Components only for interactive elements. Server Actions handle mutations.

---

## Complexity Tracking

> **Status**: No constitution violations. This section is empty.

---

## Phase 0: Research & Technology Decisions

✅ **COMPLETED** - See [research.md](research.md)

**Key Decisions**:

- Next.js 15 with App Router
- Vercel Postgres + Drizzle ORM
- Tailwind CSS + Framer Motion
- React Hook Form + Zod
- Vercel deployment

---

## Phase 1: Data Model & API Design

✅ **COMPLETED**

**Data Model**: [data-model.md](data-model.md)

- 7 core tables with relationships
- UUID primary keys, soft deletes
- Automated validation triggers
- Optimized indexes

**API Contracts**: [contracts/api-spec.md](contracts/api-spec.md)

- Server Actions (primary)
- Zod validation
- Type-safe responses

**Quickstart**: [quickstart.md](quickstart.md)

- 10-minute setup guide
- Database seeding
- Development workflow

---

## Phase 2: Task Breakdown

⏳ **NOT YET STARTED** - Generate with `/speckit.tasks`

---

## Next Steps

Run `/speckit.tasks` to generate detailed implementation tasks.

**Documentation Status**:

- ✅ Specification ([spec.md](spec.md))
- ✅ Research ([research.md](research.md))
- ✅ Data Model ([data-model.md](data-model.md))
- ✅ API Contracts ([contracts/api-spec.md](contracts/api-spec.md))
- ✅ Quickstart ([quickstart.md](quickstart.md))
- ✅ Implementation Plan (this file)
- ⏳ Tasks (run `/speckit.tasks`)
