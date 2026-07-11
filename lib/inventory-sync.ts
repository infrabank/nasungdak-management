import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  ingredients,
  inventory,
  inventoryEvents,
  skuRecipes,
} from '@/lib/db/schema'
import { getRecipeToIngredientFactor } from '@/lib/costing'

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

interface InventoryDeltaInput {
  storeId: string
  ingredientId: string
  /** 재료 사용 단위 기준 증감량 (양수: 증가, 음수: 감소) */
  delta: number
  eventType: 'purchase' | 'sale' | 'waste' | 'audit' | 'adjustment'
  reason: string
  eventDate: string
  referenceId?: string | null
  /** 재고 행이 없을 때 새로 만들지 여부 (매입: true, 판매 차감: false) */
  createIfMissing?: boolean
  unit?: string | null
}

/**
 * 재고 이벤트 기록 + 재고 수량 원자 증감을 한 번에 수행합니다.
 * 반드시 트랜잭션(tx) 안에서 호출해야 원장(inventory_events)과 실재고의 정합성이 보장됩니다.
 * @returns 기록된 이벤트 (재고 행이 없어 건너뛴 경우 null)
 */
export async function applyInventoryDelta(
  tx: Tx,
  input: InventoryDeltaInput
): Promise<typeof inventoryEvents.$inferSelect | null> {
  const existing = await tx.query.inventory.findFirst({
    where: and(
      eq(inventory.storeId, input.storeId),
      eq(inventory.ingredientId, input.ingredientId)
    ),
    columns: { id: true },
  })

  if (!existing && !input.createIfMissing) {
    // 매장이 관리하지 않는 재료: 이벤트도 남기지 않아 원장 정합성 유지
    return null
  }

  const [event] = await tx
    .insert(inventoryEvents)
    .values({
      storeId: input.storeId,
      ingredientId: input.ingredientId,
      eventType: input.eventType,
      quantityChange: String(input.delta),
      reason: input.reason,
      eventDate: input.eventDate,
      referenceId: input.referenceId ?? null,
      createdBy: 'system',
    })
    .returning()

  if (existing) {
    await tx
      .update(inventory)
      .set({
        currentQuantity: sql`${inventory.currentQuantity} + ${String(input.delta)}`,
        lastUpdated: new Date(),
        // 호출자가 unit을 넘기면 기존 행 unit도 최신화 (봉 전환 등 단위 변경 반영, unit 드리프트 방지)
        ...(input.unit != null ? { unit: input.unit } : {}),
      })
      .where(eq(inventory.id, existing.id))
  } else {
    // 재고 unit은 항상 재료 마스터 unit을 복사한다 (unit=null 행 생성 방지, 스캔 check 1 원인 제거)
    let unit = input.unit ?? null
    if (unit == null) {
      const ing = await tx.query.ingredients.findFirst({
        where: eq(ingredients.id, input.ingredientId),
        columns: { unit: true },
      })
      unit = ing?.unit ?? null
    }
    // upsert: (store, ingredient) unique 인덱스 기준. 동시 요청이 같은 행을 만들면 합산으로 병합
    await tx
      .insert(inventory)
      .values({
        storeId: input.storeId,
        ingredientId: input.ingredientId,
        currentQuantity: String(input.delta),
        unit,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: [inventory.storeId, inventory.ingredientId],
        set: {
          currentQuantity: sql`${inventory.currentQuantity} + ${String(input.delta)}`,
          lastUpdated: new Date(),
        },
      })
  }
  return event
}

/**
 * 매입 1건을 재고에 반영합니다 (구매 단위 -> 사용 단위 변환 포함).
 */
export async function syncPurchaseToInventory(
  tx: Tx,
  params: {
    storeId: string
    ingredientId: string
    quantity: string
    purchaseId: string
    transactionDate: string
  }
): Promise<void> {
  const ingredient = await tx.query.ingredients.findFirst({
    where: and(
      eq(ingredients.id, params.ingredientId),
      isNull(ingredients.deletedAt)
    ),
    columns: { unit: true, conversionFactor: true, managementLevel: true },
  })

  // 삭제된 재료(조회 실패)는 재고 반영하지 않는다
  if (!ingredient) return

  // 'bag'(봉 단위 관리): 매입 수량 = 봉 수 그대로 재고 가산 (환산 계수 미적용)
  if (ingredient.managementLevel === 'bag') {
    await applyInventoryDelta(tx, {
      storeId: params.storeId,
      ingredientId: params.ingredientId,
      delta: Number(params.quantity),
      eventType: 'purchase',
      reason: '매입 자동 반영 (봉 단위)',
      eventDate: params.transactionDate,
      referenceId: params.purchaseId,
      createIfMissing: true,
      unit: '봉',
    })
    return
  }

  const factor = ingredient.conversionFactor
    ? Number(ingredient.conversionFactor)
    : 1
  const convertedQuantity = Number(params.quantity) * factor

  await applyInventoryDelta(tx, {
    storeId: params.storeId,
    ingredientId: params.ingredientId,
    delta: convertedQuantity,
    eventType: 'purchase',
    reason: factor === 1 ? '매입 자동 반영' : `매입 자동 반영 (x${factor})`,
    eventDate: params.transactionDate,
    referenceId: params.purchaseId,
    // 'core'(재고+원가)만 재고 행을 생성한다. 'simple'(매입만)/'expense'(비용)는 재고 미추적
    createIfMissing: ingredient.managementLevel === 'core',
    unit: ingredient.unit,
  })
}

