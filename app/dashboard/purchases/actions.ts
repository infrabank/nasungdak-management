'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { purchaseSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import {
  purchaseTransactions,
  menuCategories,
  ingredients,
  inventory,
  inventoryEvents,
} from '@/lib/db/schema'
import { eq, and, isNull, desc, sql, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import { getAuthorizedStoreIds, getOrganizationId } from '@/lib/auth-context'

async function syncPurchaseToInventory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  storeId: string,
  ingredientId: string,
  quantity: string,
  purchaseId: string,
  transactionDate: string
) {
  // 구매 단위 → 사용 단위 변환 (변환 계수 미설정 시 1:1)
  const ingredient = await tx.query.ingredients.findFirst({
    where: and(eq(ingredients.id, ingredientId), isNull(ingredients.deletedAt)),
    columns: {
      unit: true,
      conversionFactor: true,
    },
  })
  const factor = ingredient?.conversionFactor
    ? Number(ingredient.conversionFactor)
    : 1
  const convertedQuantity = String(Number(quantity) * factor)

  await tx.insert(inventoryEvents).values({
    storeId,
    ingredientId,
    eventType: 'purchase',
    quantityChange: convertedQuantity,
    reason: factor === 1 ? '매입 자동 반영' : `매입 자동 반영 (x${factor})`,
    eventDate: transactionDate,
    referenceId: purchaseId,
    createdBy: 'system',
  })

  const existingInventory = await tx.query.inventory.findFirst({
    where: and(
      eq(inventory.storeId, storeId),
      eq(inventory.ingredientId, ingredientId)
    ),
  })

  if (existingInventory) {
    await tx
      .update(inventory)
      .set({
        currentQuantity: sql`${inventory.currentQuantity} + ${convertedQuantity}`,
        lastUpdated: new Date(),
      })
      .where(eq(inventory.id, existingInventory.id))
    return
  }

  await tx.insert(inventory).values({
    storeId,
    ingredientId,
    currentQuantity: convertedQuantity,
    unit: ingredient?.unit ?? null,
    lastUpdated: new Date(),
  })
}

