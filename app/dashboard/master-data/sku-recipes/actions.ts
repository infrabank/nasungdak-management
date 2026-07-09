'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import {
  skuRecipes,
  skus,
  ingredients,
  menuCategories,
} from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { z } from 'zod'
import { getOrganizationId, requireOrganizationId } from '@/lib/auth-context'
import {
  getRecipeToIngredientFactor,
  validateRecipeUnit,
} from '@/lib/costing'

/** 레시피 단위가 재료 기준 단위와 호환되는지 확인. 문제 시 에러 메시지 반환 */
async function checkRecipeUnitCompatibility(
  ingredientId: string,
  recipeUnit: string
): Promise<string | null> {
  const [ingredient] = await db
    .select({ unit: ingredients.unit })
    .from(ingredients)
    .where(and(eq(ingredients.id, ingredientId), isNull(ingredients.deletedAt)))
    .limit(1)
  if (!ingredient) return null
  return validateRecipeUnit(recipeUnit, ingredient.unit)
}

const skuRecipeSchema = z.object({
  skuId: z.string().uuid('SKU를 선택해주세요'),
  ingredientId: z.string().uuid('원재료를 선택해주세요'),
  quantity: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '사용량은 0보다 커야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  unit: z.string().min(1, '단위를 입력해주세요').max(20),
  notes: z.string().optional().nullable(),
})

export async function createSkuRecipe(formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const rawData = {
      skuId: formData.get('skuId'),
      ingredientId: formData.get('ingredientId'),
      quantity: formData.get('quantity'),
      unit: formData.get('unit'),
      notes: formData.get('notes') || null,
    }

    const validatedData = skuRecipeSchema.parse(rawData)

    const unitError = await checkRecipeUnitCompatibility(
      validatedData.ingredientId,
      validatedData.unit
    )
    if (unitError) {
      return { success: false, error: unitError }
    }

    // Check for an existing row (including soft-deleted) for this SKU+ingredient.
    // A soft-deleted row still occupies the unique pair, so we revive it instead
    // of inserting a new one, which would otherwise hit the unique constraint.
    const [existing] = await db
      .select({ id: skuRecipes.id, deletedAt: skuRecipes.deletedAt })
      .from(skuRecipes)
      .where(
        and(
          eq(skuRecipes.skuId, validatedData.skuId),
          eq(skuRecipes.ingredientId, validatedData.ingredientId),
          eq(skuRecipes.organizationId, organizationId)
        )
      )
      .limit(1)

    let recipe

    if (existing) {
      if (existing.deletedAt === null) {
        return {
          success: false,
          error: '이미 해당 SKU에 동일한 원재료가 등록되어 있습니다',
        }
      }

      // Revive the soft-deleted recipe with the new values.
      ;[recipe] = await db
        .update(skuRecipes)
        .set({
          ...validatedData,
          deletedAt: null,
          deletedBy: null,
          updatedAt: new Date(),
          updatedBy: 'system',
        })
        .where(eq(skuRecipes.id, existing.id))
        .returning()
    } else {
      ;[recipe] = await db
        .insert(skuRecipes)
        .values({
          ...validatedData,
          organizationId,
          createdBy: 'system',
        })
        .returning()
    }

    revalidatePath('/dashboard/master-data/sku-recipes')
    revalidateTag(`sku-recipes:${organizationId}`)
    revalidateTag(`margin-analysis:${organizationId}`)

    return {
      success: true,
      data: recipe,
    }
  } catch (error) {
    logger.error('Failed to create SKU recipe:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return {
        success: false,
        error: '이미 해당 SKU에 동일한 원재료가 등록되어 있습니다',
      }
    }

    return {
      success: false,
      error: '레시피 등록에 실패했습니다',
    }
  }
}

export async function updateSkuRecipe(id: string, formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const rawData = {
      skuId: formData.get('skuId'),
      ingredientId: formData.get('ingredientId'),
      quantity: formData.get('quantity'),
      unit: formData.get('unit'),
      notes: formData.get('notes') || null,
    }

    const validatedData = skuRecipeSchema.parse(rawData)

    const unitError = await checkRecipeUnitCompatibility(
      validatedData.ingredientId,
      validatedData.unit
    )
    if (unitError) {
      return { success: false, error: unitError }
    }

    const [recipe] = await db
      .update(skuRecipes)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(
        and(
          eq(skuRecipes.id, id),
          eq(skuRecipes.organizationId, organizationId)
        )
      )
      .returning()

    revalidatePath('/dashboard/master-data/sku-recipes')
    revalidateTag(`sku-recipes:${organizationId}`)
    revalidateTag(`margin-analysis:${organizationId}`)

    return {
      success: true,
      data: recipe,
    }
  } catch (error) {
    logger.error('Failed to update SKU recipe:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: '레시피 수정에 실패했습니다',
    }
  }
}

