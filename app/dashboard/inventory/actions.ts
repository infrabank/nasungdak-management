'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { inventorySchema, inventoryEventSchema, inventoryAlertRuleSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { inventory, inventoryEvents, inventoryAlertRules, ingredients, stores } from '@/lib/db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { subDays, format } from 'date-fns'

// =====================
// Inventory CRUD
// =====================

export async function createInventory(formData: FormData) {
  try {
    const rawData = {
      storeId: formData.get('storeId'),
      ingredientId: formData.get('ingredientId'),
      currentQuantity: formData.get('currentQuantity'),
      unit: formData.get('unit') || null,
    }

    const validatedData = inventorySchema.parse(rawData)

    // Check if inventory already exists for this store + ingredient
    const existingInventory = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.storeId, validatedData.storeId),
        eq(inventory.ingredientId, validatedData.ingredientId)
      ),
    })

    if (existingInventory) {
      // Update existing inventory
      const [updated] = await db
        .update(inventory)
        .set({
          currentQuantity: validatedData.currentQuantity,
          unit: validatedData.unit,
          lastUpdated: new Date(),
        })
        .where(eq(inventory.id, existingInventory.id))
        .returning()

      revalidatePath('/dashboard/inventory')
      revalidateTag(`inventory:${validatedData.storeId}`)
      revalidateTag('inventory:all')
      return {
        success: true,
        data: updated,
      }
    }

    // Create new inventory
    const [newInventory] = await db
      .insert(inventory)
      .values({
        ...validatedData,
      })
      .returning()

    revalidatePath('/dashboard/inventory')
    revalidateTag(`inventory:${validatedData.storeId}`)
    revalidateTag('inventory:all')

    return {
      success: true,
      data: newInventory,
    }
  } catch (error) {
    console.error('Failed to create inventory:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '재고 등록에 실패했습니다',
    }
  }
}

export async function updateInventory(id: string, formData: FormData) {
  try {
    const rawData = {
      storeId: formData.get('storeId'),
      ingredientId: formData.get('ingredientId'),
      currentQuantity: formData.get('currentQuantity'),
      unit: formData.get('unit') || null,
    }

    const validatedData = inventorySchema.parse(rawData)

    const [updated] = await db
      .update(inventory)
      .set({
        ...validatedData,
        lastUpdated: new Date(),
      })
      .where(eq(inventory.id, id))
      .returning()

    revalidatePath('/dashboard/inventory')
    revalidateTag(`inventory:${validatedData.storeId}`)
    revalidateTag('inventory:all')

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    console.error('Failed to update inventory:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '재고 수정에 실패했습니다',
    }
  }
}

export async function deleteInventory(id: string) {
  try {
    await db
      .delete(inventory)
      .where(eq(inventory.id, id))

    revalidatePath('/dashboard/inventory')
    revalidateTag('inventory:all')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete inventory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '재고 삭제에 실패했습니다',
    }
  }
}

async function fetchInventory(storeId: string) {
  const conditions = []

  if (storeId !== 'all') {
    conditions.push(eq(inventory.storeId, storeId))
  }

  const inventoryList = await db
    .select({
      id: inventory.id,
      storeId: inventory.storeId,
      ingredientId: inventory.ingredientId,
      currentQuantity: inventory.currentQuantity,
      unit: inventory.unit,
      lastUpdated: inventory.lastUpdated,
      ingredientName: ingredients.ingredientName,
      storeName: stores.storeName,
    })
    .from(inventory)
    .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
    .innerJoin(stores, eq(inventory.storeId, stores.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(ingredients.ingredientName)

  return inventoryList
}

export async function getInventory(storeId?: string) {
  try {
    const normalizedStoreId = storeId ?? 'all'

    const getCachedInventory = unstable_cache(
      fetchInventory,
      ['inventory:list', normalizedStoreId],
      { tags: [`inventory:${normalizedStoreId}`] }
    )

    return await getCachedInventory(normalizedStoreId)
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return []
  }
}

// =====================
// Inventory Events (폐기/실사/조정)
// =====================

export async function createInventoryEvent(formData: FormData) {
  try {
    const rawData = {
      storeId: formData.get('storeId'),
      ingredientId: formData.get('ingredientId'),
      eventType: formData.get('eventType'),
      quantityChange: formData.get('quantityChange'),
      reason: formData.get('reason') || null,
      eventDate: formData.get('eventDate'),
    }

    const validatedData = inventoryEventSchema.parse(rawData)

    // Create inventory event
    const [event] = await db
      .insert(inventoryEvents)
      .values({
        ...validatedData,
        createdBy: 'system',
      })
      .returning()

    // Update inventory quantity
    const currentInventory = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.storeId, validatedData.storeId),
        eq(inventory.ingredientId, validatedData.ingredientId)
      ),
    })

    if (currentInventory) {
      const newQuantity = validatedData.eventType === 'waste' || validatedData.eventType === 'sale'
        ? Number(currentInventory.currentQuantity) - Number(validatedData.quantityChange)
        : Number(currentInventory.currentQuantity) + Number(validatedData.quantityChange)

      await db
        .update(inventory)
        .set({
          currentQuantity: String(newQuantity),
          lastUpdated: new Date(),
        })
        .where(eq(inventory.id, currentInventory.id))
    }

    revalidatePath('/dashboard/inventory')
    revalidateTag(`inventory:${validatedData.storeId}`)
    revalidateTag('inventory:all')

    return {
      success: true,
      data: event,
    }
  } catch (error) {
    console.error('Failed to create inventory event:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '재고 이벤트 등록에 실패했습니다',
    }
  }
}

