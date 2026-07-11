import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { format, subDays } from 'date-fns'
import { db } from '@/lib/db'
import {
  ingredients,
  inventory,
  inventoryAlertRules,
  stores,
} from '@/lib/db/schema'
import { RECIPE_QTY_IN_INGREDIENT_UNIT_SQL } from '@/lib/costing'
import { logger, errorToContext } from '@/lib/logger'
import type { InventoryAlertItem } from '@/lib/notifications/inventory-alert'

export interface AlertRuleRow {
  storeId: string | null
  ingredientId: string
  alertThresholdDays: number
  predictionPeriodDays: number
  ingredientName: string
  ingredientOrgId: string | null
}

export interface AlertEvaluationTask {
  storeId: string
  ingredientId: string
  ingredientName: string
  thresholdDays: number
  periodDays: number
}

export interface StoreInfo {
  id: string
  storeName: string
  managerPhone: string | null
  organizationId: string | null
}

/**
 * 활성 알림 규칙 조회. 반드시 조직 범위로 필터링합니다 (멀티테넌시 격리).
 * - organizationId가 있으면 재료의 조직 기준으로 필터
 * - 없으면 권한 매장에 직접 연결된 규칙만 (전체 매장 NULL 규칙 제외)
 */
export async function getActiveAlertRules(
  organizationId: string | null,
  authorizedStoreIds: string[]
): Promise<AlertRuleRow[]> {
  const conditions = [
    eq(inventoryAlertRules.isActive, true),
    isNull(inventoryAlertRules.deletedAt),
    isNull(ingredients.deletedAt),
  ]

  if (organizationId) {
    conditions.push(eq(ingredients.organizationId, organizationId))
  } else {
    if (authorizedStoreIds.length === 0) return []
    conditions.push(inArray(inventoryAlertRules.storeId, authorizedStoreIds))
  }

  return db
    .select({
      storeId: inventoryAlertRules.storeId,
      ingredientId: inventoryAlertRules.ingredientId,
      alertThresholdDays: inventoryAlertRules.alertThresholdDays,
      predictionPeriodDays: inventoryAlertRules.predictionPeriodDays,
      ingredientName: ingredients.ingredientName,
      ingredientOrgId: ingredients.organizationId,
    })
    .from(inventoryAlertRules)
    .innerJoin(ingredients, eq(inventoryAlertRules.ingredientId, ingredients.id))
    .where(and(...conditions))
}

/**
 * (매장, 재료) 조합들의 재고 부족 여부를 일괄 평가합니다.
 * 규칙 x 매장마다 개별 쿼리를 날리던 방식 대신,
 * 재고 1회 + 예측 기간별 사용량 집계 1회씩으로 처리합니다.
 *
 * 판정 규칙:
 * - 판매 이력(레시피 기반 소모)이 없으면 예측 불가 -> 알림 제외
 * - 재고 행이 없거나 0 이하인데 소모 이력이 있으면 잔여 0일로 알림
 */