export async function createPurchase(formData: FormData) {
  try {
    // Get storeId from form or use user's first authorized store
    let storeId = formData.get('storeId') as string | null
    if (!storeId) {
      const authorizedStoreIds = await getAuthorizedStoreIds()
      storeId = authorizedStoreIds[0] || null
    }

    const notes = formData.get('notes')
    const menuIdRaw = formData.get('menuId')
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      menuId: menuIdRaw && String(menuIdRaw).trim() ? menuIdRaw : null,
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
          isValid: true,
          createdBy: 'system',
        })
        .returning()

      if (createdPurchase.storeId) {
        await syncPurchaseToInventory(
          tx,
          createdPurchase.storeId,
          createdPurchase.ingredientId,
          createdPurchase.quantity,
          createdPurchase.id,
          createdPurchase.transactionDate
        )
      }

      return createdPurchase
    })

    revalidatePath('/dashboard/purchases')
    revalidateTag('purchases:all')
    if (transaction.storeId) {
      revalidateTag(`purchases:${transaction.storeId}`)
      revalidateTag(`inventory:${transaction.storeId}`)
    }
    revalidateTag('inventory:all')
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: true,
      data: {
        id: transaction.id,
        totalAmount: Number(transaction.totalAmount),
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
    const notes = formData.get('notes')
    const menuIdRaw = formData.get('menuId')
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      menuId: menuIdRaw && String(menuIdRaw).trim() ? menuIdRaw : null,
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

    const [transaction] = await db
      .update(purchaseTransactions)
      .set({
        ...validatedData,
        isValid: true,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(purchaseTransactions.id, id))
      .returning()

    revalidatePath('/dashboard/purchases')
    revalidateTag('purchases:all')
    if (transaction.storeId) {
      revalidateTag(`purchases:${transaction.storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

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
    // Fetch storeId before soft delete for cache invalidation
    const existing = await db.query.purchaseTransactions.findFirst({
      where: eq(purchaseTransactions.id, id),
      columns: { storeId: true },
    })

    await db
      .update(purchaseTransactions)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(purchaseTransactions.id, id))

    revalidatePath('/dashboard/purchases')
    revalidateTag('purchases:all')
    if (existing?.storeId) {
      revalidateTag(`purchases:${existing.storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

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
  menuId: string,
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

  if (menuId !== 'all') {
    conditions.push(eq(purchaseTransactions.menuId, menuId))
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
      menuId: purchaseTransactions.menuId,
      menuName: menuCategories.menuName,
      ingredientId: purchaseTransactions.ingredientId,
      ingredientName: ingredients.ingredientName,
      supplierName: purchaseTransactions.supplierName,
      quantity: purchaseTransactions.quantity,
      unitPrice: purchaseTransactions.unitPrice,
      totalAmount: purchaseTransactions.totalAmount,
      isValid: purchaseTransactions.isValid,
      notes: purchaseTransactions.notes,
    })
    .from(purchaseTransactions)
    .leftJoin(
      menuCategories,
      eq(purchaseTransactions.menuId, menuCategories.id)
    )
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
  menuId?: string,
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
    const normalizedMenuId = menuId ?? 'all'
    const normalizedIngredientId = ingredientId ?? 'all'
    const normalizedStoreId = storeId ?? 'all'
    const normalizedPage = Math.max(1, page)

    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedPurchases = unstable_cache(
      () =>
        fetchPurchases(
          normalizedStartDate,
          normalizedEndDate,
          normalizedMenuId,
          normalizedIngredientId,
          normalizedStoreId,
          normalizedPage,
          authorizedStoreIds
        ),
      [
        'purchases:list:v4',
        storeKey,
        normalizedStartDate,
        normalizedEndDate,
        normalizedMenuId,
        normalizedIngredientId,
        normalizedStoreId,
        String(normalizedPage),
      ],
      { tags: [`purchases:${normalizedStoreId}`] }
    )

    return await getCachedPurchases()
  } catch (error) {
    logger.error('Failed to fetch purchases:', errorToContext(error))
    return { items: [], hasMore: false, page: 1 }
  }
}

async function fetchMenusForFilter() {
  const menus = await db
    .select({
      id: menuCategories.id,
      menuName: menuCategories.menuName,
    })
    .from(menuCategories)
    .where(
      and(isNull(menuCategories.deletedAt), eq(menuCategories.isActive, true))
    )
    .orderBy(menuCategories.menuName)

  return menus
}

export async function getMenusForFilter() {
  try {
    const getCachedMenusForFilter = unstable_cache(
      fetchMenusForFilter,
      ['menus:active'],
      { tags: ['menus:active'] }
    )

    return await getCachedMenusForFilter()
  } catch (error) {
    logger.error('Failed to fetch menus:', errorToContext(error))
    return []
  }
}

async function fetchIngredientsForFilter() {
  const ingredientsList = await db
    .select({
      id: ingredients.id,
      ingredientName: ingredients.ingredientName,
    })
    .from(ingredients)
    .where(and(isNull(ingredients.deletedAt), eq(ingredients.isActive, true)))
    .orderBy(ingredients.ingredientName)

  return ingredientsList
}

export async function getIngredientsForFilter() {
  try {
    const getCachedIngredientsForFilter = unstable_cache(
      fetchIngredientsForFilter,
      ['ingredients:active'],
      { tags: ['ingredients:active'] }
    )

    return await getCachedIngredientsForFilter()
  } catch (error) {
    logger.error('Failed to fetch ingredients:', errorToContext(error))
    return []
  }
}

export async function getSupplierSuggestions(): Promise<string[]> {
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT supplier_name
      FROM purchase_transactions
      WHERE deleted_at IS NULL AND supplier_name IS NOT NULL
      UNION
      SELECT supplier_name
      FROM suppliers
      WHERE deleted_at IS NULL AND supplier_name IS NOT NULL
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
  메뉴?: string
  재료: string
  공급업체: string
  수량: string
  단가: string
  비고?: string
}

export interface PurchaseEntry {
  menuId?: string | null
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

  try {
    let storeId = formStoreId || null
    if (!storeId) {
      const authorizedStoreIds = await getAuthorizedStoreIds()
      storeId = authorizedStoreIds[0] || null
    }

    const organizationId = await getOrganizationId()

    await db.transaction(async (tx) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const rowNum = i + 1

        try {
          let resolvedIngredientId = entry.ingredientId

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
              const existing = await tx.query.ingredients.findFirst({
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
              const [newIngredient] = await tx
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
            }
          }

          if (!resolvedIngredientId) {
            throw new Error('재료를 선택하거나 입력해주세요')
          }

          const rawData = {
            transactionDate,
            menuId: entry.menuId || null,
            ingredientId: resolvedIngredientId,
            supplierName,
            quantity: entry.quantity,
            unitPrice: entry.unitPrice,
            notes: entry.notes?.trim() || null,
          }

          const validatedData = purchaseSchema.parse(rawData)

          const [transaction] = await tx
            .insert(purchaseTransactions)
            .values({
              ...validatedData,
              storeId,
              isValid: true,
              createdBy: 'system',
            })
            .returning()

          if (transaction.storeId) {
            await syncPurchaseToInventory(
              tx,
              transaction.storeId,
              transaction.ingredientId,
              transaction.quantity,
              transaction.id,
              transaction.transactionDate
            )
          }

          successCount++
          results.push({
            index: i,
            id: transaction.id,
            totalAmount: Number(transaction.totalAmount),
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
    revalidateTag('purchases:all')
    if (storeId) {
      revalidateTag(`purchases:${storeId}`)
      revalidateTag(`inventory:${storeId}`)
    }
    revalidateTag('inventory:all')
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      results,
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
    let storeId = formStoreId || null
    if (!storeId) {
      const authorizedStoreIds = await getAuthorizedStoreIds()
      storeId = authorizedStoreIds[0] || null
    }

    // Fetch menus and ingredients for name-to-ID mapping
    const menus = await db
      .select({
        id: menuCategories.id,
        menuName: menuCategories.menuName,
      })
      .from(menuCategories)
      .where(
        and(isNull(menuCategories.deletedAt), eq(menuCategories.isActive, true))
      )

    const ingredientsList = await db
      .select({
        id: ingredients.id,
        ingredientName: ingredients.ingredientName,
      })
      .from(ingredients)
      .where(and(isNull(ingredients.deletedAt), eq(ingredients.isActive, true)))

    const menuMap = new Map(menus.map((m) => [m.menuName, m.id]))
    const ingredientMap = new Map(
      ingredientsList.map((i) => [i.ingredientName, i.id])
    )

    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 1

        try {
          // Menu is now optional in CSV
          const menuId = row.메뉴 ? menuMap.get(row.메뉴) : null
          const ingredientId = ingredientMap.get(row.재료)

          if (row.메뉴 && !menuId) {
            errors.push(`${rowNum}행: 메뉴 '${row.메뉴}'를 찾을 수 없습니다`)
            failedCount++
            continue
          }

          if (!ingredientId) {
            errors.push(`${rowNum}행: 재료 '${row.재료}'를 찾을 수 없습니다`)
            failedCount++
            continue
          }

          const validatedData = purchaseSchema.parse({
            transactionDate: row.날짜,
            menuId: menuId || null,
            ingredientId,
            supplierName: row.공급업체,
            quantity: row.수량,
            unitPrice: row.단가,
            notes: row.비고 && row.비고.trim() ? row.비고.trim() : null,
          })

          await tx.insert(purchaseTransactions).values({
            ...validatedData,
            storeId,
            isValid: true,
            createdBy: 'system',
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
    revalidateTag('purchases:all')
    if (storeId) {
      revalidateTag(`purchases:${storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

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
  menuId: string,
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

  if (menuId !== 'all') {
    conditions.push(eq(purchaseTransactions.menuId, menuId))
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
  menuId?: string,
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
    const normalizedMenuId = menuId ?? 'all'
    const normalizedIngredientId = ingredientId ?? 'all'
    const normalizedStoreId = storeId ?? 'all'

    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedPurchasesTotals = unstable_cache(
      () =>
        fetchPurchasesTotals(
          normalizedStartDate,
          normalizedEndDate,
          normalizedMenuId,
          normalizedIngredientId,
          normalizedStoreId,
          authorizedStoreIds
        ),
      [
        'purchases:totals',
        storeKey,
        normalizedStartDate,
        normalizedEndDate,
        normalizedMenuId,
        normalizedIngredientId,
        normalizedStoreId,
      ],
      { tags: [`purchases:${normalizedStoreId}`] }
    )

    return await getCachedPurchasesTotals()
  } catch (error) {
    logger.error('Failed to fetch purchases totals:', errorToContext(error))
    return { totalCount: 0, totalQuantity: 0, totalAmount: 0 }
  }
}

// 가장 최근 매입일과 그날의 매입 항목 조회 (지난 매입 복사용)
async function fetchLastPurchaseDay() {
  const authorizedStoreIds = await getAuthorizedStoreIds()
  if (authorizedStoreIds.length === 0) return null

  const storeCondition = or(
    inArray(purchaseTransactions.storeId, authorizedStoreIds),
    isNull(purchaseTransactions.storeId)
  )

  const latest = await db
    .select({ d: purchaseTransactions.transactionDate })
    .from(purchaseTransactions)
    .where(and(isNull(purchaseTransactions.deletedAt), storeCondition))
    .orderBy(desc(purchaseTransactions.transactionDate))
    .limit(1)

  if (latest.length === 0) return null
  const lastDate = latest[0].d

  const items = await db
    .select({
      ingredientId: purchaseTransactions.ingredientId,
      ingredientName: ingredients.ingredientName,
      supplierName: purchaseTransactions.supplierName,
      quantity: purchaseTransactions.quantity,
      unitPrice: purchaseTransactions.unitPrice,
      totalAmount: purchaseTransactions.totalAmount,
      storeId: purchaseTransactions.storeId,
    })
    .from(purchaseTransactions)
    .leftJoin(
      ingredients,
      eq(purchaseTransactions.ingredientId, ingredients.id)
    )
    .where(
      and(
        eq(purchaseTransactions.transactionDate, lastDate),
        isNull(purchaseTransactions.deletedAt),
        storeCondition
      )
    )

  return { date: lastDate, items }
}

export interface LastPurchaseDaySummary {
  date: string
  totalAmount: number
  items: Array<{
    ingredientName: string
    supplierName: string
    quantity: number
    unitPrice: number
    totalAmount: number
  }>
}

export async function getLastPurchaseDaySummary(): Promise<{
  success: boolean
  data?: LastPurchaseDaySummary | null
  error?: string
}> {
  try {
    const result = await fetchLastPurchaseDay()
    if (!result) return { success: true, data: null }

    return {
      success: true,
      data: {
        date: result.date,
        totalAmount: result.items.reduce(
          (sum, item) => sum + Number(item.totalAmount ?? 0),
          0
        ),
        items: result.items.map((item) => ({
          ingredientName: item.ingredientName ?? '-',
          supplierName: item.supplierName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalAmount: Number(item.totalAmount ?? 0),
        })),
      },
    }
  } catch (error) {
    logger.error(
      'Failed to fetch last purchase day summary:',
      errorToContext(error)
    )
    return { success: false, error: '최근 매입 조회에 실패했습니다' }
  }
}

export async function copyLastPurchasesToToday() {
  try {
    const result = await fetchLastPurchaseDay()
    if (!result || result.items.length === 0) {
      return { success: false, error: '복사할 매입 내역이 없습니다' }
    }

    const today = new Date().toISOString().split('T')[0]
    if (result.date === today) {
      return {
        success: false,
        error: '가장 최근 매입이 이미 오늘 날짜입니다',
      }
    }

    let totalAmount = 0
    await db.transaction(async (tx) => {
      for (const item of result.items) {
        const [transaction] = await tx
          .insert(purchaseTransactions)
          .values({
            transactionDate: today,
            ingredientId: item.ingredientId,
            supplierName: item.supplierName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            storeId: item.storeId,
            isValid: true,
            notes: `${result.date} 매입 복사`,
            createdBy: 'system',
          })
          .returning()

        totalAmount += Number(transaction.totalAmount ?? 0)

        if (transaction.storeId) {
          await syncPurchaseToInventory(
            tx,
            transaction.storeId,
            transaction.ingredientId,
            transaction.quantity,
            transaction.id,
            transaction.transactionDate
          )
        }
      }
    })

    revalidatePath('/dashboard/purchases')
    revalidateTag('purchases:all')
    revalidateTag('inventory:all')
    revalidateTag('dashboard:stats')

    return {
      success: true,
      count: result.items.length,
      totalAmount,
      sourceDate: result.date,
    }
  } catch (error) {
    logger.error('Failed to copy last purchases:', errorToContext(error))
    return { success: false, error: '매입 복사에 실패했습니다' }
  }
}
