# Data Model

**Feature**: Purchase, Sales, and Cost Management System
**Branch**: `1-purchase-sales-management`
**Database**: PostgreSQL (Vercel Postgres)
**ORM**: Drizzle ORM

## Entity Relationship Overview

```
┌─────────────┐         ┌──────────────┐
│   Menu      │◄───────┤  MenuIngredient │
│ Category    │    1:N  │  (Junction)     │
└─────────────┘         └──────────────┘
                               │ N:1
                               ▼
                        ┌──────────────┐
                        │  Ingredient  │
                        └──────────────┘
                               ▲ N:1
                               │
┌─────────────┐         ┌──────────────┐
│  Purchase   │─────────┤              │
│ Transaction │         │              │
└─────────────┘         └──────────────┘

┌─────────────┐         ┌──────────────┐
│  SKU        │◄────────┤  Sales       │
│             │    1:N  │  Record      │
└─────────────┘         └──────────────┘
      │ N:1
      ▼
┌─────────────┐
│   Menu      │
│  Category   │
└─────────────┘

┌─────────────┐
│   Cost      │
│ Distribution│
│    Rule     │
└─────────────┘
      │ N:1
      ▼
┌─────────────┐
│   Menu      │
│  Category   │
└─────────────┘
```

---

## Core Entities

### 1. Menu Category

Represents a product category sold to customers (e.g., "양념치킨", "순살치킨", "파닭치킨").

**Table**: `menu_categories`

| Column        | Type         | Constraints                             | Description                 |
| ------------- | ------------ | --------------------------------------- | --------------------------- |
| id            | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier           |
| name          | VARCHAR(100) | NOT NULL, UNIQUE                        | Menu category name (Korean) |
| display_order | INTEGER      | NOT NULL, DEFAULT 0                     | Display sort order in UI    |
| is_active     | BOOLEAN      | NOT NULL, DEFAULT true                  | Soft delete flag            |
| created_at    | TIMESTAMP    | NOT NULL, DEFAULT NOW()                 | Creation timestamp          |
| updated_at    | TIMESTAMP    | NOT NULL, DEFAULT NOW()                 | Last update timestamp       |

**Indexes**:

- `idx_menu_categories_name` on `name` (for lookup performance)
- `idx_menu_categories_active` on `is_active, display_order` (for active list queries)

**Validation Rules**:

- `name` must be unique and non-empty
- `display_order` must be >= 0

**Sample Data**:

```sql
INSERT INTO menu_categories (name, display_order) VALUES
('양념치킨', 1),
('순살치킨', 2),
('파닭치킨', 3);
```

---

### 2. Ingredient

Represents a raw material or supply item used in menu preparation.

**Table**: `ingredients`

| Column     | Type         | Constraints                             | Description                                            |
| ---------- | ------------ | --------------------------------------- | ------------------------------------------------------ |
| id         | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier                                      |
| name       | VARCHAR(200) | NOT NULL, UNIQUE                        | Ingredient name (Korean)                               |
| category   | VARCHAR(50)  | NULL                                    | Optional categorization (e.g., "육류", "소스", "포장") |
| is_active  | BOOLEAN      | NOT NULL, DEFAULT true                  | Soft delete flag                                       |
| created_at | TIMESTAMP    | NOT NULL, DEFAULT NOW()                 | Creation timestamp                                     |
| updated_at | TIMESTAMP    | NOT NULL, DEFAULT NOW()                 | Last update timestamp                                  |

**Indexes**:

- `idx_ingredients_name` on `name` (for validation lookups)
- `idx_ingredients_category` on `category, is_active` (for filtered lists)

**Validation Rules**:

- `name` must be unique and non-empty

**Sample Data**:

```sql
INSERT INTO ingredients (name, category) VALUES
('냉동 닭다리살', '육류'),
('닭날개', '육류'),
('양념소스', '소스'),
('LPG가스', '기타');
```

---

### 3. Menu Ingredient (Junction Table)