export async function evaluateLowStock(
  tasks: AlertEvaluationTask[],
  storeMap: Map<string, StoreInfo>
): Promise<InventoryAlertItem[]> {
  if (tasks.length === 0) return []

  const storeIds = [...new Set(tasks.map((t) => t.storeId))]
  const ingredientIds = [...new Set(tasks.map((t) => t.ingredientId))]

  // 1) 현재 재고 일괄 조회
  const invRows = await db
    .select({
      storeId: inventory.storeId,
      ingredientId: inventory.ingredientId,
      currentQuantity: inventory.currentQuantity,
    })
    .from(inventory)
    .where(
      and(
        inArray(inventory.storeId, storeIds),
        inArray(inventory.ingredientId, ingredientIds)
      )
    )
  const invMap = new Map(
    invRows.map((r) => [
      `${r.storeId}:${r.ingredientId}`,
      Number(r.currentQuantity),
    ])
  )

  // 2) 예측 기간별 재료 사용량 일괄 집계 (판매량 x 레시피 소모량, 단위 환산 포함)
  const storeIn = sql.join(
    storeIds.map((id) => sql`${id}::uuid`),
    sql`, `
  )
  const ingredientIn = sql.join(
    ingredientIds.map((id) => sql`${id}::uuid`),
    sql`, `
  )
  const periods = [...new Set(tasks.map((t) => t.periodDays))]
  const usageMap = new Map<string, number>()

  for (const period of periods) {
    const startDate = format(subDays(new Date(), period), 'yyyy-MM-dd')
    const result = await db.execute(sql`
      SELECT
        sr.store_id,
        rec.ingredient_id,
        COALESCE(SUM(sr.quantity_sold * ${sql.raw(RECIPE_QTY_IN_INGREDIENT_UNIT_SQL)}), 0) AS total_used
      FROM sales_records sr
      JOIN sku_recipes rec
        ON rec.sku_id = sr.sku_id AND rec.deleted_at IS NULL
      JOIN ingredients ing ON ing.id = rec.ingredient_id
        AND ing.management_level != 'bag'
      WHERE sr.deleted_at IS NULL
        AND sr.sale_date >= ${startDate}::date
        AND sr.store_id IN (${storeIn})
        AND rec.ingredient_id IN (${ingredientIn})
      GROUP BY sr.store_id, rec.ingredient_id
    `)
    for (const row of result.rows as Array<{
      store_id: string
      ingredient_id: string
      total_used: string
    }>) {
      usageMap.set(
        `${period}:${row.store_id}:${row.ingredient_id}`,
        Number(row.total_used)
      )
    }
  }

  // 3) 판정
  const alerts: InventoryAlertItem[] = []
  for (const task of tasks) {
    const totalUsed =
      usageMap.get(`${task.periodDays}:${task.storeId}:${task.ingredientId}`) ??
      0
    const avgDailyUse = totalUsed / task.periodDays
    if (avgDailyUse <= 0) continue // 소모 이력 없음: 예측 불가

    const currentStock =
      invMap.get(`${task.storeId}:${task.ingredientId}`) ?? 0
    const daysRemaining =
      currentStock <= 0 ? 0 : Math.floor(currentStock / avgDailyUse)

    if (daysRemaining <= task.thresholdDays) {
      const store = storeMap.get(task.storeId)
      alerts.push({
        storeId: task.storeId,
        storeName: store?.storeName ?? '',
        managerPhone: store?.managerPhone ?? '',
        ingredientId: task.ingredientId,
        ingredientName: task.ingredientName,
        daysRemaining,
        thresholdDays: task.thresholdDays,
      })
    }
  }

  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)
  return alerts
}

// 봉 단위 관리 재료의 알림 임계값: 잔여 1봉 이하
const BAG_ALERT_THRESHOLD = 1

/**
 * 봉 단위(managementLevel='bag') 재료의 재고 부족을 평가합니다.
 * 규칙 등록 없이 자동 적용: 잔여 수량이 1봉 이하면 알림.
 * 대상 매장의 재고 행이 있는 (매장, 재료) 조합만 평가합니다.
 */
export async function evaluateBagLowStock(
  storeIds: string[],
  storeMap: Map<string, StoreInfo>,
  organizationId?: string | null
): Promise<InventoryAlertItem[]> {
  if (storeIds.length === 0) return []

  const conditions = [
    eq(ingredients.managementLevel, 'bag'),
    eq(ingredients.isActive, true),
    isNull(ingredients.deletedAt),
    inArray(inventory.storeId, storeIds),
    sql`${inventory.currentQuantity} <= ${BAG_ALERT_THRESHOLD}`,
  ]
  if (organizationId) {
    conditions.push(eq(ingredients.organizationId, organizationId))
  }

  const rows = await db
    .select({
      storeId: inventory.storeId,
      ingredientId: inventory.ingredientId,
      ingredientName: ingredients.ingredientName,
      currentQuantity: inventory.currentQuantity,
    })
    .from(inventory)
    .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
    .where(and(...conditions))

  const alerts: InventoryAlertItem[] = rows.map((r) => {
    const store = storeMap.get(r.storeId)
    const count = Math.max(0, Math.floor(Number(r.currentQuantity)))
    return {
      storeId: r.storeId,
      storeName: store?.storeName ?? '',
      managerPhone: store?.managerPhone ?? '',
      ingredientId: r.ingredientId,
      ingredientName: r.ingredientName,
      daysRemaining: count,
      thresholdDays: BAG_ALERT_THRESHOLD,
      bagMode: true,
      bagCount: count,
    }
  })

  alerts.sort((a, b) => (a.bagCount ?? 0) - (b.bagCount ?? 0))
  return alerts
}

