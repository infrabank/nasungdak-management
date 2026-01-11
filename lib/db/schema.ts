import { pgTable, uuid, varchar, decimal, date, timestamp, boolean, text, integer, unique, jsonb } from 'drizzle-orm/pg-core'
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

// =====================
// Phase 2: 토스 POS 연동
// =====================

// 토스 SKU 매핑 테이블
export const tossSkuMappings = pgTable('toss_sku_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  tossItemCode: varchar('toss_item_code', { length: 50 }).notNull(),
  tossItemName: varchar('toss_item_name', { length: 100 }),
  skuId: uuid('sku_id').references(() => skus.id, { onDelete: 'set null' }), // NULL이면 미매핑
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 100 }),
}, (table) => ({
  uniqueStoreTossCode: unique('unique_store_toss_code').on(table.storeId, table.tossItemCode),
}))

// 토스 동기화 로그 테이블
export const tossSyncLogs = pgTable('toss_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  syncDate: date('sync_date').notNull(),
  syncType: varchar('sync_type', { length: 20 }).notNull(), // 'auto' | 'manual'
  status: varchar('status', { length: 20 }).notNull(), // 'success' | 'partial' | 'failed'
  totalRecords: integer('total_records'),
  successCount: integer('success_count'),
  failedCount: integer('failed_count'),
  errorDetails: jsonb('error_details'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdBy: varchar('created_by', { length: 100 }),
})

// =====================
// Phase 3: 재고 관리 & 알림
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
export type TossSkuMapping = typeof tossSkuMappings.$inferSelect
export type NewTossSkuMapping = typeof tossSkuMappings.$inferInsert
export type TossSyncLog = typeof tossSyncLogs.$inferSelect
export type NewTossSyncLog = typeof tossSyncLogs.$inferInsert
export type Inventory = typeof inventory.$inferSelect
export type NewInventory = typeof inventory.$inferInsert
export type InventoryAlertRule = typeof inventoryAlertRules.$inferSelect
export type NewInventoryAlertRule = typeof inventoryAlertRules.$inferInsert
export type InventoryEvent = typeof inventoryEvents.$inferSelect
export type NewInventoryEvent = typeof inventoryEvents.$inferInsert
export type AlertHistory = typeof alertHistory.$inferSelect
export type NewAlertHistory = typeof alertHistory.$inferInsert

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
