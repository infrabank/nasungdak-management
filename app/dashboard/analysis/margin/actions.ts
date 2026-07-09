'use server'

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { skuRecipes, skus, ingredients, menuCategories } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { getOrganizationId } from '@/lib/auth-context'
import { getRecipeToIngredientFactor } from '@/lib/costing'
import { cacheTags } from '@/lib/cache-tags'

export interface SkuMarginData {
  id: string
  skuName: string
  menuName: string | null
  unitPrice: number
  totalCost: number
  margin: number
  marginPercent: number
  hasBom: boolean
  recipes: {
    ingredientName: string | null
    quantity: string | null
    unit: string
    unitCost: number
    subtotal: number
    costPercent: number
  }[]
}

export interface MarginSummary {
  totalSkus: number
  noBomSkus: number // 레시피 미등록 (요약 통계에서 제외됨)
  avgMarginPercent: number
  lowMarginSkus: number // < 30%
  healthyMarginSkus: number // >= 30%
  highestMarginSku: string | null
  lowestMarginSku: string | null
}

export async function getSkuMarginAnalysis(): Promise<{
  skus: SkuMarginData[]
  summary: MarginSummary
}> {
  try {
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        // Get all active SKUs
        const skuList = await db
          .select({
            id: skus.id,
            skuName: skus.skuName,
            menuId: skus.menuId,
            menuName: menuCategories.menuName,
            unitPrice: skus.unitPrice,
          })
          .from(skus)
          .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
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

        // Get all recipes
        const recipeList = await db
          .select({
            skuId: skuRecipes.skuId,
            ingredientName: ingredients.ingredientName,
            ingredientUnit: ingredients.unit,
            ingredientUnitCost: ingredients.unitCost,
            quantity: skuRecipes.quantity,
            unit: skuRecipes.unit,
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

        // Calculate margins
        const skusWithMargin: SkuMarginData[] = skuList.map((sku) => {
          const recipes = recipesBySkuId.get(sku.id) ?? []
          let totalCost = 0

          const recipeDetails = recipes.map((recipe) => {
            const ingredientCost = recipe.ingredientUnitCost
              ? Number(recipe.ingredientUnitCost)
              : 0
            const quantity = Number(recipe.quantity || 0)

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
              ingredientName: recipe.ingredientName,
              quantity: recipe.quantity,
              unit: recipe.unit,
              unitCost: costPerUnit,
              subtotal,
              costPercent: 0, // Will calculate after
            }
          })

          // Calculate cost percentages
          recipeDetails.forEach((r) => {
            r.costPercent = totalCost > 0 ? (r.subtotal / totalCost) * 100 : 0
          })

          const unitPrice = Number(sku.unitPrice)
          const margin = unitPrice - totalCost
          const marginPercent = unitPrice > 0 ? (margin / unitPrice) * 100 : 0

          return {
            id: sku.id,
            skuName: sku.skuName,
            menuName: sku.menuName,
            unitPrice,
            totalCost,
            margin,
            marginPercent,
            hasBom: recipes.length > 0,
            recipes: recipeDetails,
          }
        })

        // Sort by margin percent (ascending - lowest first for attention)
        const sortedSkus = [...skusWithMargin].sort(
          (a, b) => a.marginPercent - b.marginPercent
        )

        // Calculate summary
        // 레시피 미등록 SKU는 원가 0 -> 마진 100%로 잡혀 평균을 왜곡하므로 요약 통계에서 제외
        const bomSkus = skusWithMargin.filter((s) => s.hasBom)
        const totalSkus = skusWithMargin.length
        const noBomSkus = totalSkus - bomSkus.length
        const avgMarginPercent =
          bomSkus.length > 0
            ? bomSkus.reduce((sum, s) => sum + s.marginPercent, 0) /
              bomSkus.length
            : 0
        const lowMarginSkus = bomSkus.filter(
          (s) => s.marginPercent < 30
        ).length
        const healthyMarginSkus = bomSkus.filter(
          (s) => s.marginPercent >= 30
        ).length

        const highestMargin = bomSkus.reduce(
          (max, s) => (s.marginPercent > max.marginPercent ? s : max),
          bomSkus[0] || { marginPercent: 0, skuName: null }
        )
        const lowestMargin = bomSkus.reduce(
          (min, s) => (s.marginPercent < min.marginPercent ? s : min),
          bomSkus[0] || { marginPercent: 0, skuName: null }
        )

        return {
          skus: sortedSkus,
          summary: {
            totalSkus,
            noBomSkus,
            avgMarginPercent,
            lowMarginSkus,
            healthyMarginSkus,
            highestMarginSku: highestMargin?.skuName || null,
            lowestMarginSku: lowestMargin?.skuName || null,
          },
        }
      },
      ['margin-analysis:list:v2', orgKey],
      { tags: [cacheTags.marginAnalysis(organizationId)] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch SKU margin analysis:', errorToContext(error))
    return {
      skus: [],
      summary: {
        totalSkus: 0,
        noBomSkus: 0,
        avgMarginPercent: 0,
        lowMarginSkus: 0,
        healthyMarginSkus: 0,
        highestMarginSku: null,
        lowestMarginSku: null,
      },
    }
  }
}
