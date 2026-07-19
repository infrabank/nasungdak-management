'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { purchaseSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { purchaseTransactions, ingredients } from '@/lib/db/schema'
import { eq, and, isNull, desc, sql, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import {
  getAuthorizedStoreIds,
  getOrganizationId,
  assertStoreAccess,
  resolveStoreId,
  assertPermission,
} from '@/lib/auth-context'
import {
  revalidatePurchaseData,
  revalidatePurchaseDataMany,
  revalidateIngredientData,
  cacheTags,
} from '@/lib/cache-tags'
import {
  syncPurchaseToInventory,
  reverseInventoryByReferences,
} from '@/lib/inventory-sync'

// 매입 단가가 마스터 단가와 이 비율(%) 이상 차이나면 갱신 제안을 반환
const PRICE_DEVIATION_THRESHOLD_PERCENT = 10

export interface PurchasePriceAlert {
  ingredientName: string
  unit: string
  masterUnitCost: number
  purchaseUnitCost: number // 사용 단위 환산 매입 단가
  diffPercent: number
}

/**
 * 매입 단가(사용 단위 환산)와 재료 마스터 단가의 괴리를 확인합니다.
 * 임계값 미만이거나 마스터 단가 미설정 시 null. 자동 갱신은 하지 않고 제안만 반환합니다.
 */
async function buildPriceAlert(
  ingredientId: string,
  purchaseUnitPrice: string
): Promise<PurchasePriceAlert | null> {
  const ingredient = await db.query.ingredients.findFirst({
    where: and(eq(ingredients.id, ingredientId), isNull(ingredients.deletedAt)),
    columns: {
      ingredientName: true,
      unit: true,
      unitCost: true,
      conversionFactor: true,
    },
  })
  if (!ingredient?.unitCost) return null

  const masterUnitCost = Number(ingredient.unitCost)
  if (masterUnitCost <= 0) return null

  const factor = ingredient.conversionFactor
    ? Number(ingredient.conversionFactor)
    : 1
  const purchaseUnitCost = Number(purchaseUnitPrice) / (factor || 1)
  const diffPercent =
    ((purchaseUnitCost - masterUnitCost) / masterUnitCost) * 100

  if (Math.abs(diffPercent) < PRICE_DEVIATION_THRESHOLD_PERCENT) return null

  return {
    ingredientName: ingredient.ingredientName,
    unit: ingredient.unit,
    masterUnitCost,
    purchaseUnitCost,
    diffPercent,
  }
}

export async function createPurchase(formData: FormData) {
  try {
    await assertPermission('purchases', 'write')
    // 클라이언트가 보낸 storeId는 반드시 권한 검증 (없으면 첫 권한 매장)
    const storeId = await resolveStoreId(formData.get('storeId') as string | null)

    const notes = formData.get('notes')
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      ingredientId: formData.get('ingredientId'),
      supplierName: formData.get('supplierName'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      notes:
        notes && typeof notes === 'string' && notes.trim()
          ? notes.trim()
          : null,
    }

    const validatedData = purchaseSchema.parse(rawData)

    const transaction = await db.transaction(async (tx) => {
      const [createdPurchase] = await tx
        .insert(purchaseTransactions)
        .values({
          ...validatedData,
          storeId,
          createdBy: 'system',
        })
        .returning()

      if (createdPurchase.storeId) {
        await syncPurchaseToInventory(tx, {
          storeId: createdPurchase.storeId,
          ingredientId: createdPurchase.ingredientId,
          quantity: createdPurchase.quantity,
          purchaseId: createdPurchase.id,
          transactionDate: createdPurchase.transactionDate,
        })
      }

      return createdPurchase
    })

    const priceAlert = await buildPriceAlert(
      transaction.ingredientId,
      transaction.unitPrice
    )

    revalidatePath('/dashboard/purchases')
    revalidatePurchaseData(transaction.storeId)

    return {
      success: true,
      data: {
        id: transaction.id,
        totalAmount: Number(transaction.totalAmount),
        priceAlert,
      },
    }
  } catch (error) {
    logger.error('Failed to create purchase:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '매입 등록에 실패했습니다',
    }
  }
}

export async function updatePurchase(id: string, formData: FormData) {
  try {
    await assertPermission('purchases', 'write')
    const notes = formData.get('notes')
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      ingredientId: formData.get('ingredientId'),
      supplierName: formData.get('supplierName'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      notes:
        notes && typeof notes === 'string' && notes.trim()
          ? notes.trim()
          : null,
    }

    const validatedData = purchaseSchema.parse(rawData)

    // 대상 레코드 소유권 검증 (삭제된 레코드는 부활 불가)
    const existing = await db.query.purchaseTransactions.findFirst({
      where: and(
        eq(purchaseTransactions.id, id),
        isNull(purchaseTransactions.deletedAt)
      ),
      columns: { storeId: true },
    })
    if (!existing) {
      return { success: false, error: '매입 기록을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    const transaction = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(purchaseTransactions)
        .set({
          ...validatedData,
          updatedAt: new Date(),
          updatedBy: 'system',
        })
        .where(
          and(
            eq(purchaseTransactions.id, id),
            isNull(purchaseTransactions.deletedAt)
          )
        )
        .returning()

      if (updated?.storeId) {
        // 기존 자동 반영분을 원복한 뒤 새 값으로 다시 반영
        await reverseInventoryByReferences(
          tx,
          [id],
          'adjustment',
          '매입 수정 원복',
          updated.transactionDate
        )
        await syncPurchaseToInventory(tx, {
          storeId: updated.storeId,
          ingredientId: updated.ingredientId,
          quantity: updated.quantity,
          purchaseId: updated.id,
          transactionDate: updated.transactionDate,
        })
      }

      return updated
    })

    revalidatePath('/dashboard/purchases')
    revalidatePurchaseData(transaction?.storeId ?? existing.storeId)

    return {
      success: true,
      data: transaction,
    }
  } catch (error) {
    logger.error('Failed to update purchase:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '매입 수정에 실패했습니다',
    }
  }
}

export async function deletePurchase(id: string) {
  try {
    await assertPermission('purchases', 'delete')
    // Fetch storeId before soft delete for cache invalidation + 소유권 검증
    const existing = await db.query.purchaseTransactions.findFirst({
      where: and(
        eq(purchaseTransactions.id, id),
        isNull(purchaseTransactions.deletedAt)
      ),
      columns: { storeId: true, transactionDate: true },
    })
    if (!existing) {
      return { success: false, error: '매입 기록을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    await db.transaction(async (tx) => {
      await tx
        .update(purchaseTransactions)
        .set({
          deletedAt: new Date(),
          deletedBy: 'system',
        })
        .where(
          and(
            eq(purchaseTransactions.id, id),
            isNull(purchaseTransactions.deletedAt)
          )
        )

      // 자동 반영된 재고를 원복 (반영 이력이 없으면 no-op)
      await reverseInventoryByReferences(
        tx,
        [id],
        'adjustment',
        '매입 삭제 원복',
        existing.transactionDate ?? new Date().toISOString().slice(0, 10)
      )
    })

    revalidatePath('/dashboard/purchases')
    revalidatePurchaseData(existing.storeId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete purchase:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '매입 삭제에 실패했습니다',
    }
  }
}

// Default page size for pagination
const PURCHASES_PAGE_SIZE = 50

async function fetchPurchases(
  startDate: string,
  endDate: string,
  ingredientId: string,
  storeId: string,
  page: number,
  authorizedStoreIds: string[]
) {
  if (authorizedStoreIds.length === 0) {
    return { items: [], hasMore: false, page: 1 }
  }

  const conditions = [isNull(purchaseTransactions.deletedAt)]
  conditions.push(inArray(purchaseTransactions.storeId, authorizedStoreIds))

  if (startDate !== 'all' && endDate !== 'all') {
    conditions.push(
      sql`${purchaseTransactions.transactionDate} BETWEEN ${startDate}::date AND ${endDate}::date`
    )
  }

  if (ingredientId !== 'all') {
    conditions.push(eq(purchaseTransactions.ingredientId, ingredientId))
  }

  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
    conditions.push(eq(purchaseTransactions.storeId, storeId))
  }

  const offset = (page - 1) * PURCHASES_PAGE_SIZE

  const purchases = await db
    .select({
      id: purchaseTransactions.id,
      storeId: purchaseTransactions.storeId,
      transactionDate: purchaseTransactions.transactionDate,
      ingredientId: purchaseTransactions.ingredientId,
      ingredientName: ingredients.ingredientName,
      supplierName: purchaseTransactions.supplierName,
      quantity: purchaseTransactions.quantity,
      unitPrice: purchaseTransactions.unitPrice,
      totalAmount: purchaseTransactions.totalAmount,
      notes: purchaseTransactions.notes,
    })
    .from(purchaseTransactions)
    .leftJoin(
      ingredients,
      eq(purchaseTransactions.ingredientId, ingredients.id)
    )
    .where(and(...conditions))
    .orderBy(desc(purchaseTransactions.transactionDate))
    .limit(PURCHASES_PAGE_SIZE + 1)
    .offset(offset)

  const hasMore = purchases.length > PURCHASES_PAGE_SIZE
  const items = hasMore ? purchases.slice(0, PURCHASES_PAGE_SIZE) : purchases

  return { items, hasMore, page }
}

