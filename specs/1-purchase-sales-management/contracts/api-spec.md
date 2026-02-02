# API Specification

**Feature**: Purchase, Sales, and Cost Management System
**Architecture**: Next.js App Router with Server Actions
**Date**: 2026-01-04

## Overview

This application uses Next.js Server Actions for data mutations and Server Components for data fetching. Traditional REST endpoints are minimal, used only for client-side data fetching where Server Components are not applicable.

**Primary Pattern**: Server Actions (Form Actions, `use server`)
**Secondary Pattern**: Route Handlers for client-side data fetching

---

## Authentication

### Session Management

**Endpoint**: Middleware-based session validation
**Method**: Cookie-based session tokens stored in Vercel KV

**Flow**:

1. User enters password on login page
2. Server validates password
3. Creates session token in Vercel KV
4. Sets HTTP-only cookie
5. Middleware validates cookie on all protected routes

**Protected Routes**: All routes except `/login`

**Logout**: `POST /api/auth/logout` clears session cookie

---

## Master Data Management

### Menu Categories

#### List All Menus

**Type**: Server Component Direct Query
**File**: `app/master-data/menus/page.tsx`

**Query**:

```typescript
const menus = await db
  .select()
  .from(menuCategories)
  .where(eq(menuCategories.isActive, true))
  .orderBy(menuCategories.displayOrder)
```

**Response**:

```typescript
{
  id: string
  name: string
  displayOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
;[]
```

#### Create Menu

**Type**: Server Action
**File**: `app/master-data/menus/actions.ts`

**Action**: `createMenu(formData: FormData)`

**Input**:

```typescript
{
  name: string // Required, unique
  displayOrder: number // Optional, defaults to max + 1
}
```

**Validation** (Zod):

```typescript
const createMenuSchema = z.object({
  name: z.string().min(1).max(100),
  displayOrder: z.number().int().min(0).optional(),
})
```

**Response**:

```typescript
{
  success: boolean;
  data?: { id: string; name: string };
  error?: string;
}
```

#### Update Menu

**Type**: Server Action
**File**: `app/master-data/menus/actions.ts`

**Action**: `updateMenu(id: string, formData: FormData)`

**Input**:

```typescript
{
  id: string;            // Required
  name?: string;         // Optional
  displayOrder?: number; // Optional
  isActive?: boolean;    // Optional (soft delete)
}
```

**Response**: Same as Create Menu

---

### Ingredients

#### List All Ingredients

**Type**: Server Component Direct Query
**File**: `app/master-data/ingredients/page.tsx`

**Query**:

```typescript
const ingredients = await db
  .select()
  .from(ingredients)
  .where(eq(ingredients.isActive, true))
  .orderBy(ingredients.name)
```

**Response**:

```typescript
{
  id: string
  name: string
  category: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
;[]
```

#### Create Ingredient

**Type**: Server Action
**File**: `app/master-data/ingredients/actions.ts`

**Action**: `createIngredient(formData: FormData)`

**Input**:

```typescript
{
  name: string;       // Required, unique
  category?: string;  // Optional
}
```

**Validation**:

```typescript
const createIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(50).optional(),
})
```

**Response**:

```typescript
{
  success: boolean;
  data?: { id: string; name: string };
  error?: string;
}
```

---

### Menu-Ingredient Relationships

#### Get Menu Ingredients

**Type**: Server Component Direct Query
**File**: `app/master-data/menu-ingredients/page.tsx`

**Query**:

```typescript
const menuIngredients = await db
  .select({
    id: menuIngredients.id,
    menuName: menuCategories.name,
    ingredientName: ingredients.name,
  })
  .from(menuIngredients)
  .innerJoin(menuCategories, eq(menuIngredients.menuId, menuCategories.id))
  .innerJoin(ingredients, eq(menuIngredients.ingredientId, ingredients.id))
```

**Response**:

```typescript
{
  id: string
  menuName: string
  ingredientName: string
}
;[]
```

#### Add Menu-Ingredient Link

**Type**: Server Action
**File**: `app/master-data/menu-ingredients/actions.ts`

**Action**: `linkMenuIngredient(formData: FormData)`

**Input**:

```typescript
{
  menuId: string // Required, FK to menu_categories
  ingredientId: string // Required, FK to ingredients
}
```

**Validation**:

```typescript
const linkSchema = z.object({
  menuId: z.string().uuid(),
  ingredientId: z.string().uuid(),
})
```

**Response**:

```typescript
{
  success: boolean;
  data?: { id: string };
  error?: string; // e.g., "Duplicate link" if unique constraint violated
}
```

#### Remove Menu-Ingredient Link

