'use server'

import { revalidatePath } from 'next/cache'
import { purchaseSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { purchaseTransactions, menuCategories, ingredients, menuIngredients } from '@/lib/db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

export async function createPurchase(formData: FormData) {
  try {
    const notes = formData.get('notes')
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      menuId: formData.get('menuId'),
      ingredientId: formData.get('ingredientId'),
      supplierName: formData.get('supplierName'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      notes: notes && typeof notes === 'string' && notes.trim() ? notes.trim() : null,
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

    const [transaction] = await db
      .insert(purchaseTransactions)
      .values({
        ...validatedData,
        isValid,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/purchases')

    return {
      success: true,
      data: {
        id: transaction.id,
        totalAmount: Number(transaction.totalAmount),
        isValid: transaction.isValid,
      },
    }
  } catch (error) {
    console.error('Failed to create purchase:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '매입 등록에 실패했습니다',
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
      notes: notes && typeof notes === 'string' && notes.trim() ? notes.trim() : null,
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

    return {
      success: true,
      data: transaction,
    }
  } catch (error) {
    console.error('Failed to update purchase:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '매입 수정에 실패했습니다',
    }
  }
}

export async function deletePurchase(id: string) {
  try {
    await db
      .update(purchaseTransactions)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(purchaseTransactions.id, id))

    revalidatePath('/dashboard/purchases')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete purchase:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '매입 삭제에 실패했습니다',
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

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to toggle validation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '검증 상태 변경에 실패했습니다',
    }
  }
}

export async function getPurchases(startDate?: string, endDate?: string) {
  try {
    const purchases = await db
      .select({
        id: purchaseTransactions.id,
        transactionDate: purchaseTransactions.transactionDate,
        menuName: menuCategories.menuName,
        ingredientName: ingredients.ingredientName,
        supplierName: purchaseTransactions.supplierName,
        quantity: purchaseTransactions.quantity,
        unitPrice: purchaseTransactions.unitPrice,
        totalAmount: purchaseTransactions.totalAmount,
        isValid: purchaseTransactions.isValid,
        notes: purchaseTransactions.notes,
      })
      .from(purchaseTransactions)
      .leftJoin(menuCategories, eq(purchaseTransactions.menuId, menuCategories.id))
      .leftJoin(ingredients, eq(purchaseTransactions.ingredientId, ingredients.id))
      .where(
        startDate && endDate
          ? sql`${purchaseTransactions.deletedAt} IS NULL AND ${purchaseTransactions.transactionDate} BETWEEN ${startDate}::date AND ${endDate}::date`
          : isNull(purchaseTransactions.deletedAt)
      )
      .orderBy(desc(purchaseTransactions.transactionDate))
      .limit(1000)

    return purchases
  } catch (error) {
    console.error('Failed to fetch purchases:', error)
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

export async function bulkCreatePurchases(rows: CSVRow[]) {
  'use server'

  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    // Fetch all menus and ingredients for name-to-ID mapping
    const menus = await db
      .select({
        id: menuCategories.id,
        menuName: menuCategories.menuName,
      })
      .from(menuCategories)
      .where(and(
        isNull(menuCategories.deletedAt),
        eq(menuCategories.isActive, true)
      ))

    const ingredientsList = await db
      .select({
        id: ingredients.id,
        ingredientName: ingredients.ingredientName,
      })
      .from(ingredients)
      .where(and(
        isNull(ingredients.deletedAt),
        eq(ingredients.isActive, true)
      ))

    // Create lookup maps
    const menuMap = new Map(menus.map(m => [m.menuName, m.id]))
    const ingredientMap = new Map(ingredientsList.map(i => [i.ingredientName, i.id]))

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

        // Check if menu-ingredient mapping exists
        const menuIngredient = await db.query.menuIngredients.findFirst({
          where: and(
            eq(menuIngredients.menuId, validatedData.menuId),
            eq(menuIngredients.ingredientId, validatedData.ingredientId),
            isNull(menuIngredients.deletedAt)
          ),
        })

        const isValid = !!menuIngredient

        // Insert purchase transaction
        await db
          .insert(purchaseTransactions)
          .values({
            ...validatedData,
            isValid,
            createdBy: 'system',
          })

        successCount++
      } catch (error) {
        failedCount++
        if (error instanceof z.ZodError) {
          errors.push(`${rowNum}행: ${error.errors[0].message}`)
        } else {
          errors.push(`${rowNum}행: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        }
      }
    }

    revalidatePath('/dashboard/purchases')

    return {
      success: true,
      successCount,
      failedCount,
      errors: errors.slice(0, 20), // Return first 20 errors
    }
  } catch (error) {
    console.error('Failed to bulk create purchases:', error)
    return {
      success: false,
      successCount,
      failedCount,
      error: error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}