export async function getPurchases(
  startDate?: string,
  endDate?: string,
  ingredientId?: string,
  storeId?: string,
  page: number = 1
) {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { items: [], hasMore: false, page: 1 }
    }

    const normalizedStartDate = startDate ?? 'all'
    const normalizedEndDate = endDate ?? 'all'
    const normalizedIngredientId = ingredientId ?? 'all'
    const normalizedStoreId = storeId || 'all'
    const normalizedPage = Math.max(1, page)

    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedPurchases = unstable_cache(
      () =>
        fetchPurchases(
          normalizedStartDate,
          normalizedEndDate,
          normalizedIngredientId,
          normalizedStoreId,
          normalizedPage,
          authorizedStoreIds
        ),
      [
        'purchases:list:v5',
        storeKey,
        normalizedStartDate,
        normalizedEndDate,
        normalizedIngredientId,
        normalizedStoreId,
        String(normalizedPage),
      ],
      { tags: [cacheTags.purchases(normalizedStoreId)] }
    )

    return await getCachedPurchases()
  } catch (error) {
    logger.error('Failed to fetch purchases:', errorToContext(error))
    return { items: [], hasMore: false, page: 1 }
  }
}

async function fetchIngredientsForFilter(organizationId: string) {
  const ingredientsList = await db
    .select({
      id: ingredients.id,
      ingredientName: ingredients.ingredientName,
    })
    .from(ingredients)
    .where(
      and(
        isNull(ingredients.deletedAt),
        eq(ingredients.isActive, true),
        eq(ingredients.organizationId, organizationId)
      )
    )
    .orderBy(ingredients.ingredientName)

  return ingredientsList
}