**Type**: Server Action
**File**: `app/master-data/menu-ingredients/actions.ts`

**Action**: `unlinkMenuIngredient(id: string)`

**Input**: Link ID (UUID)

**Response**: Same as Add

---

### SKUs (Sales Units)

#### List SKUs

**Type**: Server Component Direct Query
**File**: `app/master-data/skus/page.tsx`

**Query**:

```typescript
const skus = await db
  .select({
    id: skus.id,
    skuCode: skus.skuCode,
    menuName: menuCategories.name,
    salesUnitName: skus.salesUnitName,
    conversionFactor: skus.conversionFactor,
    sellingPrice: skus.sellingPrice,
    description: skus.description,
  })
  .from(skus)
  .innerJoin(menuCategories, eq(skus.menuId, menuCategories.id))
  .where(eq(skus.isActive, true))
  .orderBy(menuCategories.displayOrder, skus.salesUnitName)
```

**Response**:

```typescript
{
  id: string
  skuCode: string
  menuName: string
  salesUnitName: string
  conversionFactor: number // Decimal(8,4)
  sellingPrice: number // Decimal(10,2)
  description: string | null
}
;[]
```

#### Create SKU

**Type**: Server Action
**File**: `app/master-data/skus/actions.ts`

**Action**: `createSku(formData: FormData)`

**Input**:

```typescript
{
  skuCode: string;           // Required, unique
  menuId: string;            // Required, FK to menu_categories
  salesUnitName: string;     // Required
  conversionFactor: number;  // Required, > 0
  sellingPrice: number;      // Required, >= 0
  description?: string;      // Optional
}
```

**Validation**:

```typescript
const createSkuSchema = z.object({
  skuCode: z.string().min(1).max(100),
  menuId: z.string().uuid(),
  salesUnitName: z.string().min(1).max(100),
  conversionFactor: z.number().positive().max(9999.9999),
  sellingPrice: z.number().nonnegative().max(99999999.99),
  description: z.string().max(200).optional(),
})
```

**Response**:

```typescript
{
  success: boolean;
  data?: { id: string; skuCode: string };
  error?: string;
}
```

#### Update SKU

**Type**: Server Action
**File**: `app/master-data/skus/actions.ts`

**Action**: `updateSku(id: string, formData: FormData)`

**Input**: Same as Create SKU (all fields optional except `id`)

**Response**: Same as Create SKU

---

### Cost Distribution Rules

#### Get Distribution Rules

**Type**: Server Component Direct Query
**File**: `app/master-data/cost-distribution/page.tsx`

**Query**:

```typescript
const rules = await db
  .select({
    id: costDistributionRules.id,
    menuName: menuCategories.name,
    distributionPercentage: costDistributionRules.distributionPercentage,
  })
  .from(costDistributionRules)
  .innerJoin(
    menuCategories,
    eq(costDistributionRules.menuId, menuCategories.id)
  )
  .orderBy(menuCategories.displayOrder)
```

**Response**:

```typescript
{
  id: string
  menuName: string
  distributionPercentage: number // Decimal(5,2), 0.00-100.00
}
;[]
```

#### Update Distribution Rules (Batch)

**Type**: Server Action
**File**: `app/master-data/cost-distribution/actions.ts`

**Action**: `updateDistributionRules(formData: FormData)`

**Input**:

```typescript
{
  rules: Array<{
    menuId: string
    distributionPercentage: number
  }>
}
```

**Validation**:

```typescript
const updateRulesSchema = z.object({
  rules: z
    .array(
      z.object({
        menuId: z.string().uuid(),
        distributionPercentage: z.number().min(0).max(100),
      })
    )
    .refine(
      (rules) => {
        const sum = rules.reduce((acc, r) => acc + r.distributionPercentage, 0)
        return Math.abs(sum - 100) < 0.01 // Allow floating point tolerance
      },
      { message: 'Distribution percentages must sum to 100%' }
    ),
})
```

**Response**:

```typescript
{
  success: boolean;
  data?: { updatedCount: number };
  error?: string;
}
```

---

## Purchase Transactions

### List Purchase History

**Type**: Server Component Direct Query with Pagination
**File**: `app/purchases/page.tsx`

**Query Parameters**:

```typescript
{
  page?: number;      // Default: 1
  pageSize?: number;  // Default: 50, Max: 100
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
  menuId?: string;    // Filter by menu
}
```

**Query**:

