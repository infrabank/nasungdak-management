'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { ingredients, purchaseTransactions, stores } from '@/lib/db/schema'
import { eq, isNull, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import {
  getOrganizationId,
  requireOrganizationId,
  assertPermission,
} from '@/lib/auth-context'
import { cacheTags, revalidateIngredientData } from '@/lib/cache-tags'

function revalidateIngredientCaches(organizationId: string) {
  revalidatePath('/dashboard/master-data/ingredients')
  revalidatePath('/dashboard/master-data/sku-recipes')
  revalidateIngredientData(organizationId)
}

const ingredientSchema = z.object({
  ingredientName: z.string().min(1, '재료명을 입력해주세요').max(100),
  unit: z.string().min(1, '단위를 입력해주세요').max(20),
  barcode: z
    .string()
    .max(50)
    .optional()
    .transform((val) => val?.trim() || undefined),
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
  managementLevel: z.enum(['core', 'bag', 'simple', 'expense']).default('core'),
  purchaseUnit: z
    .string()
    .max(20)
    .optional()
    .transform((val) => val?.trim() || undefined),
  conversionFactor: z.coerce
    .string()
    .optional()
    .transform((val, ctx) => {
      if (!val || val === '') return undefined
      const num = Number(val)
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '변환 계수는 0보다 커야 합니다',
        })
        return z.NEVER
      }
      return val
    }),
}).superRefine((data, ctx) => {
  // 구매 단위가 사용 단위와 다르면 변환 계수 필수 (미설정 시 구매량이 그대로 재고에 반영되는 버그 방지)
  if (
    data.purchaseUnit &&
    data.purchaseUnit.trim().toLowerCase() !== data.unit.trim().toLowerCase() &&
    !data.conversionFactor
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['conversionFactor'],
      message: '구매 단위가 사용 단위와 다르면 변환 계수를 입력해주세요',
    })
  }
})