/**
 * referenceId(매입/판매 ID)로 기록된 재고 이벤트 합계를 역보정합니다.
 * 매입/판매의 수정·삭제 시 호출. 자동 반영 이력이 없으면 아무것도 하지 않습니다.
 */
export async function reverseInventoryByReferences(
  tx: Tx,
  referenceIds: string[],
  eventType: 'purchase' | 'sale' | 'adjustment',
  reason: string,
  eventDate: string
): Promise<void> {
  if (referenceIds.length === 0) return

  const sums = await tx
    .select({
      storeId: inventoryEvents.storeId,
      ingredientId: inventoryEvents.ingredientId,
      referenceId: inventoryEvents.referenceId,
      total: sql<string>`SUM(${inventoryEvents.quantityChange})`,
    })
    .from(inventoryEvents)
    .where(inArray(inventoryEvents.referenceId, referenceIds))
    .groupBy(
      inventoryEvents.storeId,
      inventoryEvents.ingredientId,
      inventoryEvents.referenceId
    )

  for (const row of sums) {
    const total = Number(row.total)
    if (total === 0) continue
    await applyInventoryDelta(tx, {
      storeId: row.storeId,
      ingredientId: row.ingredientId,
      delta: -total,
      eventType,
      reason,
      eventDate,
      referenceId: row.referenceId,
      createIfMissing: true,
    })
  }
}

export interface RecipeLine {
  ingredientId: string
  quantity: string
  unit: string
  ingredientUnit: string
  managementLevel: string
}

/**
 * 여러 SKU의 레시피(재료 소모량)를 한 번에 조회합니다. 판매 차감용.
 */
export async function fetchRecipesBySkuIds(
  tx: Tx,
  skuIds: string[]
): Promise<Map<string, RecipeLine[]>> {
  const map = new Map<string, RecipeLine[]>()
  if (skuIds.length === 0) return map

  const rows = await tx
    .select({
      skuId: skuRecipes.skuId,
      ingredientId: skuRecipes.ingredientId,
      quantity: skuRecipes.quantity,
      unit: skuRecipes.unit,
      ingredientUnit: ingredients.unit,
      managementLevel: ingredients.managementLevel,
    })
    .from(skuRecipes)
    .innerJoin(ingredients, eq(skuRecipes.ingredientId, ingredients.id))
    .where(
      and(
        inArray(skuRecipes.skuId, skuIds),
        isNull(skuRecipes.deletedAt),
        isNull(ingredients.deletedAt)
      )
    )

  for (const row of rows) {
    const lines = map.get(row.skuId) ?? []
    lines.push(row)
    map.set(row.skuId, lines)
  }
  return map
}

/**
 * 판매 1건을 레시피(sku_recipes) 기준으로 재고에서 차감합니다.
 * 해당 매장에 재고 행이 없는 재료는 건너뜁니다(관리 대상 아님).
 * recipes 미전달 시 직접 조회합니다 (대량 처리 시 fetchRecipesBySkuIds로 미리 조회 권장).
 */
export async function syncSaleToInventory(
  tx: Tx,
  params: {
    storeId: string
    skuId: string
    quantitySold: number
    saleId: string
    saleDate: string
  },
  recipes?: RecipeLine[]
): Promise<void> {
  const lines =
    recipes ??
    (await fetchRecipesBySkuIds(tx, [params.skuId])).get(params.skuId) ??
    []

  for (const line of lines) {
    // 'bag'(봉 단위 관리) 재료는 판매 매칭 차감 대상이 아님 — 봉 사용 버튼으로 수동 기록
    if (line.managementLevel === 'bag') continue

    const factor =
      getRecipeToIngredientFactor(line.unit, line.ingredientUnit) ?? 1
    const consumed = Number(line.quantity) * factor * params.quantitySold
    if (consumed === 0) continue

    await applyInventoryDelta(tx, {
      storeId: params.storeId,
      ingredientId: line.ingredientId,
      delta: -consumed,
      eventType: 'sale',
      reason: '판매 자동 차감',
      eventDate: params.saleDate,
      referenceId: params.saleId,
      createIfMissing: false,
    })
  }
}