```typescript
const purchases = await db
  .select({
    id: purchaseTransactions.id,
    transactionDate: purchaseTransactions.transactionDate,
    menuName: menuCategories.name,
    ingredientName: ingredients.name,
    supplierName: purchaseTransactions.supplierName,
    quantity: purchaseTransactions.quantity,
    unitPrice: purchaseTransactions.unitPrice,
    unitDescription: purchaseTransactions.unitDescription,
    totalAmount: purchaseTransactions.totalAmount,
    isValid: purchaseTransactions.isValid,
    notes: purchaseTransactions.notes,
  })
  .from(purchaseTransactions)
  .innerJoin(menuCategories, eq(purchaseTransactions.menuId, menuCategories.id))
  .innerJoin(ingredients, eq(purchaseTransactions.ingredientId, ingredients.id))
  .where(/* date range and menu filters */)
  .orderBy(desc(purchaseTransactions.transactionDate))
  .limit(pageSize)
  .offset((page - 1) * pageSize)
```

**Response**:

```typescript
{
  data: {
    id: string
    transactionDate: string // ISO date
    menuName: string
    ingredientName: string
    supplierName: string
    quantity: number
    unitPrice: number
    unitDescription: string | null
    totalAmount: number
    isValid: boolean
    notes: string | null
  }
  ;[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}
```

### Create Purchase

**Type**: Server Action
**File**: `app/purchases/actions.ts`

**Action**: `createPurchase(formData: FormData)`

**Input**:

```typescript
{
  transactionDate: string; // ISO date
  menuId: string;          // FK to menu_categories
  ingredientId: string;    // FK to ingredients
  supplierName: string;
  quantity: number;        // > 0
  unitPrice: number;       // >= 0
  unitDescription?: string;
  notes?: string;
}
```

**Validation**:

```typescript
const createPurchaseSchema = z.object({
  transactionDate: z.string().date(),
  menuId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  supplierName: z.string().min(1).max(200),
  quantity: z.number().positive().max(9999999.99),
  unitPrice: z.number().nonnegative().max(999999999.99),
  unitDescription: z.string().max(100).optional(),
  notes: z.string().optional(),
})
```

**Response**:

```typescript
{
  success: boolean;
  data?: {
    id: string;
    totalAmount: number;
    isValid: boolean; // Set by database trigger
  };
  error?: string;
}
```

### Update Purchase

**Type**: Server Action
**File**: `app/purchases/actions.ts`

**Action**: `updatePurchase(id: string, formData: FormData)`

**Input**: Same as Create Purchase (all fields optional except `id`)

**Response**: Same as Create Purchase

### Delete Purchase

**Type**: Server Action
**File**: `app/purchases/actions.ts`

**Action**: `deletePurchase(id: string)`

**Input**: Purchase ID (UUID)

**Response**:

```typescript
{
  success: boolean;
  error?: string;
}
```

---

## Sales Records

### List Sales History

**Type**: Server Component Direct Query with Pagination
**File**: `app/sales/page.tsx`

**Query Parameters**:

```typescript
{
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  skuId?: string;
}
```

**Query**:

```typescript
const sales = await db
  .select({
    id: salesRecords.id,
    salesDate: salesRecords.salesDate,
    skuCode: skus.skuCode,
    menuName: menuCategories.name,
    salesUnitName: skus.salesUnitName,
    quantity: salesRecords.quantity,
    sellingPrice: skus.sellingPrice,
    revenue: sql<number>`${salesRecords.quantity} * ${skus.sellingPrice}`,
    notes: salesRecords.notes,
  })
  .from(salesRecords)
  .innerJoin(skus, eq(salesRecords.skuId, skus.id))
  .innerJoin(menuCategories, eq(skus.menuId, menuCategories.id))
  .where(/* filters */)
  .orderBy(desc(salesRecords.salesDate))
  .limit(pageSize)
  .offset((page - 1) * pageSize)
```

**Response**:

```typescript
{
  data: {
    id: string
    salesDate: string
    skuCode: string
    menuName: string
    salesUnitName: string
    quantity: number
    sellingPrice: number
    revenue: number // Calculated
    notes: string | null
  }
  ;[]
  pagination: {
    /* same as purchases */
  }
}
```

### Create/Update Daily Sales (Bulk)

**Type**: Server Action
**File**: `app/sales/actions.ts`

**Action**: `saveDailySales(formData: FormData)`

**Input**:

```typescript
{
  salesDate: string; // ISO date
  sales: Array<{
    skuId: string;
    quantity: number; // >= 0
  }>;
  notes?: string;
}
```

**Validation**:

```typescript
const saveDailySalesSchema = z.object({
  salesDate: z.string().date(),
  sales: z.array(
    z.object({
      skuId: z.string().uuid(),
      quantity: z.number().nonnegative().max(9999999.99),
    })
  ),
  notes: z.string().optional(),
})
```

