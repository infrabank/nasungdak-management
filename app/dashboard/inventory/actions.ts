'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import {
  inventorySchema,
  inventoryEventSchema,
  inventoryAlertRuleSchema,
} from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import {
  inventory,
  inventoryEvents,
  inventoryAlertRules,
  ingredients,
  stores,
} from '@/lib/db/schema'
import { eq, and, or, isNull, desc, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { subDays, format } from 'date-fns'
import { getAuthorizedStoreIds, getOrganizationId } from '@/lib/auth-context'
import {
  recordAndDispatchAlerts,
  type InventoryAlertItem,
} from '@/lib/notifications/inventory-alert'

// =====================
// Inventory CRUD
// =====================

export async function createInventory(formData: FormData) {
  try {
    // 권한 검사
    const authorizedStoreIds = await getAuthorizedStoreIds()
    const storeId = formData.get('storeId') as string

    if (!authorizedStoreIds.includes(storeId)) {
      return {
        success: false,
        error: '해당 매장에 대한 권한이 없습니다',
      }
    }

    const rawData = {
      storeId,
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
    logger.error('Failed to create inventory:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '재고 등록에 실패했습니다',
    }
  }
}

export async function updateInventory(id: string, formData: FormData) {
  try {
    // 권한 검사
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

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
      .where(
        and(
          eq(inventory.id, id),
          inArray(inventory.storeId, authorizedStoreIds)
        )
      )
      .returning()

    if (!updated) {
      return {
        success: false,
        error: '수정할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    revalidatePath('/dashboard/inventory')
    revalidateTag(`inventory:${validatedData.storeId}`)
    revalidateTag('inventory:all')

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    logger.error('Failed to update inventory:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '재고 수정에 실패했습니다',
    }
  }
}

export async function deleteInventory(id: string) {
  try {
    // 권한 검사
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    const result = await db
      .delete(inventory)
      .where(
        and(
          eq(inventory.id, id),
          inArray(inventory.storeId, authorizedStoreIds)
        )
      )
      .returning({ id: inventory.id })

    if (result.length === 0) {
      return {
        success: false,
        error: '삭제할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    revalidatePath('/dashboard/inventory')
    revalidateTag('inventory:all')

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete inventory:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '재고 삭제에 실패했습니다',
    }
  }
}

async function fetchInventory(storeId: string, authorizedStoreIds: string[]) {
  if (authorizedStoreIds.length === 0) {
    return []
  }

  const conditions = [inArray(inventory.storeId, authorizedStoreIds)]

  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
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
      managementLevel: ingredients.managementLevel,
      storeName: stores.storeName,
    })
    .from(inventory)
    .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
    .innerJoin(stores, eq(inventory.storeId, stores.id))
    .where(and(...conditions))
    .orderBy(ingredients.ingredientName)

  return inventoryList
}

export async function getInventory(storeId?: string) {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    const normalizedStoreId = storeId ?? 'all'

    // 캐시 키에 사용자의 권한 정보 포함
    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedInventory = unstable_cache(
      () => fetchInventory(normalizedStoreId, authorizedStoreIds),
      ['inventory:list:v2', storeKey, normalizedStoreId],
      { tags: [`inventory:${normalizedStoreId}`] }
    )

    return await getCachedInventory()
  } catch (error) {
    logger.error('Failed to fetch inventory:', errorToContext(error))
    return []
  }
}

// =====================
// Inventory Events (폐기/실사/조정)
// =====================

export async function createInventoryEvent(formData: FormData) {
  try {
    // 권한 검사
    const authorizedStoreIds = await getAuthorizedStoreIds()
    const storeId = formData.get('storeId') as string

    if (!authorizedStoreIds.includes(storeId)) {
      return {
        success: false,
        error: '해당 매장에 대한 권한이 없습니다',
      }
    }

    const rawData = {
      storeId,
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
      const newQuantity =
        validatedData.eventType === 'waste' ||
        validatedData.eventType === 'sale'
          ? Number(currentInventory.currentQuantity) -
            Number(validatedData.quantityChange)
          : Number(currentInventory.currentQuantity) +
            Number(validatedData.quantityChange)

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
    logger.error('Failed to create inventory event:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '재고 이벤트 등록에 실패했습니다',
    }
  }
}

export async function getInventoryEvents(
  storeId?: string,
  ingredientId?: string
) {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    const conditions = [inArray(inventoryEvents.storeId, authorizedStoreIds)]

    if (storeId && authorizedStoreIds.includes(storeId)) {
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
    logger.error('Failed to fetch inventory events:', errorToContext(error))
    return []
  }
}

// =====================
// Inventory Alert Rules
// =====================

export async function createAlertRule(formData: FormData) {
  try {
    // 권한 검사
    const authorizedStoreIds = await getAuthorizedStoreIds()
    const storeId = formData.get('storeId') as string | null

    // storeId가 제공된 경우 권한 확인
    if (storeId && !authorizedStoreIds.includes(storeId)) {
      return {
        success: false,
        error: '해당 매장에 대한 권한이 없습니다',
      }
    }

    const rawData = {
      storeId: storeId || null,
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
    logger.error('Failed to create alert rule:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '알림 규칙 등록에 실패했습니다',
    }
  }
}

/**
 * 알림 규칙 수정/삭제 권한 확인.
 * - 특정 매장 규칙: 권한 매장에 포함되어야 함
 * - 전체 매장(NULL) 규칙: 재료의 조직이 사용자의 조직과 일치해야 함
 */
async function canManageAlertRule(
  id: string,
  authorizedStoreIds: string[],
  organizationId: string | null
): Promise<boolean> {
  const [existing] = await db
    .select({
      storeId: inventoryAlertRules.storeId,
      ingredientOrg: ingredients.organizationId,
    })
    .from(inventoryAlertRules)
    .innerJoin(ingredients, eq(inventoryAlertRules.ingredientId, ingredients.id))
    .where(
      and(eq(inventoryAlertRules.id, id), isNull(inventoryAlertRules.deletedAt))
    )
    .limit(1)

  if (!existing) return false
  if (existing.storeId) {
    return authorizedStoreIds.includes(existing.storeId)
  }
  return organizationId != null && existing.ingredientOrg === organizationId
}

export async function updateAlertRule(id: string, formData: FormData) {
  try {
    // 권한 검사
    const authorizedStoreIds = await getAuthorizedStoreIds()
    const organizationId = await getOrganizationId()
    if (authorizedStoreIds.length === 0) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    const canManage = await canManageAlertRule(
      id,
      authorizedStoreIds,
      organizationId
    )
    if (!canManage) {
      return {
        success: false,
        error: '수정할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    const rawData = {
      storeId: formData.get('storeId') || null,
      ingredientId: formData.get('ingredientId'),
      alertThresholdDays: formData.get('alertThresholdDays'),
      predictionPeriodDays: formData.get('predictionPeriodDays'),
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = inventoryAlertRuleSchema.parse(rawData)

    // 변경하려는 대상이 특정 매장이면 그 매장 권한 확인
    if (
      validatedData.storeId &&
      !authorizedStoreIds.includes(validatedData.storeId)
    ) {
      return {
        success: false,
        error: '해당 매장에 대한 권한이 없습니다',
      }
    }

    const [rule] = await db
      .update(inventoryAlertRules)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(inventoryAlertRules.id, id))
      .returning()

    if (!rule) {
      return {
        success: false,
        error: '수정할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    revalidatePath('/dashboard/inventory')
    revalidateTag(`inventory:alerts:${validatedData.storeId ?? 'all'}`)
    revalidateTag('inventory:alerts:all')

    return {
      success: true,
      data: rule,
    }
  } catch (error) {
    logger.error('Failed to update alert rule:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '알림 규칙 수정에 실패했습니다',
    }
  }
}

export async function deleteAlertRule(id: string) {
  try {
    // 권한 검사
    const authorizedStoreIds = await getAuthorizedStoreIds()
    const organizationId = await getOrganizationId()
    if (authorizedStoreIds.length === 0) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    const canManage = await canManageAlertRule(
      id,
      authorizedStoreIds,
      organizationId
    )
    if (!canManage) {
      return {
        success: false,
        error: '삭제할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    const result = await db
      .update(inventoryAlertRules)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(inventoryAlertRules.id, id))
      .returning({ id: inventoryAlertRules.id })

    if (result.length === 0) {
      return {
        success: false,
        error: '삭제할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    revalidatePath('/dashboard/inventory')
    revalidateTag('inventory:alerts:all')

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete alert rule:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '알림 규칙 삭제에 실패했습니다',
    }
  }
}

async function fetchAlertRules(storeId: string, authorizedStoreIds: string[]) {
  if (authorizedStoreIds.length === 0) {
    return []
  }

  // storeId가 NULL인 규칙은 "전체 매장" 적용이므로 항상 포함한다
  const conditions = [
    isNull(inventoryAlertRules.deletedAt),
    storeId !== 'all' && authorizedStoreIds.includes(storeId)
      ? or(
          eq(inventoryAlertRules.storeId, storeId),
          isNull(inventoryAlertRules.storeId)
        )
      : or(
          inArray(inventoryAlertRules.storeId, authorizedStoreIds),
          isNull(inventoryAlertRules.storeId)
        ),
  ]

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
    .innerJoin(
      ingredients,
      eq(inventoryAlertRules.ingredientId, ingredients.id)
    )
    .where(and(...conditions))
    .orderBy(ingredients.ingredientName)

  return rules
}

export async function getAlertRules(storeId?: string) {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    const normalizedStoreId = storeId ?? 'all'

    // 캐시 키에 사용자의 권한 정보 포함
    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedAlertRules = unstable_cache(
      () => fetchAlertRules(normalizedStoreId, authorizedStoreIds),
      ['inventory:alerts', storeKey, normalizedStoreId],
      { tags: [`inventory:alerts:${normalizedStoreId}`] }
    )

    return await getCachedAlertRules()
  } catch (error) {
    logger.error('Failed to fetch alert rules:', errorToContext(error))
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
    const startDate = format(
      subDays(new Date(), predictionPeriodDays),
      'yyyy-MM-dd'
    )

    // 기간 내 레시피(sku_recipes) 기반 재료 사용량 합계: 판매량 x 레시피 소모량
    const salesResult = await db.execute(sql`
      SELECT COALESCE(SUM(sr.quantity_sold * rec.quantity), 0) as total_sold
      FROM sales_records sr
      INNER JOIN sku_recipes rec
        ON rec.sku_id = sr.sku_id
        AND rec.deleted_at IS NULL
        AND rec.ingredient_id = ${ingredientId}
      WHERE sr.store_id = ${storeId}
        AND sr.sale_date >= ${startDate}::date
        AND sr.deleted_at IS NULL
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
    logger.error('Failed to calculate days remaining:', errorToContext(error))
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
    // Get store info (must not be deleted)
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), isNull(stores.deletedAt)),
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
      .innerJoin(
        ingredients,
        eq(inventoryAlertRules.ingredientId, ingredients.id)
      )
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

      if (
        daysRemaining <= rule.alertThresholdDays &&
        daysRemaining !== Infinity
      ) {
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
    logger.error('Failed to check inventory alerts:', errorToContext(error))
    return { alerts: [], store: { id: '', storeName: '', managerPhone: '' } }
  }
}

// =====================
// Low-stock Alerts (화면 표시 + 발송)
// =====================

/**
 * 권한 범위 내 활성 알림 규칙을 평가하여 재고 부족 항목 목록을 반환합니다.
 * - storeId 지정 시 해당 매장만, 미지정/'all'이면 권한 매장 전체를 대상으로 평가
 * - 규칙의 storeId가 NULL(전체 매장)이면 대상 매장 각각에 대해 평가
 */
export async function getLowStockAlerts(
  storeId?: string
): Promise<InventoryAlertItem[]> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    const targetStoreIds =
      storeId && storeId !== 'all' && authorizedStoreIds.includes(storeId)
        ? [storeId]
        : authorizedStoreIds

    const rules = await db
      .select({
        storeId: inventoryAlertRules.storeId,
        ingredientId: inventoryAlertRules.ingredientId,
        alertThresholdDays: inventoryAlertRules.alertThresholdDays,
        predictionPeriodDays: inventoryAlertRules.predictionPeriodDays,
        ingredientName: ingredients.ingredientName,
      })
      .from(inventoryAlertRules)
      .innerJoin(
        ingredients,
        eq(inventoryAlertRules.ingredientId, ingredients.id)
      )
      .where(
        and(
          eq(inventoryAlertRules.isActive, true),
          isNull(inventoryAlertRules.deletedAt)
        )
      )

    if (rules.length === 0) {
      return []
    }

    const storeRows = await db
      .select({
        id: stores.id,
        storeName: stores.storeName,
        managerPhone: stores.managerPhone,
      })
      .from(stores)
      .where(
        and(isNull(stores.deletedAt), inArray(stores.id, authorizedStoreIds))
      )
    const storeMap = new Map(storeRows.map((s) => [s.id, s]))

    const alerts: InventoryAlertItem[] = []
    const seen = new Set<string>()

    for (const rule of rules) {
      // 규칙이 특정 매장이면 그 매장만, 전체 매장이면 대상 매장 전체
      const evalStoreIds = rule.storeId
        ? targetStoreIds.includes(rule.storeId)
          ? [rule.storeId]
          : []
        : targetStoreIds

      for (const sId of evalStoreIds) {
        const dedupeKey = `${sId}:${rule.ingredientId}`
        if (seen.has(dedupeKey)) continue

        const { daysRemaining } = await calculateDaysRemaining(
          sId,
          rule.ingredientId,
          rule.predictionPeriodDays
        )

        if (daysRemaining !== Infinity && daysRemaining <= rule.alertThresholdDays) {
          seen.add(dedupeKey)
          const store = storeMap.get(sId)
          alerts.push({
            storeId: sId,
            storeName: store?.storeName ?? '',
            managerPhone: store?.managerPhone ?? '',
            ingredientId: rule.ingredientId,
            ingredientName: rule.ingredientName,
            daysRemaining,
            thresholdDays: rule.alertThresholdDays,
          })
        }
      }
    }

    // 잔여일이 적은 순으로 정렬
    alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)
    return alerts
  } catch (error) {
    logger.error('Failed to get low stock alerts:', errorToContext(error))
    return []
  }
}

/**
 * 재고 부족 점검을 실행하고 알림을 발송(또는 이력 기록)합니다.
 * 화면의 "지금 점검" 버튼에서 호출됩니다.
 */
export async function runInventoryAlertCheck(storeId?: string): Promise<{
  success: boolean
  total: number
  sent: number
  failed: number
  pending: number
  error?: string
}> {
  const empty = { total: 0, sent: 0, failed: 0, pending: 0 }
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: false, error: '권한이 없습니다', ...empty }
    }

    const alerts = await getLowStockAlerts(storeId)
    const result = await recordAndDispatchAlerts(alerts)

    revalidatePath('/dashboard/inventory')

    return { success: true, ...result }
  } catch (error) {
    logger.error('Failed to run inventory alert check:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '재고 점검에 실패했습니다',
      ...empty,
    }
  }
}