export async function getIngredientsForFilter() {
  try {
    const organizationId = await getOrganizationId()
    if (!organizationId) return []

    const getCachedIngredientsForFilter = unstable_cache(
      () => fetchIngredientsForFilter(organizationId),
      ['ingredients:active', organizationId],
      {
        tags: [cacheTags.ingredientsActive, cacheTags.ingredients(organizationId)],
      }
    )

    return await getCachedIngredientsForFilter()
  } catch (error) {
    logger.error('Failed to fetch ingredients:', errorToContext(error))
    return []
  }
}

export async function getSupplierSuggestions(): Promise<string[]> {
  try {
    // 매입처는 storeId, 공급업체 마스터는 organizationId로 스코핑 (타 조직 노출 방지)
    const organizationId = await getOrganizationId()
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (!organizationId || authorizedStoreIds.length === 0) return []

    const storeIdList = sql.join(
      authorizedStoreIds.map((id) => sql`${id}::uuid`),
      sql`, `
    )

    const result = await db.execute(sql`
      SELECT DISTINCT supplier_name
      FROM purchase_transactions
      WHERE deleted_at IS NULL AND supplier_name IS NOT NULL
        AND store_id IN (${storeIdList})
      UNION
      SELECT supplier_name
      FROM suppliers
      WHERE deleted_at IS NULL AND supplier_name IS NOT NULL
        AND organization_id = ${organizationId}
      ORDER BY supplier_name
      LIMIT 200
    `)
    return result.rows.map((row: any) => row.supplier_name as string)
  } catch (error) {
    logger.error('Failed to fetch supplier suggestions:', errorToContext(error))
    return []
  }
}

