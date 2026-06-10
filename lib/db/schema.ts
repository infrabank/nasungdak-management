import {
  pgTable,
  uuid,
  varchar,
  decimal,
  date,
  timestamp,
  boolean,
  text,
  integer,
  unique,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Stores Table (다매장 지원)
export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id'), // FK는 마이그레이션에서 추가 (organizations 테이블 생성 후)
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
  },
  (table) => [index('stores_org_id_idx').on(table.organizationId)]
)

// Suppliers Table (공급업체)
export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id), // Multi-tenancy 지원
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
  },
  (table) => [index('suppliers_org_id_idx').on(table.organizationId)]
)

// Menu Categories Table
export const menuCategories = pgTable(
  'menu_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id), // Multi-tenancy 지원
    menuName: varchar('menu_name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [index('menu_categories_org_id_idx').on(table.organizationId)]
)

// Ingredients Table
export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id), // Multi-tenancy 지원
    ingredientName: varchar('ingredient_name', { length: 100 }).notNull(),
    barcode: varchar('barcode', { length: 50 }), // 바코드 (EAN-13, 자체코드 등)
    isOneTime: boolean('is_one_time').notNull().default(false), // 일회성 재료 여부
    unit: varchar('unit', { length: 20 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 2 }), // 단위당 원가 (원/unit)
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('ingredients_org_id_idx').on(table.organizationId),
    index('ingredients_barcode_idx').on(table.barcode),
  ]
)

// SKUs (Stock Keeping Units) Table
export const skus = pgTable(
  'skus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id), // Multi-tenancy 지원
    skuName: varchar('sku_name', { length: 100 }).notNull(),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menuCategories.id),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('skus_deleted_at_idx').on(table.deletedAt),
    index('skus_menu_id_idx').on(table.menuId),
    index('skus_org_id_idx').on(table.organizationId),
  ]
)

// Menu-Ingredient Junction Table
export const menuIngredients = pgTable(
  'menu_ingredients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id), // Multi-tenancy 지원
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menuCategories.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    requiredQuantity: decimal('required_quantity', {
      precision: 10,
      scale: 2,
    }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('mi_deleted_at_idx').on(table.deletedAt),
    // Composite index for menu-ingredient lookup (used for validation)
    index('mi_menu_ingredient_idx').on(table.menuId, table.ingredientId),
    index('mi_org_id_idx').on(table.organizationId),
  ]
)

// Purchase Transactions Table
export const purchaseTransactions = pgTable(
  'purchase_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id').references(() => stores.id), // 다매장 지원
    transactionDate: date('transaction_date').notNull(),
    menuId: uuid('menu_id').references(() => menuCategories.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    category: varchar('category', { length: 100 }),
    supplierName: varchar('supplier_name', { length: 200 }).notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    totalAmount: decimal('total_amount', {
      precision: 14,
      scale: 2,
    }).generatedAlwaysAs(sql`quantity * unit_price`),
    isValid: boolean('is_valid').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    // Performance indexes for common queries
    index('pt_deleted_at_idx').on(table.deletedAt),
    index('pt_store_id_idx').on(table.storeId),
    index('pt_transaction_date_idx').on(table.transactionDate.desc()),
    index('pt_menu_id_idx').on(table.menuId),
    index('pt_ingredient_id_idx').on(table.ingredientId),
    // Composite index for date range + store filtering (most common query pattern)
    index('pt_store_date_idx').on(table.storeId, table.transactionDate.desc()),
    index('pt_ingredient_date_idx').on(
      table.ingredientId,
      table.transactionDate.desc()
    ),
  ]
)