export async function deleteSkuRecipe(id: string) {
  try {
    const organizationId = await requireOrganizationId()
    await db
      .update(skuRecipes)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(
        and(
          eq(skuRecipes.id, id),
          eq(skuRecipes.organizationId, organizationId)
        )
      )

    revalidatePath('/dashboard/master-data/sku-recipes')
    revalidateTag(`sku-recipes:${organizationId}`)
    revalidateTag(`margin-analysis:${organizationId}`)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete SKU recipe:', errorToContext(error))
    return {
      success: false,
      error: '레시피 삭제에 실패했습니다',
    }
  }
}

// SKU별 레시피와 원가 계산
export async function getSkusWithRecipes() {
  try {
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        // Get all active SKUs with their menu category
        const skuList = await db
          .select({
            id: skus.id,
            skuName: skus.skuName,
            menuId: skus.menuId,
            menuName: menuCategories.menuName,
            unitPrice: skus.unitPrice,
            isActive: skus.isActive,
          })
          .from(skus)
          .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
          .where(
            and(
              isNull(skus.deletedAt),
              organizationId
                ? eq(skus.organizationId, organizationId)
                : undefined
            )
          )
          .orderBy(skus.skuName)

        // Get all recipes with ingredient details
        const recipeList = await db
          .select({
            id: skuRecipes.id,
            skuId: skuRecipes.skuId,
            ingredientId: skuRecipes.ingredientId,
            ingredientName: ingredients.ingredientName,
            ingredientUnit: ingredients.unit,
            ingredientUnitCost: ingredients.unitCost,
            quantity: skuRecipes.quantity,
            unit: skuRecipes.unit,
            notes: skuRecipes.notes,
          })
          .from(skuRecipes)
          .leftJoin(ingredients, eq(skuRecipes.ingredientId, ingredients.id))
          .where(
            and(
              isNull(skuRecipes.deletedAt),
              organizationId
                ? eq(skuRecipes.organizationId, organizationId)
                : undefined
            )
          )

        // Build a Map for O(1) lookup
        const recipesBySkuId = new Map<string, typeof recipeList>()
        for (const recipe of recipeList) {
          const existing = recipesBySkuId.get(recipe.skuId) ?? []
          existing.push(recipe)
          recipesBySkuId.set(recipe.skuId, existing)
        }

        // Calculate costs and group by SKU
        const skusWithCosts = skuList.map((sku) => {
          const recipes = recipesBySkuId.get(sku.id) ?? []

          // Calculate total cost
          let totalCost = 0
          const recipeDetails = recipes.map((recipe) => {
            // Recipe cost uses the ingredient master 단가(unitCost) only.
            const ingredientCost =
              recipe.ingredientUnitCost != null
                ? Number(recipe.ingredientUnitCost)
                : 0
            const quantity = Number(recipe.quantity)

            // 단위 환산 (lib/costing 공용 규칙)
            const factor =
              getRecipeToIngredientFactor(
                recipe.unit,
                recipe.ingredientUnit
              ) ?? 1
            const costPerUnit = ingredientCost * factor

            const subtotal = costPerUnit * quantity
            totalCost += subtotal

            return {
              ...recipe,
              costPerUnit,
              subtotal,
            }
          })

          const unitPrice = Number(sku.unitPrice)
          const margin = unitPrice - totalCost
          const marginPercent = unitPrice > 0 ? (margin / unitPrice) * 100 : 0

          return {
            ...sku,
            recipes: recipeDetails,
            totalCost,
            margin,
            marginPercent,
          }
        })

        return skusWithCosts
      },
      ['sku-recipes:full:v2', orgKey],
      { tags: [`sku-recipes:${orgKey}`] }
    )

    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch SKUs with recipes:', errorToContext(error))
    return []
  }
}

export async function getSkus() {
  try {
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        return await db
          .select({
            id: skus.id,
            skuName: skus.skuName,
          })
          .from(skus)
          .where(
            and(
              isNull(skus.deletedAt),
              eq(skus.isActive, true),
              organizationId
                ? eq(skus.organizationId, organizationId)
                : undefined
            )
          )
          .orderBy(skus.skuName)
          .limit(500)
      },
      ['skus:active', orgKey],
      { tags: [`skus:${orgKey}`] }
    )

    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch SKUs:', errorToContext(error))
    return []
  }
}

export async function getIngredients() {
  try {
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        return await db
          .select({
            id: ingredients.id,
            ingredientName: ingredients.ingredientName,
            unit: ingredients.unit,
            unitCost: ingredients.unitCost,
          })
          .from(ingredients)
          .where(
            and(
              isNull(ingredients.deletedAt),
              eq(ingredients.isActive, true),
              organizationId
                ? eq(ingredients.organizationId, organizationId)
                : undefined
            )
          )
          .orderBy(ingredients.ingredientName)
          .limit(500)
      },
      ['ingredients:active', orgKey],
      { tags: [`ingredients:${orgKey}`] }
    )

    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch ingredients:', errorToContext(error))
    return []
  }
}