/**
 * 규칙 목록을 (매장, 재료) 평가 작업으로 확장합니다. 같은 조합은 첫 규칙만 사용합니다.
 */
export function expandRulesToTasks(
  rules: AlertRuleRow[],
  resolveTargetStores: (rule: AlertRuleRow) => string[]
): AlertEvaluationTask[] {
  const tasks: AlertEvaluationTask[] = []
  const seen = new Set<string>()

  for (const rule of rules) {
    for (const storeId of resolveTargetStores(rule)) {
      const key = `${storeId}:${rule.ingredientId}`
      if (seen.has(key)) continue
      seen.add(key)
      tasks.push({
        storeId,
        ingredientId: rule.ingredientId,
        ingredientName: rule.ingredientName,
        thresholdDays: rule.alertThresholdDays,
        periodDays: rule.predictionPeriodDays,
      })
    }
  }
  return tasks
}

/**
 * 전체 조직 대상 재고 부족 점검 (크론용).
 * 각 규칙을 소속 조직의 매장 범위에서만 평가합니다.
 */
export async function evaluateLowStockForAllOrgs(): Promise<
  InventoryAlertItem[]
> {
  try {
    const rules = await db
      .select({
        storeId: inventoryAlertRules.storeId,
        ingredientId: inventoryAlertRules.ingredientId,
        alertThresholdDays: inventoryAlertRules.alertThresholdDays,
        predictionPeriodDays: inventoryAlertRules.predictionPeriodDays,
        ingredientName: ingredients.ingredientName,
        ingredientOrgId: ingredients.organizationId,
      })
      .from(inventoryAlertRules)
      .innerJoin(
        ingredients,
        eq(inventoryAlertRules.ingredientId, ingredients.id)
      )
      .where(
        and(
          eq(inventoryAlertRules.isActive, true),
          isNull(inventoryAlertRules.deletedAt),
          isNull(ingredients.deletedAt)
        )
      )

    // 규칙이 없어도 봉 단위 자동 알림은 평가해야 하므로 여기서 조기 반환하지 않는다
    const storeRows = await db
      .select({
        id: stores.id,
        storeName: stores.storeName,
        managerPhone: stores.managerPhone,
        organizationId: stores.organizationId,
      })
      .from(stores)
      .where(and(isNull(stores.deletedAt), eq(stores.isActive, true)))

    const storeMap = new Map(storeRows.map((s) => [s.id, s]))
    const storesByOrg = new Map<string, string[]>()
    for (const s of storeRows) {
      if (!s.organizationId) continue
      const list = storesByOrg.get(s.organizationId) ?? []
      list.push(s.id)
      storesByOrg.set(s.organizationId, list)
    }

    const tasks = expandRulesToTasks(rules, (rule) => {
      if (rule.storeId) {
        return storeMap.has(rule.storeId) ? [rule.storeId] : []
      }
      // 전체 매장 규칙: 재료가 속한 조직의 매장으로만 확장
      if (!rule.ingredientOrgId) return []
      return storesByOrg.get(rule.ingredientOrgId) ?? []
    })

    const ruleAlerts =
      tasks.length > 0 ? await evaluateLowStock(tasks, storeMap) : []
    // 봉 단위 재료는 규칙 없이 자동 평가 (잔여 1봉 이하)
    const bagAlerts = await evaluateBagLowStock(
      storeRows.map((s) => s.id),
      storeMap
    )
    return [...bagAlerts, ...ruleAlerts]
  } catch (error) {
    logger.error(
      'Failed to evaluate low stock for all orgs:',
      errorToContext(error)
    )
    return []
  }
}
