'use server'

import { revalidatePath } from 'next/cache'
import { purchaseSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { purchaseTransactions, menuCategories, ingredients, menuIngredients } from '@/lib/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { z } from 'zod'

export async function createPurchase(formData: FormData) {
  try {
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      menuId: formData.get('menuId'),
      ingredientId: formData.get('ingredientId'),
      supplierName: formData.get('supplierName'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      notes: formData.get('notes'),
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
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      menuId: formData.get('menuId'),
      ingredientId: formData.get('ingredientId'),
      supplierName: formData.get('supplierName'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      notes: formData.get('notes'),
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

export async function getPurchases() {
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
      .where(isNull(purchaseTransactions.deletedAt))
      .orderBy(desc(purchaseTransactions.transactionDate))
      .limit(100)

    return purchases
  } catch (error) {
    console.error('Failed to fetch purchases:', error)
    return []
  }
}