export async function createIngredient(formData: FormData) {
  try {
    await assertPermission('master-data', 'write')
    const organizationId = await requireOrganizationId()
    const rawData = {
      ingredientName: formData.get('ingredientName'),
      unit: formData.get('unit'),
      barcode: formData.get('barcode') || undefined,
      unitCost: formData.get('unitCost') || undefined,
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
      managementLevel: formData.get('managementLevel') || 'core',
      purchaseUnit: formData.get('purchaseUnit') || undefined,
      conversionFactor: formData.get('conversionFactor') || undefined,
    }

    const validatedData = ingredientSchema.parse(rawData)

    const [ingredient] = await db
      .insert(ingredients)
      .values({
        ingredientName: validatedData.ingredientName,
        unit: validatedData.unit,
        barcode: validatedData.barcode ?? null,
        unitCost: validatedData.unitCost,
        description: validatedData.description,
        managementLevel: validatedData.managementLevel,
        purchaseUnit: validatedData.purchaseUnit ?? null,
        conversionFactor: validatedData.conversionFactor ?? null,
        organizationId,
        createdBy: 'system',
      })
      .returning()

    revalidateIngredientCaches(organizationId)

    return {
      success: true,
      data: ingredient,
    }
  } catch (error) {
    logger.error('Failed to create ingredient:', errorToContext(error))

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
    await assertPermission('master-data', 'write')
    const organizationId = await requireOrganizationId()
    const rawData = {
      ingredientName: formData.get('ingredientName'),
      unit: formData.get('unit'),
      barcode: formData.get('barcode') || undefined,
      unitCost: formData.get('unitCost') || undefined,
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
      managementLevel: formData.get('managementLevel') || 'core',
      purchaseUnit: formData.get('purchaseUnit') || undefined,
      conversionFactor: formData.get('conversionFactor') || undefined,
    }

    const validatedData = ingredientSchema.parse(rawData)

    const [ingredient] = await db
      .update(ingredients)
      .set({
        ingredientName: validatedData.ingredientName,
        unit: validatedData.unit,
        barcode: validatedData.barcode ?? null,
        unitCost: validatedData.unitCost,
        description: validatedData.description,
        isActive: validatedData.isActive,
        managementLevel: validatedData.managementLevel,
        purchaseUnit: validatedData.purchaseUnit ?? null,
        conversionFactor: validatedData.conversionFactor ?? null,
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

    revalidateIngredientCaches(organizationId)

    return {
      success: true,
      data: ingredient,
    }
  } catch (error) {
    logger.error('Failed to update ingredient:', errorToContext(error))

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

    revalidateIngredientCaches(organizationId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete ingredient:', errorToContext(error))
    return {
      success: false,
      error: '재료 삭제에 실패했습니다',
    }
  }
}

export async function getIngredients(includeOneTime?: boolean) {
  try {
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'
    const oneTimeKey = includeOneTime ? 'with-onetime' : 'no-onetime'

    const getCached = unstable_cache(
      async () => {
        const conditions = [isNull(ingredients.deletedAt)]

        if (organizationId) {
          conditions.push(eq(ingredients.organizationId, organizationId))
        }

        if (!includeOneTime) {
          conditions.push(eq(ingredients.isOneTime, false))
        }

        return await db
          .select()
          .from(ingredients)
          .where(and(...conditions))
          .orderBy(ingredients.ingredientName)
          .limit(500)
      },
      ['ingredients:list', orgKey, oneTimeKey],
      { tags: [cacheTags.ingredients(organizationId)] }
    )

    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch ingredients:', errorToContext(error))
    return []
  }
}

export async function lookupByBarcode(barcode: string) {
  try {
    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return {
        success: false,
        error: '조직 정보를 찾을 수 없습니다',
      }
    }

    const normalizedBarcode = barcode.trim()
    if (!normalizedBarcode) {
      return {
        success: false,
        error: '등록되지 않은 바코드입니다',
      }
    }

    const ingredient = await db.query.ingredients.findFirst({
      where: and(
        eq(ingredients.barcode, normalizedBarcode),
        eq(ingredients.organizationId, organizationId),
        isNull(ingredients.deletedAt),
        eq(ingredients.isActive, true)
      ),
    })

    if (!ingredient) {
      return {
        success: false,
        error: '등록되지 않은 바코드입니다',
      }
    }

    const [latestPurchase] = await db
      .select({
        unitPrice: purchaseTransactions.unitPrice,
      })
      .from(purchaseTransactions)
      .innerJoin(stores, eq(purchaseTransactions.storeId, stores.id))
      .where(
        and(
          eq(purchaseTransactions.ingredientId, ingredient.id),
          isNull(purchaseTransactions.deletedAt),
          eq(stores.organizationId, organizationId),
          isNull(stores.deletedAt)
        )
      )
      .orderBy(
        desc(purchaseTransactions.transactionDate),
        desc(purchaseTransactions.createdAt)
      )
      .limit(1)

    return {
      success: true,
      ingredient: {
        ...ingredient,
        lastPurchaseUnitPrice: latestPurchase?.unitPrice ?? null,
      },
    }
  } catch (error) {
    logger.error(
      'Failed to lookup ingredient by barcode:',
      errorToContext(error)
    )
    return {
      success: false,
      error: '바코드 조회에 실패했습니다',
    }
  }
}

/**
 * 매입 등록 화면에서 미등록 바코드 스캔 시 원스텝 등록
 */
export async function quickRegisterIngredient(data: {
  barcode: string
  ingredientName: string
  unit: string
  unitCost?: string
}) {
  try {
    const organizationId = await requireOrganizationId()

    // 1. 바코드 중복 확인
    const existing = await db.query.ingredients.findFirst({
      where: and(
        eq(ingredients.barcode, data.barcode.trim()),
        eq(ingredients.organizationId, organizationId),
        isNull(ingredients.deletedAt)
      ),
    })

    if (existing) {
      return {
        success: false,
        error: '이미 등록된 바코드입니다',
      }
    }

    // 2. 재료 등록
    const validated = ingredientSchema.parse({
      ingredientName: data.ingredientName,
      unit: data.unit,
      barcode: data.barcode,
      unitCost: data.unitCost || undefined,
      isActive: true,
    })

    const [ingredient] = await db
      .insert(ingredients)
      .values({
        ingredientName: validated.ingredientName,
        unit: validated.unit,
        barcode: validated.barcode ?? null,
        unitCost: validated.unitCost,
        organizationId,
        createdBy: 'system',
      })
      .returning()

    revalidateIngredientCaches(organizationId)

    return {
      success: true,
      ingredient: {
        id: ingredient.id,
        ingredientName: ingredient.ingredientName,
        unit: ingredient.unit,
      },
    }
  } catch (error) {
    logger.error('Failed to quick-register ingredient:', errorToContext(error))

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

interface CSVRow {
  재료명: string
  단위: string
  바코드?: string
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
          barcode: row.바코드 || undefined,
          unitCost: row.단가 || undefined,
          description: row.설명 || '',
          isActive,
        })

        // Insert ingredient
        await db.insert(ingredients).values({
          ingredientName: validatedData.ingredientName,
          unit: validatedData.unit,
          barcode: validatedData.barcode ?? null,
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

    revalidateIngredientCaches(organizationId)

    return {
      success: true,
      successCount,
      failedCount,
      errors: errors.slice(0, 20), // Return first 20 errors
    }
  } catch (error) {
    logger.error('Failed to bulk create ingredients:', errorToContext(error))
    return {
      success: false,
      successCount,
      failedCount,
      error:
        error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}