// Sales Records Table
export const salesRecords = pgTable(
  'sales_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id').references(() => stores.id), // 다매장 지원
    saleDate: date('sale_date').notNull(),
    skuId: uuid('sku_id')
      .notNull()
      .references(() => skus.id),
    quantitySold: decimal('quantity_sold', {
      precision: 10,
      scale: 2,
    }).notNull(),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    totalRevenue: decimal('total_revenue', {
      precision: 14,
      scale: 2,
    }).generatedAlwaysAs(sql`quantity_sold * unit_price`),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    // Performance indexes for common queries
    index('sr_deleted_at_idx').on(table.deletedAt),
    index('sr_store_id_idx').on(table.storeId),
    index('sr_sale_date_idx').on(table.saleDate.desc()),
    index('sr_sku_id_idx').on(table.skuId),
    // Composite index for date range + store filtering (most common query pattern)
    index('sr_store_date_idx').on(table.storeId, table.saleDate.desc()),
  ]
)

// Cost Distribution Rules Table
export const costDistributionRules = pgTable(
  'cost_distribution_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id), // Multi-tenancy 지원
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menuCategories.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    distributionPercent: decimal('distribution_percent', {
      precision: 5,
      scale: 2,
    }).notNull(),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [index('cdr_org_id_idx').on(table.organizationId)]
)

// Fixed Costs Table
export const fixedCosts = pgTable(
  'fixed_costs',
  {
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
  },
  (table) => [
    index('fc_deleted_at_idx').on(table.deletedAt),
    index('fc_store_id_idx').on(table.storeId),
    index('fc_cost_date_idx').on(table.costDate.desc()),
  ]
)

// Oil Change History Table
export const oilChangeHistory = pgTable(
  'oil_change_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id').references(() => stores.id), // 다매장 지원
    changeDate: date('change_date').notNull(),
    fryerType: varchar('fryer_type', { length: 20 }).notNull(), // '초벌', '재벌'
    oilType: varchar('oil_type', { length: 50 })
      .notNull()
      .default('해바라기씨유'),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(), // 교체된 기름 양 (L)
    supplierName: varchar('supplier_name', { length: 200 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(), // 단가 (원/L)
    totalCost: decimal('total_cost', {
      precision: 14,
      scale: 2,
    }).generatedAlwaysAs(sql`quantity * unit_price`),
    previousOilUsage: decimal('previous_oil_usage', {
      precision: 10,
      scale: 2,
    }), // 이전 기름 사용량 (L)
    usageDays: integer('usage_days'), // 사용 기간 (일)
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('och_deleted_at_idx').on(table.deletedAt),
    index('och_store_id_idx').on(table.storeId),
    index('och_change_date_idx').on(table.changeDate.desc()),
  ]
)

// =====================
// 직원 관리 & 출퇴근 기록
// =====================

// Employees Table (직원)
export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id').references(() => stores.id), // 다매장 지원 (nullable in DB, app enforces required)
    employeeName: varchar('employee_name', { length: 100 }).notNull(),
    hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    hireDate: date('hire_date'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('emp_deleted_at_idx').on(table.deletedAt),
    index('emp_store_id_idx').on(table.storeId),
  ]
)

// Attendance Records Table (출퇴근 기록)
export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id').references(() => stores.id), // 다매장 지원 (employee.storeId와 동일하게 설정)
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    workDate: date('work_date').notNull(),
    workHours: decimal('work_hours', { precision: 5, scale: 2 }).notNull(),
    hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(), // 스냅샷 (직원 시급 변경에 영향 안 받음)
    totalPay: decimal('total_pay', { precision: 14, scale: 2 }).notNull(), // application 계산, NOT generated (수정 가능)
    fixedCostId: uuid('fixed_cost_id').references(() => fixedCosts.id), // 고정비 연동 추적
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('ar_deleted_at_idx').on(table.deletedAt),
    index('ar_store_id_idx').on(table.storeId),
    index('ar_employee_id_idx').on(table.employeeId),
    index('ar_work_date_idx').on(table.workDate.desc()),
    // Composite index for store + date filtering (common query pattern)
    index('ar_store_date_idx').on(table.storeId, table.workDate.desc()),
  ]
)

// =====================
// 재고 관리 & 알림
// =====================

