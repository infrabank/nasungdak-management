'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// Debug function to check each step of the cost calculation
export async function debugCostCalculation(startDate: string, endDate: string) {
  // Step 1: Check cost distribution rules
  const rules = await db.execute(sql`
    SELECT
      cdr.id,
      mc.menu_name,
      ing.ingredient_name,
      cdr.distribution_percent,
      cdr.effective_from,
      cdr.effective_to,
      cdr.deleted_at
    FROM cost_distribution_rules cdr
    JOIN menu_categories mc ON cdr.menu_id = mc.id
    JOIN ingredients ing ON cdr.ingredient_id = ing.id
    WHERE cdr.deleted_at IS NULL
    ORDER BY mc.menu_name, ing.ingredient_name
  `)
  // Step 2: Check purchases in date range
  const purchases = await db.execute(sql`
    SELECT
      pt.id,
      pt.transaction_date,
      mc.menu_name,
      ing.ingredient_name,
      pt.quantity,
      pt.unit_price,
      pt.total_amount,
      pt.is_valid,
      pt.deleted_at
    FROM purchase_transactions pt
    JOIN menu_categories mc ON pt.menu_id = mc.id
    JOIN ingredients ing ON pt.ingredient_id = ing.id
    WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
      AND pt.deleted_at IS NULL
    ORDER BY pt.transaction_date DESC
  `)
  // Step 3: Check SKUs linked to menus
  const skus = await db.execute(sql`
    SELECT
      s.id,
      s.sku_name,
      mc.menu_name,
      s.deleted_at
    FROM skus s
    JOIN menu_categories mc ON s.menu_id = mc.id
    WHERE s.deleted_at IS NULL
      AND mc.deleted_at IS NULL
    ORDER BY mc.menu_name, s.sku_name
  `)
  // Step 4: Test the cost_summary CTE in isolation
  const costTest = await db.execute(sql`
    SELECT
      s.id AS sku_id,
      s.sku_name,
      mc.menu_name,
      pt.transaction_date,
      ing.ingredient_name,
      pt.total_amount,
      cdr.distribution_percent,
      cdr.effective_from,
      cdr.effective_to,
      (pt.total_amount * cdr.distribution_percent / 100) AS allocated_cost
    FROM skus s
    JOIN menu_categories mc ON s.menu_id = mc.id
    JOIN cost_distribution_rules cdr ON mc.id = cdr.menu_id
    JOIN purchase_transactions pt ON cdr.ingredient_id = pt.ingredient_id
    JOIN ingredients ing ON pt.ingredient_id = ing.id
    WHERE pt.transaction_date BETWEEN ${startDate}::date AND ${endDate}::date
      AND pt.deleted_at IS NULL
      AND pt.is_valid = true
      AND s.deleted_at IS NULL
      AND mc.deleted_at IS NULL
      AND cdr.deleted_at IS NULL
      AND cdr.effective_from <= ${endDate}::date
      AND COALESCE(cdr.effective_to, '9999-12-31'::date) >= ${startDate}::date
    ORDER BY s.sku_name, pt.transaction_date
  `)
  // Step 5: Check sales
  const sales = await db.execute(sql`
    SELECT
      sr.sale_date,
      s.sku_name,
      sr.quantity_sold,
      sr.total_revenue
    FROM sales_records sr
    JOIN skus s ON sr.sku_id = s.id
    WHERE sr.sale_date BETWEEN ${startDate}::date AND ${endDate}::date
      AND sr.deleted_at IS NULL
    ORDER BY sr.sale_date DESC
  `)
  return {
    rules: rules.rows,
    purchases: purchases.rows,
    skus: skus.rows,
    costAllocation: costTest.rows,
    sales: sales.rows,
  }
}