interface CSVRow {
  날짜: string
  메뉴?: string // 구버전 CSV 호환용 (무시됨)
  재료: string
  공급업체: string
  수량: string
  단가: string
  비고?: string
}

export interface PurchaseEntry {
  ingredientId?: string
  quantity: string
  unitPrice: string
  notes?: string | null
  quickIngredientName?: string
  quickIngredientUnit?: string
}

export async function createMultiplePurchases(
  transactionDate: string,
  supplierName: string,
  entries: PurchaseEntry[],
  formStoreId?: string
) {
  let successCount = 0
  let failedCount = 0
  const errors: string[] = []
  const results: Array<{
    index: number
    id: string
    totalAmount: number
  }> = []
  const createdEntries: Array<{ ingredientId: string; unitPrice: string }> = []

  let createdIngredient = false

  try {
    await assertPermission('purchases', 'write')
    // 클라이언트가 보낸 storeId는 반드시 권한 검증 (없으면 첫 권한 매장)
    const storeId = await resolveStoreId(formStoreId ?? null)
    const organizationId = await getOrganizationId()

    await db.transaction(async (tx) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const rowNum = i + 1

        try {
          // 행별 savepoint: 한 행이 DB 에러로 실패해도 tx 전체가 abort되지 않는다
          const outcome = await tx.transaction(async (sp) => {
            let resolvedIngredientId = entry.ingredientId
            let didCreateIngredient = false

            // Handle quick (one-time) ingredient creation
            if (
              !resolvedIngredientId &&
              entry.quickIngredientName &&
              entry.quickIngredientUnit
            ) {
              const trimmedName = entry.quickIngredientName.trim()
              const trimmedUnit = entry.quickIngredientUnit.trim()

              // Search for existing one-time ingredient with same name + org
              if (organizationId) {
                const existing = await sp.query.ingredients.findFirst({
                  where: and(
                    eq(ingredients.ingredientName, trimmedName),
                    eq(ingredients.isOneTime, true),
                    eq(ingredients.organizationId, organizationId),
                    isNull(ingredients.deletedAt)
                  ),
                })

                if (existing) {
                  resolvedIngredientId = existing.id
                }
              }

              // Create new one-time ingredient if not found
              if (!resolvedIngredientId) {
                const [newIngredient] = await sp
                  .insert(ingredients)
                  .values({
                    ingredientName: trimmedName,
                    unit: trimmedUnit,
                    isOneTime: true,
                    managementLevel: 'expense', // 일회성 재료는 비용 처리
                    organizationId: organizationId || undefined,
                    createdBy: 'system',
                  })
                  .returning()
                resolvedIngredientId = newIngredient.id
                didCreateIngredient = true
              }
            }

            if (!resolvedIngredientId) {
              throw new Error('재료를 선택하거나 입력해주세요')
            }

            const rawData = {
              transactionDate,
              ingredientId: resolvedIngredientId,
              supplierName,
              quantity: entry.quantity,
              unitPrice: entry.unitPrice,
              notes: entry.notes?.trim() || null,
            }

            const validatedData = purchaseSchema.parse(rawData)

            const [transaction] = await sp
              .insert(purchaseTransactions)
              .values({
                ...validatedData,
                storeId,
                createdBy: 'system',
              })
              .returning()

            if (transaction.storeId) {
              await syncPurchaseToInventory(sp, {
                storeId: transaction.storeId,
                ingredientId: transaction.ingredientId,
                quantity: transaction.quantity,
                purchaseId: transaction.id,
                transactionDate: transaction.transactionDate,
              })
            }

            return { transaction, didCreateIngredient }
          })

          if (outcome.didCreateIngredient) createdIngredient = true
          successCount++
          results.push({
            index: i,
            id: outcome.transaction.id,
            totalAmount: Number(outcome.transaction.totalAmount),
          })
          createdEntries.push({
            ingredientId: outcome.transaction.ingredientId,
            unitPrice: outcome.transaction.unitPrice,
          })
        } catch (error) {
          failedCount++
          if (error instanceof z.ZodError) {
            errors.push(`${rowNum}번 항목: ${error.errors[0].message}`)
          } else {
            errors.push(
              `${rowNum}번 항목: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            )
          }
        }
      }
    })

    revalidatePath('/dashboard/purchases')
    revalidatePurchaseData(storeId)
    // 간편 매입으로 일회성 재료가 생성되었으면 재료 목록/필터 캐시도 무효화
    if (createdIngredient) {
      revalidateIngredientData(organizationId)
    }

    // 마스터 단가와 크게 차이나는 매입 단가 감지 (재료별 1회)
    const priceAlerts: PurchasePriceAlert[] = []
    const checkedIngredients = new Set<string>()
    for (const entry of createdEntries) {
      if (checkedIngredients.has(entry.ingredientId)) continue
      checkedIngredients.add(entry.ingredientId)
      const alert = await buildPriceAlert(entry.ingredientId, entry.unitPrice)
      if (alert) priceAlerts.push(alert)
    }

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      results,
      priceAlerts,
      errors: errors.slice(0, 20),
    }
  } catch (error) {
    logger.error('Failed to create multiple purchases:', errorToContext(error))
    return {
      success: false,
      successCount,
      failedCount,
      results,
      error:
        error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}

export async function bulkCreatePurchases(
  rows: CSVRow[],
  formStoreId?: string
) {
  'use server'

  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    await assertPermission('purchases', 'write')
    // 클라이언트가 보낸 storeId는 반드시 권한 검증 (없으면 첫 권한 매장)
    const storeId = await resolveStoreId(formStoreId ?? null)
    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return { success: false, error: '조직 정보가 없습니다' }
    }

    // Fetch ingredients for name-to-ID mapping (조직 스코프)
    const ingredientsList = await db
      .select({
        id: ingredients.id,
        ingredientName: ingredients.ingredientName,
      })
      .from(ingredients)
      .where(
        and(
          isNull(ingredients.deletedAt),
          eq(ingredients.isActive, true),
          eq(ingredients.organizationId, organizationId)
        )
      )

    const ingredientMap = new Map(
      ingredientsList.map((i) => [i.ingredientName, i.id])
    )

    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 1

        try {
          const ingredientId = ingredientMap.get(row.재료)

          if (!ingredientId) {
            errors.push(`${rowNum}행: 재료 '${row.재료}'를 찾을 수 없습니다`)
            failedCount++
            continue
          }

          const validatedData = purchaseSchema.parse({
            transactionDate: row.날짜,
            ingredientId,
            supplierName: row.공급업체,
            quantity: row.수량,
            unitPrice: row.단가,
            notes: row.비고 && row.비고.trim() ? row.비고.trim() : null,
          })

          // 행별 savepoint: DB 에러가 나도 tx 전체가 abort되지 않는다
          await tx.transaction(async (sp) => {
            const [transaction] = await sp
              .insert(purchaseTransactions)
              .values({
                ...validatedData,
                storeId,
                createdBy: 'system',
              })
              .returning()

            if (transaction.storeId) {
              await syncPurchaseToInventory(sp, {
                storeId: transaction.storeId,
                ingredientId: transaction.ingredientId,
                quantity: transaction.quantity,
                purchaseId: transaction.id,
                transactionDate: transaction.transactionDate,
              })
            }
          })

          successCount++
        } catch (error) {
          failedCount++
          if (error instanceof z.ZodError) {
            errors.push(`${rowNum}행: ${error.errors[0].message}`)
          } else {
            errors.push(
              `${rowNum}행: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            )
          }
        }
      }
    })

    revalidatePath('/dashboard/purchases')
    revalidatePurchaseData(storeId)

    return {
      success: true,
      successCount,
      failedCount,
      errors: errors.slice(0, 20),
    }
  } catch (error) {
    logger.error('Failed to bulk create purchases:', errorToContext(error))
    return {
      success: false,
      successCount,
      failedCount,
      error:
        error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}

export async function getRecentPurchaseIngredients(): Promise<
  Array<{ id: string; ingredientName: string; unit: string }>
> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) return []

    const result = await db
      .select({
        id: ingredients.id,
        ingredientName: ingredients.ingredientName,
        unit: ingredients.unit,
        lastUsed: sql<Date>`MAX(${purchaseTransactions.createdAt})`,
      })
      .from(purchaseTransactions)
      .innerJoin(
        ingredients,
        eq(purchaseTransactions.ingredientId, ingredients.id)
      )
      .where(
        and(
          isNull(purchaseTransactions.deletedAt),
          isNull(ingredients.deletedAt),
          eq(ingredients.isActive, true),
          inArray(purchaseTransactions.storeId, authorizedStoreIds)
        )
      )
      .groupBy(ingredients.id, ingredients.ingredientName, ingredients.unit)
      .orderBy(desc(sql`MAX(${purchaseTransactions.createdAt})`))
      .limit(10)

    return result.map((r) => ({
      id: r.id,
      ingredientName: r.ingredientName,
      unit: r.unit,
    }))
  } catch (error) {
    logger.error(
      'Failed to fetch recent purchase ingredients:',
      errorToContext(error)
    )
    return []
  }
}

