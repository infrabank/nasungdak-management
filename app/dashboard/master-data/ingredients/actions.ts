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

interface CSVRow {
  재료명: string
  단위: string
  설명?: string
  활성?: string
}

export async function bulkCreateIngredients(rows: CSVRow[]) {
  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        // Parse isActive (default to true)
        let isActive = true
        if (row.활성 !== undefined && row.활성 !== '') {
          const activeStr = String(row.활성).toLowerCase().trim()
          isActive = activeStr === 'true' || activeStr === '1' || activeStr === 'yes'
        }

        // Validate data
        const validatedData = ingredientSchema.parse({
          ingredientName: row.재료명,
          unit: row.단위,
          description: row.설명 || '',
          isActive,
        })

        // Insert ingredient
        await db
          .insert(ingredients)
          .values({
            ...validatedData,
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

    revalidatePath('/dashboard/master-data/ingredients')

    return {
      success: true,
      successCount,
      failedCount,
      errors: errors.slice(0, 20), // Return first 20 errors
    }
  } catch (error) {
    console.error('Failed to bulk create ingredients:', error)
    return {
      success: false,
      successCount,
      failedCount,
      error: error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}