export async function getInventoryEvents(storeId?: string, ingredientId?: string) {
  try {
    const conditions = []

    if (storeId) {
      conditions.push(eq(inventoryEvents.storeId, storeId))
    }
    if (ingredientId) {
      conditions.push(eq(inventoryEvents.ingredientId, ingredientId))
    }

    const events = await db
      .select({
        id: inventoryEvents.id,
        storeId: inventoryEvents.storeId,
        ingredientId: inventoryEvents.ingredientId,
        eventType: inventoryEvents.eventType,
        quantityChange: inventoryEvents.quantityChange,
        reason: inventoryEvents.reason,
        eventDate: inventoryEvents.eventDate,
        createdAt: inventoryEvents.createdAt,
        ingredientName: ingredients.ingredientName,
      })
      .from(inventoryEvents)
      .innerJoin(ingredients, eq(inventoryEvents.ingredientId, ingredients.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryEvents.eventDate))
      .limit(100)

    return events
  } catch (error) {
    console.error('Failed to fetch inventory events:', error)
    return []
  }
}

// =====================
// Inventory Alert Rules
// =====================

export async function createAlertRule(formData: FormData) {
  try {
    const rawData = {
      storeId: formData.get('storeId') || null,
      ingredientId: formData.get('ingredientId'),
      alertThresholdDays: formData.get('alertThresholdDays'),
      predictionPeriodDays: formData.get('predictionPeriodDays'),
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = inventoryAlertRuleSchema.parse(rawData)

    // Check if rule already exists
    const existingRule = await db.query.inventoryAlertRules.findFirst({
      where: and(
        eq(inventoryAlertRules.ingredientId, validatedData.ingredientId),
        isNull(inventoryAlertRules.deletedAt)
      ),
    })

    if (existingRule && existingRule.storeId === validatedData.storeId) {
      return {
        success: false,
        error: '이미 존재하는 알림 규칙입니다',
      }
    }

    const [rule] = await db
      .insert(inventoryAlertRules)
      .values({
        ...validatedData,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/inventory')
    revalidateTag(`inventory:alerts:${validatedData.storeId ?? 'all'}`)
    revalidateTag('inventory:alerts:all')

    return {
      success: true,
      data: rule,
    }
  } catch (error) {
    console.error('Failed to create alert rule:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '알림 규칙 등록에 실패했습니다',
    }
  }
}

export async function updateAlertRule(id: string, formData: FormData) {
  try {
    const rawData = {
      storeId: formData.get('storeId') || null,
      ingredientId: formData.get('ingredientId'),
      alertThresholdDays: formData.get('alertThresholdDays'),
      predictionPeriodDays: formData.get('predictionPeriodDays'),
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = inventoryAlertRuleSchema.parse(rawData)

    const [rule] = await db
      .update(inventoryAlertRules)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(inventoryAlertRules.id, id))
      .returning()

    revalidatePath('/dashboard/inventory')
    revalidateTag(`inventory:alerts:${validatedData.storeId ?? 'all'}`)
    revalidateTag('inventory:alerts:all')

    return {
      success: true,
      data: rule,
    }
  } catch (error) {
    console.error('Failed to update alert rule:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '알림 규칙 수정에 실패했습니다',
    }
  }
}

export async function deleteAlertRule(id: string) {
  try {
    await db
      .update(inventoryAlertRules)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(inventoryAlertRules.id, id))

    revalidatePath('/dashboard/inventory')
    revalidateTag('inventory:alerts:all')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete alert rule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알림 규칙 삭제에 실패했습니다',
    }
  }
}

async function fetchAlertRules(storeId: string) {
  const conditions = [isNull(inventoryAlertRules.deletedAt)]

  if (storeId !== 'all') {
    conditions.push(eq(inventoryAlertRules.storeId, storeId))
  }

  const rules = await db
    .select({
      id: inventoryAlertRules.id,
      storeId: inventoryAlertRules.storeId,
      ingredientId: inventoryAlertRules.ingredientId,
      alertThresholdDays: inventoryAlertRules.alertThresholdDays,
      predictionPeriodDays: inventoryAlertRules.predictionPeriodDays,
      isActive: inventoryAlertRules.isActive,
      ingredientName: ingredients.ingredientName,
    })
    .from(inventoryAlertRules)
    .innerJoin(ingredients, eq(inventoryAlertRules.ingredientId, ingredients.id))
    .where(and(...conditions))
    .orderBy(ingredients.ingredientName)

  return rules
}

export async function getAlertRules(storeId?: string) {
  try {
    const normalizedStoreId = storeId ?? 'all'

    const getCachedAlertRules = unstable_cache(
      fetchAlertRules,
      ['inventory:alerts', normalizedStoreId],
      { tags: [`inventory:alerts:${normalizedStoreId}`] }
    )

    return await getCachedAlertRules(normalizedStoreId)
  } catch (error) {
    console.error('Failed to fetch alert rules:', error)
    return []
  }
}

// =====================
// Inventory Prediction (30-day default)
// =====================

export async function calculateDaysRemaining(
  storeId: string,
  ingredientId: string,
  predictionPeriodDays: number = 30
): Promise<{ daysRemaining: number; avgDailySales: number }> {
  try {
    // Get current inventory
    const inventoryData = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.storeId, storeId),
        eq(inventory.ingredientId, ingredientId)
      ),
    })

    if (!inventoryData) {
      return { daysRemaining: 0, avgDailySales: 0 }
    }

    const currentStock = Number(inventoryData.currentQuantity)
    if (currentStock <= 0) {
      return { daysRemaining: 0, avgDailySales: 0 }
    }

    // Get sales history for the prediction period
    const startDate = format(subDays(new Date(), predictionPeriodDays), 'yyyy-MM-dd')

    // Calculate total quantity sold in the month period (30-day default)
    const salesResult = await db.execute(sql`
      SELECT COALESCE(SUM(sr.quantity_sold), 0) as total_sold
      FROM sales_records sr
      WHERE sr.store_id = ${storeId}
        AND sr.sale_date >= ${startDate}::date
        AND sr.deleted_at IS NULL
        AND sr.sku_id IN (
          SELECT sku.id FROM skus s 
          INNER JOIN menu_ingredients mi ON s.menu_id = mi.menu_id 
          WHERE mi.ingredient_id = ${ingredientId}
        )
      )
    `)

    const totalSold = Number(salesResult.rows[0]?.total_sold || 0)
    const avgDailySales = totalSold / predictionPeriodDays

    if (avgDailySales <= 0) {
      // No sales history - return infinity
      return { daysRemaining: Infinity, avgDailySales: 0 }
    }

    const daysRemaining = Math.floor(currentStock / avgDailySales)

    return { daysRemaining, avgDailySales }
  } catch (error) {
    console.error('Failed to calculate days remaining:', error)
    return { daysRemaining: 0, avgDailySales: 0 }
  }
}