async function fetchPurchasesTotals(
  startDate: string,
  endDate: string,
  ingredientId: string,
  storeId: string,
  authorizedStoreIds: string[]
) {
  if (authorizedStoreIds.length === 0) {
    return { totalCount: 0, totalQuantity: 0, totalAmount: 0 }
  }

  const conditions = [isNull(purchaseTransactions.deletedAt)]
  conditions.push(inArray(purchaseTransactions.storeId, authorizedStoreIds))

  if (startDate !== 'all' && endDate !== 'all') {
    conditions.push(
      sql`${purchaseTransactions.transactionDate} BETWEEN ${startDate}::date AND ${endDate}::date`
    )
  }

  if (ingredientId !== 'all') {
    conditions.push(eq(purchaseTransactions.ingredientId, ingredientId))
  }

  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
    conditions.push(eq(purchaseTransactions.storeId, storeId))
  }

  const result = await db
    .select({
      totalCount: sql<number>`COUNT(*)`.mapWith(Number),
      totalQuantity: sql<string>`COALESCE(SUM(${purchaseTransactions.quantity}), 0)`,
      totalAmount: sql<string>`COALESCE(SUM(${purchaseTransactions.totalAmount}), 0)`,
    })
    .from(purchaseTransactions)
    .where(and(...conditions))

  return {
    totalCount: result[0]?.totalCount ?? 0,
    totalQuantity: Number(result[0]?.totalQuantity ?? 0),
    totalAmount: Number(result[0]?.totalAmount ?? 0),
  }
}

