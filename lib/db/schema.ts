import { pgTable, uuid, varchar, decimal, date, timestamp, boolean, text, integer, unique, jsonb, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Stores Table (다매장 지원)
export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeName: varchar('store_name', { length: 100 }).notNull(),
  storeCode: varchar('store_code', { length: 20 }).notNull().unique(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  managerPhone: varchar('manager_phone', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// Suppliers Table (공급업체)
export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierName: varchar('supplier_name', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  address: text('address'),
  businessNumber: varchar('business_number', { length: 20 }), // 사업자등록번호
  notes: text('notes'),
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
}, (table) => [
  index('skus_deleted_at_idx').on(table.deletedAt),
  index('skus_menu_id_idx').on(table.menuId),
])

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
}, (table) => [
  index('mi_deleted_at_idx').on(table.deletedAt),
  // Composite index for menu-ingredient lookup (used for validation)
  index('mi_menu_ingredient_idx').on(table.menuId, table.ingredientId),
])

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
}, (table) => [
  // Performance indexes for common queries
  index('pt_deleted_at_idx').on(table.deletedAt),
  index('pt_store_id_idx').on(table.storeId),
  index('pt_transaction_date_idx').on(table.transactionDate.desc()),
  index('pt_menu_id_idx').on(table.menuId),
  index('pt_ingredient_id_idx').on(table.ingredientId),
  // Composite index for date range + store filtering (most common query pattern)
  index('pt_store_date_idx').on(table.storeId, table.transactionDate.desc()),
])

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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
}, (table) => [
  // Performance indexes for common queries
  index('sr_deleted_at_idx').on(table.deletedAt),
  index('sr_store_id_idx').on(table.storeId),
  index('sr_sale_date_idx').on(table.saleDate.desc()),
  index('sr_sku_id_idx').on(table.skuId),
  // Composite index for date range + store filtering (most common query pattern)
  index('sr_store_date_idx').on(table.storeId, table.saleDate.desc()),
])

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
}, (table) => [
  index('fc_deleted_at_idx').on(table.deletedAt),
  index('fc_store_id_idx').on(table.storeId),
  index('fc_cost_date_idx').on(table.costDate.desc()),
])

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
}, (table) => [
  index('och_deleted_at_idx').on(table.deletedAt),
  index('och_store_id_idx').on(table.storeId),
  index('och_change_date_idx').on(table.changeDate.desc()),
])

// =====================
// 재고 관리 & 알림
// =====================

// 재고 테이블 (매장별 현재 재고)
export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id),
  currentQuantity: decimal('current_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  unit: varchar('unit', { length: 20 }),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
})

// 재고 알림 규칙 테이블
export const inventoryAlertRules = pgTable('inventory_alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id), // NULL이면 전체 매장 적용
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id),
  alertThresholdDays: integer('alert_threshold_days').notNull().default(3), // 알림 임계값 (잔여일)
  predictionPeriodDays: integer('prediction_period_days').notNull().default(30), // 예측 기간 (30일)
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
})

// 재고 이벤트 테이블 (폐기/실사/조정)
export const inventoryEvents = pgTable('inventory_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id),
  eventType: varchar('event_type', { length: 20 }).notNull(), // 'purchase' | 'sale' | 'waste' | 'audit' | 'adjustment'
  quantityChange: decimal('quantity_change', { precision: 10, scale: 2 }).notNull(), // 양수: 증가, 음수: 감소
  reason: text('reason'),
  eventDate: date('event_date').notNull(),
  referenceId: uuid('reference_id'), // 매입/판매 ID 참조
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
})

// 알림 발송 이력 테이블
export const alertHistory = pgTable('alert_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id),
  alertType: varchar('alert_type', { length: 30 }).notNull(), // 'inventory_low' | 'sync_failed'
  ingredientId: uuid('ingredient_id').references(() => ingredients.id),
  message: text('message'),
  channel: varchar('channel', { length: 20 }).notNull().default('kakao'),
  recipient: varchar('recipient', { length: 50 }),
  status: varchar('status', { length: 20 }), // 'sent' | 'failed'
  externalId: varchar('external_id', { length: 100 }), // 카카오 메시지 ID
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Store = typeof stores.$inferSelect
export type NewStore = typeof stores.$inferInsert
export type Inventory = typeof inventory.$inferSelect
export type NewInventory = typeof inventory.$inferInsert
export type InventoryAlertRule = typeof inventoryAlertRules.$inferSelect
export type NewInventoryAlertRule = typeof inventoryAlertRules.$inferInsert
export type InventoryEvent = typeof inventoryEvents.$inferSelect
export type NewInventoryEvent = typeof inventoryEvents.$inferInsert
export type AlertHistory = typeof alertHistory.$inferSelect
export type NewAlertHistory = typeof alertHistory.$inferInsert

export type Supplier = typeof suppliers.$inferSelect
export type NewSupplier = typeof suppliers.$inferInsert

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