// 재고 테이블 (매장별 현재 재고)
export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    currentQuantity: decimal('current_quantity', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    unit: varchar('unit', { length: 20 }),
    lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  },
  (table) => [
    index('inv_store_id_idx').on(table.storeId),
    index('inv_ingredient_id_idx').on(table.ingredientId),
    index('inv_store_ingredient_idx').on(table.storeId, table.ingredientId),
  ]
)

// 재고 알림 규칙 테이블
export const inventoryAlertRules = pgTable(
  'inventory_alert_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id').references(() => stores.id), // NULL이면 전체 매장 적용
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    alertThresholdDays: integer('alert_threshold_days').notNull().default(3), // 알림 임계값 (잔여일)
    predictionPeriodDays: integer('prediction_period_days')
      .notNull()
      .default(30), // 예측 기간 (30일)
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('iar_store_id_idx').on(table.storeId),
    index('iar_ingredient_id_idx').on(table.ingredientId),
    index('iar_deleted_at_idx').on(table.deletedAt),
  ]
)

// 재고 이벤트 테이블 (폐기/실사/조정)
export const inventoryEvents = pgTable(
  'inventory_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    eventType: varchar('event_type', { length: 20 }).notNull(), // 'purchase' | 'sale' | 'waste' | 'audit' | 'adjustment'
    quantityChange: decimal('quantity_change', {
      precision: 10,
      scale: 2,
    }).notNull(), // 양수: 증가, 음수: 감소
    reason: text('reason'),
    eventDate: date('event_date').notNull(),
    referenceId: uuid('reference_id'), // 매입/판매 ID 참조
    createdAt: timestamp('created_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
  },
  (table) => [
    index('ie_store_id_idx').on(table.storeId),
    index('ie_ingredient_id_idx').on(table.ingredientId),
    index('ie_event_date_idx').on(table.eventDate.desc()),
    index('ie_store_date_idx').on(table.storeId, table.eventDate.desc()),
  ]
)

// 알림 발송 이력 테이블
export const alertHistory = pgTable(
  'alert_history',
  {
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
  },
  (table) => [
    index('ah_store_id_idx').on(table.storeId),
    index('ah_ingredient_id_idx').on(table.ingredientId),
    index('ah_created_at_idx').on(table.createdAt.desc()),
  ]
)

// 일일 마감 테이블 (결제수단별 매출 합계 + 메모)
export const dailyClosings = pgTable(
  'daily_closings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id').references(() => stores.id),
    closingDate: date('closing_date').notNull(),
    cardSales: decimal('card_sales', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    cashSales: decimal('cash_sales', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    deliverySales: decimal('delivery_sales', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    memo: text('memo'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('dc_store_id_idx').on(table.storeId),
    index('dc_closing_date_idx').on(table.closingDate.desc()),
    unique('dc_store_date_unique').on(table.storeId, table.closingDate),
  ]
)

// =====================
// SaaS: 사용자 관리 & 권한
// =====================

// Users Table (사용자 계정)
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_deleted_at_idx').on(table.deletedAt),
  ]
)

// User Sessions Table (Refresh Token 저장)
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshToken: varchar('refresh_token', { length: 500 }).notNull(),
    deviceInfo: varchar('device_info', { length: 255 }), // User-Agent 정보
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4/IPv6
    expiresAt: timestamp('expires_at').notNull(),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'), // null이면 유효, 값이 있으면 폐기됨
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('user_sessions_user_id_idx').on(table.userId),
    index('user_sessions_refresh_token_idx').on(table.refreshToken),
    index('user_sessions_expires_at_idx').on(table.expiresAt),
  ]
)

// Roles Table (역할 정의)
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleName: varchar('role_name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 200 }),
  permissions: jsonb('permissions').notNull(), // {"purchases": ["read", "write"], "sales": ["read"]}
  isSystem: boolean('is_system').notNull().default(false), // 시스템 기본 역할 여부
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// User-Store Assignments Table (사용자-매장 매핑)
export const userStoreAssignments = pgTable(
  'user_store_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    assignedBy: uuid('assigned_by').references(() => users.id),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('usa_user_id_idx').on(table.userId),
    index('usa_store_id_idx').on(table.storeId),
    index('usa_deleted_at_idx').on(table.deletedAt),
    unique('usa_user_store_unique').on(table.userId, table.storeId),
  ]
)