Defines which ingredients are valid for each menu category. Used for purchase entry validation.

**Table**: `menu_ingredients`

| Column        | Type      | Constraints                                                   | Description             |
| ------------- | --------- | ------------------------------------------------------------- | ----------------------- |
| id            | UUID      | PRIMARY KEY, DEFAULT uuid_generate_v4()                       | Unique identifier       |
| menu_id       | UUID      | NOT NULL, FOREIGN KEY → menu_categories(id) ON DELETE CASCADE | Menu category reference |
| ingredient_id | UUID      | NOT NULL, FOREIGN KEY → ingredients(id) ON DELETE CASCADE     | Ingredient reference    |
| created_at    | TIMESTAMP | NOT NULL, DEFAULT NOW()                                       | Creation timestamp      |

**Constraints**:

- `UNIQUE(menu_id, ingredient_id)` - Prevent duplicate menu-ingredient pairs

**Indexes**:

- `idx_menu_ingredients_lookup` on `(menu_id, ingredient_id)` (for validation queries)
- `idx_menu_ingredients_menu` on `menu_id` (for menu detail pages)

**Validation Rules**:

- Both `menu_id` and `ingredient_id` must reference existing active records

**Sample Data**:

```sql
-- 양념치킨 uses multiple ingredients
INSERT INTO menu_ingredients (menu_id, ingredient_id)
SELECT m.id, i.id
FROM menu_categories m, ingredients i
WHERE m.name = '양념치킨'
AND i.name IN ('냉동 닭다리살', '양념소스', 'LPG가스');
```

---

### 4. Purchase Transaction

Represents a single purchase event of ingredients from suppliers.

**Table**: `purchase_transactions`

| Column           | Type          | Constraints                                                   | Description                                     |
| ---------------- | ------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| id               | UUID          | PRIMARY KEY, DEFAULT uuid_generate_v4()                       | Unique identifier                               |
| transaction_date | DATE          | NOT NULL                                                      | Purchase date                                   |
| menu_id          | UUID          | NOT NULL, FOREIGN KEY → menu_categories(id)                   | Menu category for this purchase                 |
| ingredient_id    | UUID          | NOT NULL, FOREIGN KEY → ingredients(id)                       | Ingredient purchased                            |
| supplier_name    | VARCHAR(200)  | NOT NULL                                                      | Supplier/vendor name                            |
| quantity         | DECIMAL(10,2) | NOT NULL, CHECK (quantity > 0)                                | Quantity purchased                              |
| unit_price       | DECIMAL(12,2) | NOT NULL, CHECK (unit_price >= 0)                             | Price per unit (₩)                              |
| unit_description | VARCHAR(100)  | NULL                                                          | Unit description (e.g., "10KG", "박스")         |
| total_amount     | DECIMAL(14,2) | NOT NULL, GENERATED ALWAYS AS (quantity \* unit_price) STORED | Calculated total (₩)                            |
| is_valid         | BOOLEAN       | NOT NULL, DEFAULT true                                        | Validation status (menu-ingredient combination) |
| notes            | TEXT          | NULL                                                          | Optional notes                                  |
| created_at       | TIMESTAMP     | NOT NULL, DEFAULT NOW()                                       | Record creation timestamp                       |
| updated_at       | TIMESTAMP     | NOT NULL, DEFAULT NOW()                                       | Last update timestamp                           |

**Indexes**:

- `idx_purchases_date` on `transaction_date DESC` (for history queries)
- `idx_purchases_menu_date` on `(menu_id, transaction_date)` (for period analysis)
- `idx_purchases_validation` on `(menu_id, ingredient_id)` (for validation checks)

**Validation Rules**:

- `quantity` must be > 0
- `unit_price` must be >= 0 (allow zero for promotional items)
- `total_amount` is auto-calculated and read-only
- `is_valid` is set based on menu_ingredients table lookup

**Triggers**:

```sql
-- Validate menu-ingredient combination on insert/update
CREATE OR REPLACE FUNCTION validate_purchase_transaction()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_valid := EXISTS (
        SELECT 1 FROM menu_ingredients
        WHERE menu_id = NEW.menu_id
        AND ingredient_id = NEW.ingredient_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_purchase_validity
BEFORE INSERT OR UPDATE ON purchase_transactions
FOR EACH ROW
EXECUTE FUNCTION validate_purchase_transaction();
```

---

### 5. SKU (Sales Unit)

Represents a product sold to customers with pricing and ingredient conversion information.

**Table**: `skus`

| Column            | Type          | Constraints                                 | Description                                       |
| ----------------- | ------------- | ------------------------------------------- | ------------------------------------------------- |
| id                | UUID          | PRIMARY KEY, DEFAULT uuid_generate_v4()     | Unique identifier                                 |
| sku_code          | VARCHAR(100)  | NOT NULL, UNIQUE                            | SKU identifier (e.g., "양념치킨\_봉")             |
| menu_id           | UUID          | NOT NULL, FOREIGN KEY → menu_categories(id) | Menu category                                     |
| sales_unit_name   | VARCHAR(100)  | NOT NULL                                    | Display name (e.g., "봉", "박스(대)", "박스(소)") |
| conversion_factor | DECIMAL(8,4)  | NOT NULL, CHECK (conversion_factor > 0)     | Conversion to base unit for cost calculation      |
| selling_price     | DECIMAL(10,2) | NOT NULL, CHECK (selling_price >= 0)        | Sales price (₩)                                   |
| description       | VARCHAR(200)  | NULL                                        | Optional description (e.g., "1봉 = 95g 기준")     |
| is_active         | BOOLEAN       | NOT NULL, DEFAULT true                      | Soft delete flag                                  |
| created_at        | TIMESTAMP     | NOT NULL, DEFAULT NOW()                     | Creation timestamp                                |
| updated_at        | TIMESTAMP     | NOT NULL, DEFAULT NOW()                     | Last update timestamp                             |

**Indexes**:

- `idx_skus_code` on `sku_code` (for sales entry lookups)
- `idx_skus_menu` on `(menu_id, is_active)` (for menu-specific SKU lists)

**Validation Rules**:

- `sku_code` must be unique
- `conversion_factor` must be > 0
- `selling_price` must be >= 0

**Sample Data**:

```sql
INSERT INTO skus (sku_code, menu_id, sales_unit_name, conversion_factor, selling_price, description)
SELECT
    '양념치킨_봉',
    (SELECT id FROM menu_categories WHERE name = '양념치킨'),
    '봉',
    1.0,
    15000,
    '1봉 = 치킨 95g 기준';

INSERT INTO skus (sku_code, menu_id, sales_unit_name, conversion_factor, selling_price, description)
SELECT
    '양념치킨_박스(대)',
    (SELECT id FROM menu_categories WHERE name = '양념치킨'),
    '박스(대)',
    2.84,
    40000,
    '1박스(대) = 270g';
```

---

### 6. Sales Record

Represents daily sales quantities by SKU.

**Table**: `sales_records`

| Column     | Type          | Constraints                             | Description               |
| ---------- | ------------- | --------------------------------------- | ------------------------- |
| id         | UUID          | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier         |
| sales_date | DATE          | NOT NULL                                | Sales date                |
| sku_id     | UUID          | NOT NULL, FOREIGN KEY → skus(id)        | SKU sold                  |
| quantity   | DECIMAL(10,2) | NOT NULL, CHECK (quantity >= 0)         | Quantity sold             |
| notes      | TEXT          | NULL                                    | Optional notes            |
| created_at | TIMESTAMP     | NOT NULL, DEFAULT NOW()                 | Record creation timestamp |
| updated_at | TIMESTAMP     | NOT NULL, DEFAULT NOW()                 | Last update timestamp     |

**Constraints**:

- `UNIQUE(sales_date, sku_id)` - One record per SKU per day

**Indexes**:

- `idx_sales_date` on `sales_date DESC` (for history queries)
- `idx_sales_sku_date` on `(sku_id, sales_date)` (for SKU-specific history)