export async function getPurchasesTotals(
  startDate?: string,
  endDate?: string,
  ingredientId?: string,
  storeId?: string
) {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { totalCount: 0, totalQuantity: 0, totalAmount: 0 }
    }

    const normalizedStartDate = startDate ?? 'all'
    const normalizedEndDate = endDate ?? 'all'
    const normalizedIngredientId = ingredientId ?? 'all'
    const normalizedStoreId = storeId || 'all'

    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedPurchasesTotals = unstable_cache(
      () =>
        fetchPurchasesTotals(
          normalizedStartDate,
          normalizedEndDate,
          normalizedIngredientId,
          normalizedStoreId,
          authorizedStoreIds
        ),
      [
        'purchases:totals:v2',
        storeKey,
        normalizedStartDate,
        normalizedEndDate,
        normalizedIngredientId,
        normalizedStoreId,
      ],
      { tags: [cacheTags.purchases(normalizedStoreId)] }
    )

    return await getCachedPurchasesTotals()
  } catch (error) {
    logger.error('Failed to fetch purchases totals:', errorToContext(error))
    return { totalCount: 0, totalQuantity: 0, totalAmount: 0 }
  }
}

// 빠른 매입: 재료별 최근 매입 요약. 재료마다 매입 주기가 달라 "날짜 묶음 복사" 대신
// 재료 단위로 골라 등록하는 방식이 실제 매입 패턴에 맞는다.
export interface QuickPurchaseItem {
  ingredientId: string
  ingredientName: string
  /** 매입 수량 단위 (구매 단위, 없으면 사용 단위) */
  purchaseUnit: string | null
  lastDate: string
  lastQuantity: number
  lastUnitPrice: number
  supplierName: string
  /** 최근 180일 매입 횟수 (정렬용) */
  purchaseCount: number
}