// Audit Logs Table (감사 로그)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id').references(() => stores.id),
    userId: uuid('user_id').references(() => users.id),
    tableName: varchar('table_name', { length: 100 }).notNull(),
    recordId: uuid('record_id'),
    action: varchar('action', { length: 20 }).notNull(), // 'CREATE' | 'UPDATE' | 'DELETE'
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('al_store_id_idx').on(table.storeId),
    index('al_user_id_idx').on(table.userId),
    index('al_table_name_idx').on(table.tableName),
    index('al_created_at_idx').on(table.createdAt.desc()),
  ]
)

// =====================
// SaaS: 조직 & 구독 관리
// =====================

// Organizations Table (조직/회사)
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(), // URL용 슬러그
    plan: varchar('plan', { length: 50 }).notNull().default('free'), // 'free', 'basic', 'standard', 'premium', 'enterprise'
    maxStores: integer('max_stores').notNull().default(1),
    maxUsers: integer('max_users').notNull().default(3),
    billingEmail: varchar('billing_email', { length: 255 }),
    billingName: varchar('billing_name', { length: 200 }),
    businessNumber: varchar('business_number', { length: 20 }), // 사업자등록번호
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    logoUrl: varchar('logo_url', { length: 500 }),
    settings: jsonb('settings'), // 조직 설정
    isActive: boolean('is_active').notNull().default(true),
    trialEndsAt: timestamp('trial_ends_at'), // 무료 체험 종료일
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('org_slug_idx').on(table.slug),
    index('org_stripe_customer_idx').on(table.stripeCustomerId),
    index('org_deleted_at_idx').on(table.deletedAt),
  ]
)

// Subscriptions Table (구독)
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    plan: varchar('plan', { length: 50 }).notNull(), // 'basic', 'standard', 'premium', 'enterprise'
    status: varchar('status', { length: 30 }).notNull().default('active'), // 'active', 'past_due', 'canceled', 'trialing', 'paused'
    priceMonthly: integer('price_monthly').notNull(), // 월 금액 (원)
    priceYearly: integer('price_yearly'), // 연 금액 (원)
    billingCycle: varchar('billing_cycle', { length: 20 })
      .notNull()
      .default('monthly'), // 'monthly', 'yearly'
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('sub_org_id_idx').on(table.organizationId),
    index('sub_stripe_id_idx').on(table.stripeSubscriptionId),
    index('sub_status_idx').on(table.status),
  ]
)

// Invoices Table (청구서)
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
    status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft', 'pending', 'paid', 'failed', 'void'
    amount: integer('amount').notNull(), // 금액 (원)
    tax: integer('tax').notNull().default(0), // 세금 (원)
    total: integer('total').notNull(), // 총액 (원)
    currency: varchar('currency', { length: 10 }).notNull().default('KRW'),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    paidAt: timestamp('paid_at'),
    dueDate: date('due_date'),
    invoiceUrl: varchar('invoice_url', { length: 500 }),
    pdfUrl: varchar('pdf_url', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('inv_org_id_idx').on(table.organizationId),
    index('inv_stripe_id_idx').on(table.stripeInvoiceId),
    index('inv_status_idx').on(table.status),
  ]
)

// Webhook Events Table (멱등성을 위한 이벤트 추적)
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: varchar('event_id', { length: 255 }).notNull().unique(), // Stripe 이벤트 ID
    eventType: varchar('event_type', { length: 100 }).notNull(), // 'checkout.session.completed', etc.
    processedAt: timestamp('processed_at').notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('processed'), // 'processed', 'failed'
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
    payload: jsonb('payload'), // 이벤트 원본 데이터 (디버깅용)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('we_event_id_idx').on(table.eventId),
    index('we_event_type_idx').on(table.eventType),
    index('we_processed_at_idx').on(table.processedAt),
  ]
)

