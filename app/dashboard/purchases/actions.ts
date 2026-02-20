'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { purchaseSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import {
  purchaseTransactions,
  menuCategories,
  ingredients,
  menuIngredients,
  inventory,
  inventoryEvents,
} from '@/lib/db/schema'
import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

async function syncPurchaseToInventory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  storeId: string,
  ingredientId: string,
  quantity: string,
  purchaseId: string,
  transactionDate: string
) {
  await tx.insert(inventoryEvents).values({
    storeId,
    ingredientId,
    eventType: 'purchase',
    quantityChange: quantity,
    reason: '매입 자동 반영',
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
        currentQuantity: sql`${inventory.currentQuantity} + ${quantity}`,
        lastUpdated: new Date(),
      })
      .where(eq(inventory.id, existingInventory.id))
    return
  }

  const ingredient = await tx.query.ingredients.findFirst({
    where: and(eq(ingredients.id, ingredientId), isNull(ingredients.deletedAt)),
    columns: {
      unit: true,
    },
  })

  await tx.insert(inventory).values({
    storeId,
    ingredientId,
    currentQuantity: quantity,
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
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      menuId: formData.get('menuId'),
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

    // Check if menu-ingredient mapping exists for auto-validation
    const menuIngredient = await db.query.menuIngredients.findFirst({
      where: and(
        eq(menuIngredients.menuId, validatedData.menuId),
        eq(menuIngredients.ingredientId, validatedData.ingredientId),
        isNull(menuIngredients.deletedAt)
      ),
    })

    const isValid = !!menuIngredient

    const transaction = await db.transaction(async (tx) => {
      const [createdPurchase] = await tx
        .insert(purchaseTransactions)
        .values({
          ...validatedData,
          storeId,
          isValid,
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
        isValid: transaction.isValid,
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
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      menuId: formData.get('menuId'),
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

    // Re-check validation
    const menuIngredient = await db.query.menuIngredients.findFirst({
      where: and(
        eq(menuIngredients.menuId, validatedData.menuId),
        eq(menuIngredients.ingredientId, validatedData.ingredientId),
        isNull(menuIngredients.deletedAt)
      ),
    })

    const isValid = !!menuIngredient

    const [transaction] = await db
      .update(purchaseTransactions)
      .set({
        ...validatedData,
        isValid,
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

export async function togglePurchaseValidation(id: string) {
  try {
    const purchase = await db.query.purchaseTransactions.findFirst({
      where: eq(purchaseTransactions.id, id),
    })

    if (!purchase) {
      return {
        success: false,
        error: '매입 내역을 찾을 수 없습니다',
      }
    }

    await db
      .update(purchaseTransactions)
      .set({
        isValid: !purchase.isValid,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(purchaseTransactions.id, id))

    revalidatePath('/dashboard/purchases')
    revalidateTag('purchases:all')
    if (purchase.storeId) {
      revalidateTag(`purchases:${purchase.storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to toggle validation:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '검증 상태 변경에 실패했습니다',
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
  // 권한이 있는 매장이 없으면 빈 결과 반환
  if (authorizedStoreIds.length === 0) {
    return { items: [], hasMore: false, page: 1 }
  }

  // Build WHERE conditions
  const conditions = [isNull(purchaseTransactions.deletedAt)]

  // 항상 권한 있는 매장으로 필터링
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

  // 특정 매장 필터 (권한 체크는 이미 위에서 함)
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
    .limit(PURCHASES_PAGE_SIZE + 1) // Fetch one extra to check if there are more
    .offset(offset)

  // Determine if there are more pages
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
    // 사용자 권한 확인
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

    // 캐시 키에 사용자의 권한 정보 포함
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
        'purchases:list:v3', // Cache version bump
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

interface CSVRow {
  날짜: string
  메뉴: string
  재료: string
  공급업체: string
  수량: string
  단가: string
  비고?: string
}

export interface PurchaseEntry {
  menuId: string
  ingredientId: string
  quantity: string
  unitPrice: string
  notes?: string | null
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
    isValid: boolean
  }> = []

  try {
    // Get storeId from parameter or use user's first authorized store
    let storeId = formStoreId || null
    if (!storeId) {
      const authorizedStoreIds = await getAuthorizedStoreIds()
      storeId = authorizedStoreIds[0] || null
    }

    // Pre-fetch all menu-ingredient mappings - SINGLE QUERY (avoids N+1)
    const allMenuIngredients = await db
      .select({
        menuId: menuIngredients.menuId,
        ingredientId: menuIngredients.ingredientId,
      })
      .from(menuIngredients)
      .where(isNull(menuIngredients.deletedAt))

    // Create composite key map for O(1) lookup
    const menuIngredientMap = new Set(
      allMenuIngredients.map((mi) => `${mi.menuId}:${mi.ingredientId}`)
    )

    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const rowNum = i + 1

        try {
          const rawData = {
            transactionDate,
            menuId: entry.menuId,
            ingredientId: entry.ingredientId,
            supplierName,
            quantity: entry.quantity,
            unitPrice: entry.unitPrice,
            notes: entry.notes?.trim() || null,
          }

          const validatedData = purchaseSchema.parse(rawData)

          // Check if menu-ingredient mapping exists using pre-fetched Set - O(1)
          const isValid = menuIngredientMap.has(
            `${validatedData.menuId}:${validatedData.ingredientId}`
          )

          const [transaction] = await tx
            .insert(purchaseTransactions)
            .values({
              ...validatedData,
              storeId,
              isValid,
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
            isValid: transaction.isValid,
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
    // Get storeId from parameter or use user's first authorized store
    let storeId = formStoreId || null
    if (!storeId) {
      const authorizedStoreIds = await getAuthorizedStoreIds()
      storeId = authorizedStoreIds[0] || null
    }

    // Fetch all menus and ingredients for name-to-ID mapping
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

    // Create lookup maps
    const menuMap = new Map(menus.map((m) => [m.menuName, m.id]))
    const ingredientMap = new Map(
      ingredientsList.map((i) => [i.ingredientName, i.id])
    )

    // Pre-fetch all menu-ingredient mappings - SINGLE QUERY (avoids N+1)
    const allMenuIngredients = await db
      .select({
        menuId: menuIngredients.menuId,
        ingredientId: menuIngredients.ingredientId,
      })
      .from(menuIngredients)
      .where(isNull(menuIngredients.deletedAt))

    // Create composite key set for O(1) lookup
    const menuIngredientSet = new Set(
      allMenuIngredients.map((mi) => `${mi.menuId}:${mi.ingredientId}`)
    )

    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 1

        try {
          // Find menu and ingredient IDs
          const menuId = menuMap.get(row.메뉴)
          const ingredientId = ingredientMap.get(row.재료)

          if (!menuId) {
            errors.push(`${rowNum}행: 메뉴 '${row.메뉴}'를 찾을 수 없습니다`)
            failedCount++
            continue
          }

          if (!ingredientId) {
            errors.push(`${rowNum}행: 재료 '${row.재료}'를 찾을 수 없습니다`)
            failedCount++
            continue
          }

          // Validate data
          const validatedData = purchaseSchema.parse({
            transactionDate: row.날짜,
            menuId,
            ingredientId,
            supplierName: row.공급업체,
            quantity: row.수량,
            unitPrice: row.단가,
            notes: row.비고 && row.비고.trim() ? row.비고.trim() : null,
          })

          // Check if menu-ingredient mapping exists using pre-fetched Set - O(1)
          const isValid = menuIngredientSet.has(
            `${validatedData.menuId}:${validatedData.ingredientId}`
          )

          // Insert purchase transaction using transaction context
          await tx.insert(purchaseTransactions).values({
            ...validatedData,
            storeId,
            isValid,
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
      errors: errors.slice(0, 20), // Return first 20 errors
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

async function fetchPurchasesTotals(
  startDate: string,
  endDate: string,
  menuId: string,
  ingredientId: string,
  storeId: string,
  authorizedStoreIds: string[]
) {
  // 권한이 있는 매장이 없으면 빈 결과 반환
  if (authorizedStoreIds.length === 0) {
    return { totalCount: 0, totalQuantity: 0, totalAmount: 0 }
  }

  const conditions = [isNull(purchaseTransactions.deletedAt)]

  // 항상 권한 있는 매장으로 필터링
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
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { totalCount: 0, totalQuantity: 0, totalAmount: 0 }
    }

    const normalizedStartDate = startDate ?? 'all'
    const normalizedEndDate = endDate ?? 'all'
    const normalizedMenuId = menuId ?? 'all'
    const normalizedIngredientId = ingredientId ?? 'all'
    const normalizedStoreId = storeId ?? 'all'

    // 캐시 키에 사용자의 권한 정보 포함
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
