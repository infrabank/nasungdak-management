import { pgTable, uuid, varchar, decimal, date, timestamp, boolean, text, integer } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Menu Categories Table
export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Ingredients Table
export const ingredients = pgTable('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull().unique(),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Menu-Ingredient Junction Table
export const menuIngredients = pgTable('menu_ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuId: uuid('menu_id').notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// SKUs (Sales Units) Table
export const skus = pgTable('skus', {
  id: uuid('id').primaryKey().defaultRandom(),
  skuCode: varchar('sku_code', { length: 100 }).notNull().unique(),
  menuId: uuid('menu_id').notNull().references(() => menuCategories.id),
  salesUnitName: varchar('sales_unit_name', { length: 100 }).notNull(),
  conversionFactor: decimal('conversion_factor', { precision: 8, scale: 4 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  description: varchar('description', { length: 200 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Purchase Transactions Table
export const purchaseTransactions = pgTable('purchase_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionDate: date('transaction_date').notNull(),
  menuId: uuid('menu_id').notNull().references(() => menuCategories.id),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id),
  supplierName: varchar('supplier_name', { length: 200 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  unitDescription: varchar('unit_description', { length: 100 }),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`quantity * unit_price`
  ),
  isValid: boolean('is_valid').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Sales Records Table
export const salesRecords = pgTable('sales_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  salesDate: date('sales_date').notNull(),
  skuId: uuid('sku_id').notNull().references(() => skus.id),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Cost Distribution Rules Table
export const costDistributionRules = pgTable('cost_distribution_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuId: uuid('menu_id').notNull().unique().references(() => menuCategories.id),
  distributionPercentage: decimal('distribution_percentage', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// TypeScript Types
export type MenuCategory = typeof menuCategories.$inferSelect
export type NewMenuCategory = typeof menuCategories.$inferInsert

export type Ingredient = typeof ingredients.$inferSelect
export type NewIngredient = typeof ingredients.$inferInsert

export type MenuIngredient = typeof menuIngredients.$inferSelect
export type NewMenuIngredient = typeof menuIngredients.$inferInsert

export type SKU = typeof skus.$inferSelect
export type NewSKU = typeof skus.$inferInsert

export type PurchaseTransaction = typeof purchaseTransactions.$inferSelect
export type NewPurchaseTransaction = typeof purchaseTransactions.$inferInsert

export type SalesRecord = typeof salesRecords.$inferSelect
export type NewSalesRecord = typeof salesRecords.$inferInsert

export type CostDistributionRule = typeof costDistributionRules.$inferSelect
export type NewCostDistributionRule = typeof costDistributionRules.$inferInsert