// Usage Metrics Table (사용량 추적)
export const usageMetrics = pgTable(
  'usage_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    metricType: varchar('metric_type', { length: 50 }).notNull(), // 'api_calls', 'storage', 'active_users', 'stores'
    metricValue: integer('metric_value').notNull(),
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('um_org_id_idx').on(table.organizationId),
    index('um_type_idx').on(table.metricType),
    index('um_period_idx').on(table.periodStart, table.periodEnd),
  ]
)

// Plan Features Table (플랜별 기능)
export const planFeatures = pgTable(
  'plan_features',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    plan: varchar('plan', { length: 50 }).notNull(), // 'free', 'basic', 'standard', 'premium', 'enterprise'
    featureKey: varchar('feature_key', { length: 100 }).notNull(), // 'purchases', 'sales', 'inventory', 'analytics', etc.
    enabled: boolean('enabled').notNull().default(true),
    limit: integer('limit'), // null = 무제한
    description: varchar('description', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('pf_plan_idx').on(table.plan),
    unique('pf_plan_feature_unique').on(table.plan, table.featureKey),
  ]
)

// Organization Members Table (조직 멤버)
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: varchar('role', { length: 30 }).notNull().default('member'), // 'owner', 'admin', 'member'
    invitedBy: uuid('invited_by').references(() => users.id),
    invitedAt: timestamp('invited_at').notNull().defaultNow(),
    joinedAt: timestamp('joined_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('om_org_id_idx').on(table.organizationId),
    index('om_user_id_idx').on(table.userId),
    unique('om_org_user_unique').on(table.organizationId, table.userId),
  ]
)

// Organization Invitations Table (초대)
export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 30 }).notNull().default('member'),
    token: varchar('token', { length: 100 }).notNull().unique(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('oi_org_id_idx').on(table.organizationId),
    index('oi_token_idx').on(table.token),
    index('oi_email_idx').on(table.email),
  ]
)

// SKU Recipes Table (SKU별 원재료 구성 - BOM)
export const skuRecipes = pgTable(
  'sku_recipes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    skuId: uuid('sku_id')
      .notNull()
      .references(() => skus.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    quantity: decimal('quantity', { precision: 10, scale: 4 }).notNull(), // 사용량 (예: 50g)
    unit: varchar('unit', { length: 20 }).notNull(), // 사용 단위 (g, ml, ea)
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('sku_recipes_org_id_idx').on(table.organizationId),
    index('sku_recipes_sku_id_idx').on(table.skuId),
    index('sku_recipes_deleted_at_idx').on(table.deletedAt),
    unique('sku_recipes_sku_ingredient_unique').on(
      table.skuId,
      table.ingredientId
    ),
  ]
)

// Sales Menus Table (판매 메뉴 - 단품/세트)
export const salesMenus = pgTable(
  'sales_menus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    menuName: varchar('menu_name', { length: 100 }).notNull(), // 예: "붕어빵 3개 세트"
    menuType: varchar('menu_type', { length: 20 }).notNull().default('single'), // 'single' | 'bundle'
    basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(), // 판매가
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('sales_menus_org_id_idx').on(table.organizationId),
    index('sales_menus_deleted_at_idx').on(table.deletedAt),
    index('sales_menus_type_idx').on(table.menuType),
  ]
)

// Sales Menu Items Table (메뉴 구성 - 세트에 포함된 SKU들)
export const salesMenuItems = pgTable(
  'sales_menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    salesMenuId: uuid('sales_menu_id')
      .notNull()
      .references(() => salesMenus.id),
    skuId: uuid('sku_id')
      .notNull()
      .references(() => skus.id),
    quantity: integer('quantity').notNull().default(1), // 세트에 포함되는 수량
    isRequired: boolean('is_required').notNull().default(true), // 필수 구성인지
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }),
    updatedBy: varchar('updated_by', { length: 100 }),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 100 }),
  },
  (table) => [
    index('sales_menu_items_org_id_idx').on(table.organizationId),
    index('sales_menu_items_menu_id_idx').on(table.salesMenuId),
    index('sales_menu_items_deleted_at_idx').on(table.deletedAt),
  ]
)

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

