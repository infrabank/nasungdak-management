import { pgTable, uuid, varchar, decimal, date, timestamp, boolean, text, integer, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Stores Table (다매장 지원)
export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeName: varchar('store_name', { length: 100 }).notNull(),
  storeCode: varchar('store_code', { length: 20 }).notNull().unique(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  managerPhone: varchar('manager_phone', { length: 20 }),
  tossStoreId: varchar('toss_store_id', { length: 50 }), // 토스 POS 연동용
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Menu Categories Table
export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuName: varchar('menu_name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Ingredients Table
export const ingredients = pgTable('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  ingredientName: varchar('ingredient_name', { length: 100 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  description: varchar('description', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// SKUs (Stock Keeping Units) Table
export const skus = pgTable('skus', {
  id: uuid('id').primaryKey().defaultRandom(),
  skuName: varchar('sku_name', { length: 100 }).notNull(),
  menuId: uuid('menu_id').notNull().references(() => menuCategories.id),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Menu-Ingredient Junction Table
export const menuIngredients = pgTable('menu_ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuId: uuid('menu_id').notNull().references(() => menuCategories.id),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id),
  requiredQuantity: decimal('required_quantity', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Purchase Transactions Table
export const purchaseTransactions = pgTable('purchase_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id), // 다매장 지원
  transactionDate: date('transaction_date').notNull(),
  menuId: uuid('menu_id').notNull().references(() => menuCategories.id),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id),
  supplierName: varchar('supplier_name', { length: 200 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`quantity * unit_price`
  ),
  isValid: boolean('is_valid').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Sales Records Table
export const salesRecords = pgTable('sales_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id), // 다매장 지원
  saleDate: date('sale_date').notNull(),
  skuId: uuid('sku_id').notNull().references(() => skus.id),
  quantitySold: decimal('quantity_sold', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalRevenue: decimal('total_revenue', { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`quantity_sold * unit_price`
  ),
  tossSyncId: uuid('toss_sync_id'), // 토스 동기화 추적용 (Phase 2)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Cost Distribution Rules Table
export const costDistributionRules = pgTable('cost_distribution_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuId: uuid('menu_id').notNull().references(() => menuCategories.id),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id),
  distributionPercent: decimal('distribution_percent', { precision: 5, scale: 2 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Fixed Costs Table
export const fixedCosts = pgTable('fixed_costs', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id), // 다매장 지원
  costDate: date('cost_date').notNull(),
  costType: varchar('cost_type', { length: 50 }).notNull(), // 인건비, 임대료, 관리비, 기타
  costName: varchar('cost_name', { length: 200 }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Oil Change History Table
export const oilChangeHistory = pgTable('oil_change_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id), // 다매장 지원
  changeDate: date('change_date').notNull(),
  fryerType: varchar('fryer_type', { length: 20 }).notNull(), // '초벌', '재벌'
  oilType: varchar('oil_type', { length: 50 }).notNull().default('해바라기씨유'),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(), // 교체된 기름 양 (L)
  supplierName: varchar('supplier_name', { length: 200 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(), // 단가 (원/L)
  totalCost: decimal('total_cost', { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`quantity * unit_price`
  ),
  previousOilUsage: decimal('previous_oil_usage', { precision: 10, scale: 2 }), // 이전 기름 사용량 (L)
  usageDays: integer('usage_days'), // 사용 기간 (일)
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// TypeScript Types
export type Store = typeof stores.$inferSelect
export type NewStore = typeof stores.$inferInsert

export type MenuCategory = typeof menuCategories.$inferSelect
export type NewMenuCategory = typeof menuCategories.$inferInsert

export type Ingredient = typeof ingredients.$inferSelect
export type NewIngredient = typeof ingredients.$inferInsert

export type SKU = typeof skus.$inferSelect
export type NewSKU = typeof skus.$inferInsert

export type MenuIngredient = typeof menuIngredients.$inferSelect
export type NewMenuIngredient = typeof menuIngredients.$inferInsert

export type PurchaseTransaction = typeof purchaseTransactions.$inferSelect
export type NewPurchaseTransaction = typeof purchaseTransactions.$inferInsert

export type SalesRecord = typeof salesRecords.$inferSelect
export type NewSalesRecord = typeof salesRecords.$inferInsert

export type CostDistributionRule = typeof costDistributionRules.$inferSelect
export type NewCostDistributionRule = typeof costDistributionRules.$inferInsert

export type FixedCost = typeof fixedCosts.$inferSelect
export type NewFixedCost = typeof fixedCosts.$inferInsert

export type OilChangeHistory = typeof oilChangeHistory.$inferSelect
export type NewOilChangeHistory = typeof oilChangeHistory.$inferInsert