**Validation Rules**:

- `quantity` must be >= 0 (allow zero for no sales days)
- Unique combination of `sales_date` and `sku_id`

**Computed Fields** (via joins):

- Daily revenue: `SUM(quantity * skus.selling_price) GROUP BY sales_date`
- Ingredient equivalent: `quantity * skus.conversion_factor`

---

### 7. Cost Distribution Rule

Represents the percentage allocation of costs to each menu category for period analysis.

**Table**: `cost_distribution_rules`

| Column                  | Type         | Constraints                                                                       | Description              |
| ----------------------- | ------------ | --------------------------------------------------------------------------------- | ------------------------ |
| id                      | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4()                                           | Unique identifier        |
| menu_id                 | UUID         | NOT NULL, UNIQUE, FOREIGN KEY → menu_categories(id)                               | Menu category            |
| distribution_percentage | DECIMAL(5,2) | NOT NULL, CHECK (distribution_percentage >= 0 AND distribution_percentage <= 100) | Percentage (0.00-100.00) |
| created_at              | TIMESTAMP    | NOT NULL, DEFAULT NOW()                                                           | Creation timestamp       |
| updated_at              | TIMESTAMP    | NOT NULL, DEFAULT NOW()                                                           | Last update timestamp    |

**Indexes**:

- `idx_cost_dist_menu` on `menu_id` (for lookup)

**Validation Rules**:

- `distribution_percentage` must be between 0 and 100
- One rule per menu category
- **Business Rule**: SUM of all distribution_percentage values must equal 100.00 (enforced in application logic)

**Sample Data**:

```sql
INSERT INTO cost_distribution_rules (menu_id, distribution_percentage)
SELECT id, percentage FROM (VALUES
    ((SELECT id FROM menu_categories WHERE name = '양념치킨'), 40.00),
    ((SELECT id FROM menu_categories WHERE name = '순살치킨'), 25.00),
    ((SELECT id FROM menu_categories WHERE name = '파닭치킨'), 20.00),
    ((SELECT id FROM menu_categories WHERE name = '기타'), 15.00)
) AS v(id, percentage);
```

---

## Computed Queries

### Period Cost Analysis

**Query**: Calculate total purchase costs by menu category for date range

```sql
SELECT
    mc.name AS menu_name,
    SUM(pt.total_amount) AS total_purchase_cost
FROM purchase_transactions pt
JOIN menu_categories mc ON pt.menu_id = mc.id
WHERE pt.transaction_date BETWEEN :start_date AND :end_date
GROUP BY mc.id, mc.name
ORDER BY mc.display_order;
```

---

### Allocated Cost Calculation

**Query**: Apply distribution percentages to allocate costs to menus

```sql
WITH total_cost AS (
    SELECT SUM(total_amount) AS grand_total
    FROM purchase_transactions
    WHERE transaction_date BETWEEN :start_date AND :end_date
)
SELECT
    mc.name AS menu_name,
    cdr.distribution_percentage,
    (tc.grand_total * cdr.distribution_percentage / 100.0) AS allocated_cost
FROM menu_categories mc
JOIN cost_distribution_rules cdr ON mc.id = cdr.menu_id
CROSS JOIN total_cost tc
ORDER BY mc.display_order;
```

---

### Revenue Calculation

**Query**: Calculate total revenue by menu for date range

```sql
SELECT
    mc.name AS menu_name,
    SUM(sr.quantity * s.selling_price) AS total_revenue
FROM sales_records sr
JOIN skus s ON sr.sku_id = s.id
JOIN menu_categories mc ON s.menu_id = mc.id
WHERE sr.sales_date BETWEEN :start_date AND :end_date
GROUP BY mc.id, mc.name
ORDER BY mc.display_order;
```

---

### Margin Analysis

**Query**: Combine revenue and allocated cost to calculate margins