export type DailyClosing = typeof dailyClosings.$inferSelect
export type NewDailyClosing = typeof dailyClosings.$inferInsert

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

export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert

export type AttendanceRecord = typeof attendanceRecords.$inferSelect
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type UserSession = typeof userSessions.$inferSelect
export type NewUserSession = typeof userSessions.$inferInsert

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert

export type UserStoreAssignment = typeof userStoreAssignments.$inferSelect
export type NewUserStoreAssignment = typeof userStoreAssignments.$inferInsert

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

export type UsageMetric = typeof usageMetrics.$inferSelect
export type NewUsageMetric = typeof usageMetrics.$inferInsert

export type PlanFeature = typeof planFeatures.$inferSelect
export type NewPlanFeature = typeof planFeatures.$inferInsert

export type OrganizationMember = typeof organizationMembers.$inferSelect
export type NewOrganizationMember = typeof organizationMembers.$inferInsert

export type OrganizationInvitation = typeof organizationInvitations.$inferSelect
export type NewOrganizationInvitation =
  typeof organizationInvitations.$inferInsert

export type SkuRecipe = typeof skuRecipes.$inferSelect
export type NewSkuRecipe = typeof skuRecipes.$inferInsert

export type SalesMenu = typeof salesMenus.$inferSelect
export type NewSalesMenu = typeof salesMenus.$inferInsert

export type SalesMenuItem = typeof salesMenuItems.$inferSelect
export type NewSalesMenuItem = typeof salesMenuItems.$inferInsert

export type WebhookEvent = typeof webhookEvents.$inferSelect
export type NewWebhookEvent = typeof webhookEvents.$inferInsert

// =================
// Drizzle Relations
// =================

// Organization Members Relations
export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
    invitedByUser: one(users, {
      fields: [organizationMembers.invitedBy],
      references: [users.id],
    }),
  })
)

// Organizations Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  subscriptions: many(subscriptions),
  invitations: many(organizationInvitations),
  stores: many(stores),
}))

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  storeAssignments: many(userStoreAssignments),
}))

// Subscriptions Relations
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}))

// Organization Invitations Relations
export const organizationInvitationsRelations = relations(
  organizationInvitations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationInvitations.organizationId],
      references: [organizations.id],
    }),
    invitedByUser: one(users, {
      fields: [organizationInvitations.invitedBy],
      references: [users.id],
    }),
  })
)

// Stores Relations
export const storesRelations = relations(stores, ({ one }) => ({
  organization: one(organizations, {
    fields: [stores.organizationId],
    references: [organizations.id],
  }),
}))

// User Store Assignments Relations
export const userStoreAssignmentsRelations = relations(
  userStoreAssignments,
  ({ one }) => ({
    user: one(users, {
      fields: [userStoreAssignments.userId],
      references: [users.id],
    }),
    store: one(stores, {
      fields: [userStoreAssignments.storeId],
      references: [stores.id],
    }),
  })
)

// SKU Recipes Relations
export const skuRecipesRelations = relations(skuRecipes, ({ one }) => ({
  sku: one(skus, {
    fields: [skuRecipes.skuId],
    references: [skus.id],
  }),
  ingredient: one(ingredients, {
    fields: [skuRecipes.ingredientId],
    references: [ingredients.id],
  }),
}))

// Sales Menus Relations
export const salesMenusRelations = relations(salesMenus, ({ many }) => ({
  items: many(salesMenuItems),
}))

// Sales Menu Items Relations
export const salesMenuItemsRelations = relations(salesMenuItems, ({ one }) => ({
  salesMenu: one(salesMenus, {
    fields: [salesMenuItems.salesMenuId],
    references: [salesMenus.id],
  }),
  sku: one(skus, {
    fields: [salesMenuItems.skuId],
    references: [skus.id],
  }),
}))
