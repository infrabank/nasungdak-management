'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
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
import { eq, and, or, isNull, desc, inArray } from 'drizzle-orm'
import { z } from 'zod'
import {
  getAuthorizedStoreIds,
  getOrganizationId,
  assertPermission,
} from '@/lib/auth-context'
import {
  revalidateInventoryData,
  revalidateAlertRuleData,
  cacheTags,
} from '@/lib/cache-tags'
import {
  recordAndDispatchAlerts,
  type InventoryAlertItem,
} from '@/lib/notifications/inventory-alert'
import { applyInventoryDelta } from '@/lib/inventory-sync'
import {
  getActiveAlertRules,
  expandRulesToTasks,
  evaluateLowStock,
  evaluateBagLowStock,
} from '@/lib/inventory/alert-service'

// =====================
// Inventory CRUD
// =====================

export async function createInventory(formData: FormData) {
  try {
    await assertPermission('inventory', 'write')
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
      revalidateInventoryData(validatedData.storeId)
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
    revalidateInventoryData(validatedData.storeId)

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
    await assertPermission('inventory', 'write')
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

    // 이동 대상 storeId도 반드시 권한 매장인지 검증 (타 매장으로 재고 이동 방지)
    if (!authorizedStoreIds.includes(validatedData.storeId)) {
      return {
        success: false,
        error: '해당 매장에 대한 권한이 없습니다',
      }
    }

    // 기존 매장(태그 무효화용) 조회
    const existing = await db.query.inventory.findFirst({
      where: eq(inventory.id, id),
      columns: { storeId: true },
    })

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
    // 이동 시 기존 매장과 새 매장 양쪽 화면을 갱신
    revalidateInventoryData(validatedData.storeId)
    if (existing?.storeId && existing.storeId !== validatedData.storeId) {
      revalidateInventoryData(existing.storeId)
    }

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
    await assertPermission('inventory', 'delete')
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
      .returning({ id: inventory.id, storeId: inventory.storeId })

    if (result.length === 0) {
      return {
        success: false,
        error: '삭제할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    revalidatePath('/dashboard/inventory')
    revalidateInventoryData(result[0].storeId)

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

/**
 * 봉 단위 재료 사용 기록: 재고에서 1봉 차감 + 원장(inventory_events) 기록.
 * 소스·파우더류는 판매 매칭 대신 봉을 뜯을 때마다 이 액션으로 기록한다.
 */
export async function recordBagUsage(inventoryId: string) {
  try {
    await assertPermission('inventory', 'write')
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: false, error: '권한이 없습니다' }
    }

    const existing = await db
      .select({
        id: inventory.id,
        storeId: inventory.storeId,
        ingredientId: inventory.ingredientId,
        currentQuantity: inventory.currentQuantity,
        managementLevel: ingredients.managementLevel,
      })
      .from(inventory)
      .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
      .where(
        and(
          eq(inventory.id, inventoryId),
          inArray(inventory.storeId, authorizedStoreIds),
          isNull(ingredients.deletedAt)
        )
      )
      .limit(1)
      .then((rows) => rows[0])
    if (!existing) {
      return { success: false, error: '재고 기록을 찾을 수 없거나 권한이 없습니다' }
    }
    if (existing.managementLevel !== 'bag') {
      return { success: false, error: '봉 단위 재료만 사용 기록할 수 있습니다' }
    }
    // 음수 재고 방지: 0봉 이하에서는 차감을 막는다 (봉 단위 도입 취지 = 음수 재고 제거)
    if (Number(existing.currentQuantity) <= 0) {
      return {
        success: false,
        error: '남은 봉이 없습니다. 매입 등록 후 사용해주세요.',
      }
    }

    await db.transaction(async (tx) => {
      await applyInventoryDelta(tx, {
        storeId: existing.storeId,
        ingredientId: existing.ingredientId,
        delta: -1,
        eventType: 'adjustment',
        reason: '1봉 사용',
        eventDate: new Date().toISOString().slice(0, 10),
        createIfMissing: false,
      })
    })

    revalidatePath('/dashboard/inventory')
    revalidateInventoryData(existing.storeId)

    const remaining = Number(existing.currentQuantity) - 1
    return { success: true, remaining }
  } catch (error) {
    logger.error('Failed to use bag inventory:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '봉 사용 기록에 실패했습니다',
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

    const normalizedStoreId = storeId || 'all'

    // 캐시 키에 사용자의 권한 정보 포함
    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedInventory = unstable_cache(
      () => fetchInventory(normalizedStoreId, authorizedStoreIds),
      ['inventory:list:v2', storeKey, normalizedStoreId],
      { tags: [cacheTags.inventory(normalizedStoreId)] }
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
    await assertPermission('inventory', 'write')
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

    // 매입/판매는 매입·판매 등록 시 자동으로 기록되므로 수동 입력을 막는다 (중복 방지)
    if (
      validatedData.eventType === 'purchase' ||
      validatedData.eventType === 'sale'
    ) {
      return {
        success: false,
        error: '매입/판매는 매입·판매 등록 시 재고에 자동 반영됩니다',
      }
    }

    const quantity = Number(validatedData.quantityChange)

    // 이벤트 기록 + 재고 반영을 트랜잭션으로 묶어 원장 정합성 보장
    const event = await db.transaction(async (tx) => {
      if (validatedData.eventType === 'audit') {
        // 실사: 입력값 = 측정한 실제 재고(절대값). 현재 재고와의 차이를 이벤트로 기록
        const [current] = await tx
          .select({
            id: inventory.id,
            currentQuantity: inventory.currentQuantity,
          })
          .from(inventory)
          .where(
            and(
              eq(inventory.storeId, validatedData.storeId),
              eq(inventory.ingredientId, validatedData.ingredientId)
            )
          )
          .for('update')
          .limit(1)

        const currentQty = current ? Number(current.currentQuantity) : 0
        const delta = quantity - currentQty

        const [auditEvent] = await tx
          .insert(inventoryEvents)
          .values({
            storeId: validatedData.storeId,
            ingredientId: validatedData.ingredientId,
            eventType: 'audit',
            quantityChange: String(delta),
            reason: validatedData.reason || `실사 조정 (측정값 ${quantity})`,
            eventDate: validatedData.eventDate,
            createdBy: 'system',
          })
          .returning()

        if (current) {
          await tx
            .update(inventory)
            .set({
              currentQuantity: String(quantity),
              lastUpdated: new Date(),
            })
            .where(eq(inventory.id, current.id))
        } else {
          await tx.insert(inventory).values({
            storeId: validatedData.storeId,
            ingredientId: validatedData.ingredientId,
            currentQuantity: String(quantity),
            lastUpdated: new Date(),
          })
        }
        return auditEvent
      }

      // 폐기: 입력값을 감소량으로 처리 (부호 무관), 조정: 부호 그대로 반영
      const delta =
        validatedData.eventType === 'waste' ? -Math.abs(quantity) : quantity

      return applyInventoryDelta(tx, {
        storeId: validatedData.storeId,
        ingredientId: validatedData.ingredientId,
        delta,
        eventType: validatedData.eventType,
        reason:
          validatedData.reason ||
          (validatedData.eventType === 'waste' ? '폐기' : '수동 조정'),
        eventDate: validatedData.eventDate,
        createIfMissing: true,
      })
    })

    revalidatePath('/dashboard/inventory')
    revalidateInventoryData(validatedData.storeId)

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
    await assertPermission('inventory', 'write')
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

    // 재료가 사용자 조직 소속인지 확인 (타 조직 재료로 규칙 생성 방지)
    const organizationId = await getOrganizationId()
    const ingredient = await db.query.ingredients.findFirst({
      where: and(
        eq(ingredients.id, validatedData.ingredientId),
        isNull(ingredients.deletedAt)
      ),
      columns: { organizationId: true },
    })
    if (!ingredient || ingredient.organizationId !== organizationId) {
      return {
        success: false,
        error: '해당 재료에 대한 권한이 없습니다',
      }
    }

    // 같은 (매장, 재료) 조합의 활성 규칙이 이미 있는지 확인
    const existingRule = await db.query.inventoryAlertRules.findFirst({
      where: and(
        eq(inventoryAlertRules.ingredientId, validatedData.ingredientId),
        validatedData.storeId
          ? eq(inventoryAlertRules.storeId, validatedData.storeId)
          : isNull(inventoryAlertRules.storeId),
        isNull(inventoryAlertRules.deletedAt)
      ),
    })

    if (existingRule) {
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
    revalidateAlertRuleData(validatedData.storeId)

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
    await assertPermission('inventory', 'write')
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

    // 기존 매장(태그 무효화용) 조회
    const existingRule = await db.query.inventoryAlertRules.findFirst({
      where: eq(inventoryAlertRules.id, id),
      columns: { storeId: true },
    })

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
    revalidateAlertRuleData(validatedData.storeId)
    if (
      existingRule?.storeId &&
      existingRule.storeId !== validatedData.storeId
    ) {
      revalidateAlertRuleData(existingRule.storeId)
    }

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
    await assertPermission('inventory', 'delete')
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
      .returning({
        id: inventoryAlertRules.id,
        storeId: inventoryAlertRules.storeId,
      })

    if (result.length === 0) {
      return {
        success: false,
        error: '삭제할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    revalidatePath('/dashboard/inventory')
    revalidateAlertRuleData(result[0].storeId)

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

    const normalizedStoreId = storeId || 'all'

    // 캐시 키에 사용자의 권한 정보 포함
    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedAlertRules = unstable_cache(
      () => fetchAlertRules(normalizedStoreId, authorizedStoreIds),
      ['inventory:alerts', storeKey, normalizedStoreId],
      { tags: [cacheTags.inventoryAlerts(normalizedStoreId)] }
    )

    return await getCachedAlertRules()
  } catch (error) {
    logger.error('Failed to fetch alert rules:', errorToContext(error))
    return []
  }
}

// =====================
// Low-stock Alerts (화면 표시 + 발송)
// =====================

/**
 * 권한 범위 내 활성 알림 규칙을 평가하여 재고 부족 항목 목록을 반환합니다.
 * - 규칙은 반드시 사용자의 조직 범위로 필터링 (lib/inventory/alert-service)
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

    const organizationId = await getOrganizationId()
    const rules = await getActiveAlertRules(organizationId, authorizedStoreIds)

    const storeRows = await db
      .select({
        id: stores.id,
        storeName: stores.storeName,
        managerPhone: stores.managerPhone,
        organizationId: stores.organizationId,
      })
      .from(stores)
      .where(
        and(isNull(stores.deletedAt), inArray(stores.id, authorizedStoreIds))
      )
    const storeMap = new Map(storeRows.map((s) => [s.id, s]))

    const tasks = expandRulesToTasks(rules, (rule) =>
      rule.storeId
        ? targetStoreIds.includes(rule.storeId)
          ? [rule.storeId]
          : []
        : targetStoreIds
    )

    const ruleAlerts =
      tasks.length > 0 ? await evaluateLowStock(tasks, storeMap) : []
    // 봉 단위 재료: 규칙 없이 잔여 1봉 이하 자동 알림
    const bagAlerts = await evaluateBagLowStock(
      targetStoreIds,
      storeMap,
      organizationId
    )
    return [...bagAlerts, ...ruleAlerts]
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
  skipped: number
  error?: string
}> {
  const empty = { total: 0, sent: 0, failed: 0, pending: 0, skipped: 0 }
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
