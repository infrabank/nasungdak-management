'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import {
  skuRecipes,
  skus,
  ingredients,
  menuCategories,
  purchaseTransactions,
} from '@/lib/db/schema'
import { eq, isNull, and, sum, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getOrganizationId, requireOrganizationId } from '@/lib/auth-context'

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

    const [recipe] = await db
      .insert(skuRecipes)
      .values({
        ...validatedData,
        organizationId,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/sku-recipes')
    revalidateTag('sku-recipes:all')

    return {
      success: true,
      data: recipe,
    }
  } catch (error) {
    console.error('Failed to create SKU recipe:', error)

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
    revalidateTag('sku-recipes:all')

    return {
      success: true,
      data: recipe,
    }
  } catch (error) {
    console.error('Failed to update SKU recipe:', error)

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
    revalidateTag('sku-recipes:all')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete SKU recipe:', error)
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
          organizationId ? eq(skus.organizationId, organizationId) : undefined
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

    // Get weighted average unit prices from purchase data per ingredient
    const avgPrices = await db
      .select({
        ingredientId: purchaseTransactions.ingredientId,
        avgUnitPrice: sql<string>`
          CASE
            WHEN SUM(${purchaseTransactions.quantity}) > 0
            THEN SUM(${purchaseTransactions.totalAmount}) / SUM(${purchaseTransactions.quantity})
            ELSE 0
          END
        `.as('avg_unit_price'),
      })
      .from(purchaseTransactions)
      .where(
        and(
          isNull(purchaseTransactions.deletedAt),
          eq(purchaseTransactions.isValid, true)
        )
      )
      .groupBy(purchaseTransactions.ingredientId)

    // Build a map of ingredient_id -> avg unit price
    const avgPriceMap = new Map<string, number>()
    for (const row of avgPrices) {
      avgPriceMap.set(row.ingredientId, Number(row.avgUnitPrice))
    }

    // Calculate costs and group by SKU
    const skusWithCosts = skuList.map((sku) => {
      const recipes = recipeList.filter((r) => r.skuId === sku.id)

      // Calculate total cost
      let totalCost = 0
      const recipeDetails = recipes.map((recipe) => {
        // Use purchase avg price, fallback to ingredients.unit_cost
        const purchaseAvgPrice = recipe.ingredientId
          ? (avgPriceMap.get(recipe.ingredientId) ?? 0)
          : 0
        const ingredientCost =
          purchaseAvgPrice > 0
            ? purchaseAvgPrice
            : recipe.ingredientUnitCost
              ? Number(recipe.ingredientUnitCost)
              : 0
        const quantity = Number(recipe.quantity)

        // Unit conversion (recipe unit -> ingredient base unit)
        let costPerUnit = ingredientCost
        if (recipe.ingredientUnit === 'kg' && recipe.unit === 'g') {
          costPerUnit = ingredientCost / 1000
        } else if (recipe.ingredientUnit === 'L' && recipe.unit === 'ml') {
          costPerUnit = ingredientCost / 1000
        } else if (recipe.ingredientUnit === 'g' && recipe.unit === 'kg') {
          costPerUnit = ingredientCost * 1000
        } else if (recipe.ingredientUnit === 'ml' && recipe.unit === 'L') {
          costPerUnit = ingredientCost * 1000
        }

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
  } catch (error) {
    console.error('Failed to fetch SKUs with recipes:', error)
    return []
  }
}

export async function getSkus() {
  try {
    const organizationId = await getOrganizationId()
    const items = await db
      .select({
        id: skus.id,
        skuName: skus.skuName,
      })
      .from(skus)
      .where(
        and(
          isNull(skus.deletedAt),
          eq(skus.isActive, true),
          organizationId ? eq(skus.organizationId, organizationId) : undefined
        )
      )
      .orderBy(skus.skuName)

    return items
  } catch (error) {
    console.error('Failed to fetch SKUs:', error)
    return []
  }
}

export async function getIngredients() {
  try {
    const organizationId = await getOrganizationId()
    const items = await db
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

    return items
  } catch (error) {
    console.error('Failed to fetch ingredients:', error)
    return []
  }
}