export async function checkInventoryAlerts(storeId: string): Promise<{
  alerts: Array<{
    ingredientId: string
    ingredientName: string
    daysRemaining: number
    avgDailySales: number
  }>
  store: {
    id: string
    storeName: string
    managerPhone: string
  }
}> {
  try {
    // Get store info
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    })

    if (!store) {
      return { alerts: [], store: { id: '', storeName: '', managerPhone: '' } }
    }

    // Get all active alert rules
    const rules = await db
      .select({
        id: inventoryAlertRules.id,
        storeId: inventoryAlertRules.storeId,
        ingredientId: inventoryAlertRules.ingredientId,
        alertThresholdDays: inventoryAlertRules.alertThresholdDays,
        predictionPeriodDays: inventoryAlertRules.predictionPeriodDays,
        ingredientName: ingredients.ingredientName,
      })
      .from(inventoryAlertRules)
      .innerJoin(ingredients, eq(inventoryAlertRules.ingredientId, ingredients.id))
      .where(
        and(
          eq(inventoryAlertRules.isActive, true),
          isNull(inventoryAlertRules.deletedAt)
        )
      )

    // Check each rule
    const alerts = []

    for (const rule of rules) {
      const { daysRemaining } = await calculateDaysRemaining(
        rule.storeId || storeId,
        rule.ingredientId,
        rule.predictionPeriodDays
      )

      if (daysRemaining <= rule.alertThresholdDays && daysRemaining !== Infinity) {
        alerts.push({
          ingredientId: rule.ingredientId,
          ingredientName: rule.ingredientName,
          daysRemaining,
          avgDailySales: 0,
        })
      }
    }

    return {
      alerts,
      store: {
        id: store.id,
        storeName: store.storeName,
        managerPhone: store.managerPhone || '',
      },
    }
  } catch (error) {
    console.error('Failed to check inventory alerts:', error)
    return { alerts: [], store: { id: '', storeName: '', managerPhone: '' } }
  }
}