**Logic**:

- Use UPSERT (ON CONFLICT UPDATE) for each SKU
- Update existing record if (salesDate, skuId) exists
- Insert new record otherwise

**Response**:

```typescript
{
  success: boolean;
  data?: {
    upsertedCount: number;
    totalRevenue: number;
  };
  error?: string;
}
```

---

## Period Analysis

### Get Cost Analysis

**Type**: Server Component Direct Query
**File**: `app/analysis/page.tsx`

**Query Parameters**:

```typescript
{
  startDate: string // Required, ISO date
  endDate: string // Required, ISO date
}
```

**Complex Query** (see data-model.md for full SQL):

Returns:

```typescript
{
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    totalPurchases: number
    totalRevenue: number
    totalProfit: number
    overallMargin: number // Percentage
  }
  menuAnalysis: Array<{
    menuName: string
    purchaseCost: number // Direct purchases for this menu
    allocatedCost: number // Cost after distribution %
    distributionPercentage: number
    revenue: number
    profit: number // revenue - allocatedCost
    marginPercentage: number // (profit / revenue) * 100
  }>
}
```

**Server Component**:

```typescript
export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: { startDate: string; endDate: string };
}) {
  const { startDate, endDate } = searchParams;

  // Execute margin analysis query from data-model.md
  const analysis = await getMarginAnalysis(startDate, endDate);

  return <AnalysisView data={analysis} />;
}
```

---

## Error Handling

### Standard Error Response

All Server Actions return:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string[]>; // Zod validation errors
}
```

### Common Error Codes

- **400 Bad Request**: Validation failed (Zod schema)
- **404 Not Found**: Entity not found (e.g., invalid menuId)
- **409 Conflict**: Unique constraint violation
- **500 Internal Server Error**: Database or unexpected errors

### Error Messages (Korean)

```typescript
const errorMessages = {
  NOT_FOUND: '데이터를 찾을 수 없습니다.',
  DUPLICATE: '중복된 데이터가 있습니다.',
  VALIDATION_FAILED: '입력 값이 올바르지 않습니다.',
  INVALID_MENU_INGREDIENT: '메뉴와 재료 조합이 올바르지 않습니다.',
  DISTRIBUTION_SUM_ERROR: '배분 비율의 합계가 100%가 아닙니다.',
}
```

---

## Performance Considerations

### Server Component Caching

- Master data (menus, ingredients, SKUs): `revalidate: 300` (5 minutes)
- Transaction data (purchases, sales): `cache: 'no-store'` (always fresh)
- Analysis data: Dynamic based on date range

### Pagination

- Default page size: 50 records
- Maximum page size: 100 records
- Use cursor-based pagination for large datasets (future optimization)

### Database Connection Pooling

- Use `@vercel/postgres` connection pooling
- Limit concurrent connections: 10 (Vercel free tier)
- Close connections after each request

---

## TypeScript Types

All types are generated from Drizzle schema:

```typescript
// Generated by drizzle-kit
import { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import * as schema from './schema'

export type MenuCategory = InferSelectModel<typeof schema.menuCategories>
export type NewMenuCategory = InferInsertModel<typeof schema.menuCategories>

export type Ingredient = InferSelectModel<typeof schema.ingredients>
export type NewIngredient = InferInsertModel<typeof schema.ingredients>

// ... (similar for all entities)
```

---

## Testing Strategy

### Server Action Testing

```typescript
// Example: test purchase creation
test('createPurchase validates menu-ingredient combination', async () => {
  const formData = new FormData()
  formData.append('transactionDate', '2026-01-04')
  formData.append('menuId', validMenuId)
  formData.append('ingredientId', invalidIngredientId) // Not linked
  formData.append('supplierName', 'Test Supplier')
  formData.append('quantity', '10')
  formData.append('unitPrice', '1000')

  const result = await createPurchase(formData)

  expect(result.success).toBe(true)
  expect(result.data?.isValid).toBe(false) // Trigger sets this
})
```

### API Integration Tests

Use test database with seeded data:

1. Create test menu, ingredients, and links
2. Call Server Action
3. Verify database state
4. Rollback transaction (or use separate test DB)

---

## Migration from Excel

**Endpoint**: One-time import script (not exposed as API)

**File**: `scripts/import-excel.ts`

**Process**:

1. Parse Excel file using `xlsx`
2. Insert master data
3. Insert historical transactions
4. Validate all data
5. Generate import report

**Run**: `npm run import:excel -- path/to/매입_판매_원가.xlsx`

**Output**: JSON report with counts, errors, and validation warnings
