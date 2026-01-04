'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { ingredients } from '@/lib/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const ingredientSchema = z.object({
  ingredientName: z.string().min(1, '재료명을 입력해주세요').max(100),
  unit: z.string().min(1, '단위를 입력해주세요').max(20),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
})

export async function createIngredient(formData: FormData) {
  try {
    const rawData = {
      ingredientName: formData.get('ingredientName'),
      unit: formData.get('unit'),
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = ingredientSchema.parse(rawData)

    const [ingredient] = await db
      .insert(ingredients)
      .values({
        ...validatedData,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/ingredients')

    return {
      success: true,
      data: ingredient,
    }
  } catch (error) {
    console.error('Failed to create ingredient:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: '재료 등록에 실패했습니다',
    }
  }
}

export async function updateIngredient(id: string, formData: FormData) {
  try {
    const rawData = {
      ingredientName: formData.get('ingredientName'),
      unit: formData.get('unit'),
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = ingredientSchema.parse(rawData)

    const [ingredient] = await db
      .update(ingredients)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(ingredients.id, id))
      .returning()

    revalidatePath('/dashboard/master-data/ingredients')

    return {
      success: true,
      data: ingredient,
    }
  } catch (error) {
    console.error('Failed to update ingredient:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: '재료 수정에 실패했습니다',
    }
  }
}

export async function deleteIngredient(id: string) {
  try {
    await db
      .update(ingredients)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(ingredients.id, id))

    revalidatePath('/dashboard/master-data/ingredients')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete ingredient:', error)
    return {
      success: false,
      error: '재료 삭제에 실패했습니다',
    }
  }
}

export async function getIngredients() {
  try {
    const items = await db
      .select()
      .from(ingredients)
      .where(isNull(ingredients.deletedAt))
      .orderBy(ingredients.ingredientName)

    return items
  } catch (error) {
    console.error('Failed to fetch ingredients:', error)
    return []
  }
}
