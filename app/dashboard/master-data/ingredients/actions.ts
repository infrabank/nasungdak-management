'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { ingredients } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { z } from 'zod'
import { getOrganizationId, requireOrganizationId } from '@/lib/auth-context'

const ingredientSchema = z.object({
  ingredientName: z.string().min(1, '재료명을 입력해주세요').max(100),
  unit: z.string().min(1, '단위를 입력해주세요').max(20),
  unitCost: z.coerce
    .string()
    .optional()
    .transform((val, ctx) => {
      if (!val || val === '') return undefined
      const num = Number(val)
      if (isNaN(num) || num < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '단가는 0 이상이어야 합니다',
        })
        return z.NEVER
      }
      return val
    }),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
})

export async function createIngredient(formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const rawData = {
      ingredientName: formData.get('ingredientName'),
      unit: formData.get('unit'),
      unitCost: formData.get('unitCost') || undefined,
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = ingredientSchema.parse(rawData)

    const [ingredient] = await db
      .insert(ingredients)
      .values({
        ingredientName: validatedData.ingredientName,
        unit: validatedData.unit,
        unitCost: validatedData.unitCost,
        description: validatedData.description,
        organizationId,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/ingredients')
    revalidateTag('ingredients:active')

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
    const organizationId = await requireOrganizationId()
    const rawData = {
      ingredientName: formData.get('ingredientName'),
      unit: formData.get('unit'),
      unitCost: formData.get('unitCost') || undefined,
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = ingredientSchema.parse(rawData)

    const [ingredient] = await db
      .update(ingredients)
      .set({
        ingredientName: validatedData.ingredientName,
        unit: validatedData.unit,
        unitCost: validatedData.unitCost,
        description: validatedData.description,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(
        and(
          eq(ingredients.id, id),
          eq(ingredients.organizationId, organizationId)
        )
      )
      .returning()

    revalidatePath('/dashboard/master-data/ingredients')
    revalidateTag('ingredients:active')

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
    const organizationId = await requireOrganizationId()
    await db
      .update(ingredients)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(
        and(
          eq(ingredients.id, id),
          eq(ingredients.organizationId, organizationId)
        )
      )

    revalidatePath('/dashboard/master-data/ingredients')
    revalidateTag('ingredients:active')

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
    const organizationId = await getOrganizationId()
    const items = await db
      .select()
      .from(ingredients)
      .where(
        and(
          isNull(ingredients.deletedAt),
          organizationId
            ? eq(ingredients.organizationId, organizationId)
            : undefined
        )
      )
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
  단가?: string
  설명?: string
  활성?: string
}

export async function bulkCreateIngredients(rows: CSVRow[]) {
  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    const organizationId = await requireOrganizationId()
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        // Parse isActive (default to true)
        let isActive = true
        if (row.활성 !== undefined && row.활성 !== '') {
          const activeStr = String(row.활성).toLowerCase().trim()
          isActive =
            activeStr === 'true' || activeStr === '1' || activeStr === 'yes'
        }

        // Validate data
        const validatedData = ingredientSchema.parse({
          ingredientName: row.재료명,
          unit: row.단위,
          unitCost: row.단가 || undefined,
          description: row.설명 || '',
          isActive,
        })

        // Insert ingredient
        await db.insert(ingredients).values({
          ingredientName: validatedData.ingredientName,
          unit: validatedData.unit,
          unitCost: validatedData.unitCost,
          description: validatedData.description,
          organizationId,
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

    revalidatePath('/dashboard/master-data/ingredients')
    revalidateTag('ingredients:active')

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
      error:
        error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}