export async function getQuickPurchaseItems(): Promise<{
  success: boolean
  data?: QuickPurchaseItem[]
  error?: string
}> {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) return { success: true, data: [] }

    const storeIn = sql.join(
      authorizedStoreIds.map((id) => sql`${id}::uuid`),
      sql`, `
    )
    const result = await db.execute(sql`
      SELECT DISTINCT ON (p.ingredient_id)
        p.ingredient_id, p.transaction_date, p.quantity, p.unit_price, p.supplier_name,
        i.ingredient_name, i.purchase_unit, i.unit,
        COUNT(*) OVER (PARTITION BY p.ingredient_id) AS purchase_count
      FROM purchase_transactions p
      JOIN ingredients i ON i.id = p.ingredient_id
        AND i.deleted_at IS NULL AND i.is_active = true
      WHERE p.deleted_at IS NULL
        AND p.transaction_date >= CURRENT_DATE - INTERVAL '180 days'
        AND (p.store_id IN (${storeIn}) OR p.store_id IS NULL)
      ORDER BY p.ingredient_id, p.transaction_date DESC, p.created_at DESC
    `)

    const items = (
      result.rows as Array<{
        ingredient_id: string
        transaction_date: string
        quantity: string
        unit_price: string
        supplier_name: string
        ingredient_name: string
        purchase_unit: string | null
        unit: string
        purchase_count: string
      }>
    ).map((r) => ({
      ingredientId: r.ingredient_id,
      ingredientName: r.ingredient_name,
      purchaseUnit: r.purchase_unit ?? r.unit ?? null,
      lastDate: String(r.transaction_date).slice(0, 10),
      lastQuantity: Number(r.quantity),
      lastUnitPrice: Number(r.unit_price),
      supplierName: r.supplier_name,
      purchaseCount: Number(r.purchase_count),
    }))

    items.sort(
      (a, b) =>
        b.purchaseCount - a.purchaseCount ||
        a.ingredientName.localeCompare(b.ingredientName, 'ko')
    )
    return { success: true, data: items.slice(0, 30) }
  } catch (error) {
    logger.error('Failed to fetch quick purchase items:', errorToContext(error))
    return { success: false, error: '자주 사는 재료 조회에 실패했습니다' }
  }
}