```sql
WITH revenue AS (
    SELECT
        mc.id AS menu_id,
        mc.name AS menu_name,
        SUM(sr.quantity * s.selling_price) AS total_revenue
    FROM sales_records sr
    JOIN skus s ON sr.sku_id = s.id
    JOIN menu_categories mc ON s.menu_id = mc.id
    WHERE sr.sales_date BETWEEN :start_date AND :end_date
    GROUP BY mc.id, mc.name
),
total_cost AS (
    SELECT SUM(total_amount) AS grand_total
    FROM purchase_transactions
    WHERE transaction_date BETWEEN :start_date AND :end_date
),
allocated AS (
    SELECT
        mc.id AS menu_id,
        mc.name AS menu_name,
        (tc.grand_total * cdr.distribution_percentage / 100.0) AS allocated_cost
    FROM menu_categories mc
    JOIN cost_distribution_rules cdr ON mc.id = cdr.menu_id
    CROSS JOIN total_cost tc
)
SELECT
    COALESCE(r.menu_name, a.menu_name) AS menu_name,
    COALESCE(r.total_revenue, 0) AS revenue,
    COALESCE(a.allocated_cost, 0) AS cost,
    COALESCE(r.total_revenue, 0) - COALESCE(a.allocated_cost, 0) AS profit,
    CASE
        WHEN COALESCE(r.total_revenue, 0) > 0 THEN
            ((COALESCE(r.total_revenue, 0) - COALESCE(a.allocated_cost, 0)) / r.total_revenue * 100.0)
        ELSE 0
    END AS margin_percentage
FROM revenue r
FULL OUTER JOIN allocated a ON r.menu_id = a.menu_id
ORDER BY menu_name;
```

---

## Migration Strategy

### Initial Schema Creation

**File**: `drizzle/0000_initial_schema.sql`

Create all tables, indexes, constraints, and triggers in dependency order:

1. `menu_categories`
2. `ingredients`
3. `menu_ingredients`
4. `skus`
5. `purchase_transactions`
6. `sales_records`
7. `cost_distribution_rules`

### Seed Data from Excel

**File**: `scripts/seed-from-excel.ts`

Import existing Excel data:

1. Parse Excel sheets using `xlsx` package
2. Insert master data (menus from "메뉴" sheet, ingredients from "재료" sheet)
3. Create menu-ingredient relationships
4. Insert SKUs with conversion factors from "환산표" sheet
5. Insert historical purchases from "매입현황\_누적" sheet
6. Insert historical sales from "판매수량\_누적" sheet
7. Set up cost distribution rules from "기간분석" sheet

**Validation**:

- Compare row counts from Excel vs database
- Verify calculated totals match Excel formulas
- Check for any `is_valid = false` purchase records

---

## Data Integrity Rules

### Referential Integrity

- All foreign keys use `ON DELETE CASCADE` for dependent data
- Menu categories and ingredients use soft deletes (`is_active = false`) to preserve historical data
- Purchase transactions and sales records are immutable (updates create new records)

### Validation Triggers

- Purchase transaction validation trigger automatically sets `is_valid` flag
- Update timestamp triggers on all tables (`updated_at = NOW()`)

### Application-Level Constraints

- Cost distribution percentages must sum to 100% (validated before calculation)
- Negative quantities/prices only allowed with explicit "refund" flag
- Concurrent updates use optimistic locking via `updated_at` comparison

---

## Performance Considerations

### Expected Data Volume (1 Year)

- Purchase Transactions: ~600 records (50/month × 12)
- Sales Records: ~3,600 records (10 SKUs × 30 days × 12 months)
- Master Data: <100 records total

### Query Optimization

- All date range queries use indexes on date columns
- Menu-ingredient validation uses composite index for O(1) lookup
- Period analysis uses database aggregations (not client-side)
- Pagination for history views (LIMIT/OFFSET with keyset pagination for large datasets)

### Caching Strategy

- Master data (menus, ingredients, SKUs) cached in memory with 5-minute TTL
- Cost distribution rules cached until update
- Transaction data not cached (always fresh from database)
