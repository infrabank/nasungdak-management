'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { costDistributionRules, menuCategories, ingredients } from '@/lib/db/schema'
import { eq, isNull, and, gte, lte, or, sql } from 'drizzle-orm'
import { z } from 'zod'

const costRuleSchema = z.object({
  menuId: z.string().uuid('메뉴를 선택해주세요'),
  ingredientId: z.string().uuid('재료를 선택해주세요'),
  distributionPercent: z.coerce.number().min(0.01, '배분 비율은 0보다 커야 합니다').max(100, '배분 비율은 100% 이하여야 합니다'),
  effectiveFrom: z.string().min(1, '시작일을 선택해주세요'),
  effectiveTo: z.string().optional().nullable(),
})

export async function createCostRule(formData: FormData) {
  try {
    const effectiveTo = formData.get('effectiveTo')
    const rawData = {
      menuId: formData.get('menuId'),
      ingredientId: formData.get('ingredientId'),
      distributionPercent: formData.get('distributionPercent'),
      effectiveFrom: formData.get('effectiveFrom'),
      effectiveTo: effectiveTo && effectiveTo !== '' ? effectiveTo : null,
    }


    const validatedData = costRuleSchema.parse(rawData)

    // Validate date range
    if (validatedData.effectiveTo && validatedData.effectiveTo < validatedData.effectiveFrom) {
      return {
        success: false,
        error: '종료일은 시작일 이후여야 합니다',
      }
    }

    // Check for overlapping rules
    const overlapping = await db.query.costDistributionRules.findFirst({
      where: and(
        eq(costDistributionRules.menuId, validatedData.menuId),
        eq(costDistributionRules.ingredientId, validatedData.ingredientId),
        isNull(costDistributionRules.deletedAt),
        or(
          // New rule starts within existing range
          and(
            lte(costDistributionRules.effectiveFrom, validatedData.effectiveFrom),
            or(
              sql`${costDistributionRules.effectiveTo} IS NULL`,
              gte(costDistributionRules.effectiveTo, validatedData.effectiveFrom)
            )
          ),
          // New rule ends within existing range
          validatedData.effectiveTo ? and(
            lte(costDistributionRules.effectiveFrom, validatedData.effectiveTo),
            or(
              sql`${costDistributionRules.effectiveTo} IS NULL`,
              gte(costDistributionRules.effectiveTo, validatedData.effectiveTo)
            )
          ) : sql`1=0`,
          // New rule encompasses existing range
          and(
            gte(costDistributionRules.effectiveFrom, validatedData.effectiveFrom),
            validatedData.effectiveTo ? lte(
              sql`COALESCE(${costDistributionRules.effectiveTo}, '9999-12-31')`,
              validatedData.effectiveTo
            ) : sql`1=0`
          )
        )
      ),
    })

    if (overlapping) {
      return {
        success: false,
        error: '동일한 메뉴-재료에 대해 기간이 겹치는 규칙이 이미 존재합니다',
      }
    }

    const [rule] = await db
      .insert(costDistributionRules)
      .values({
        menuId: validatedData.menuId,
        ingredientId: validatedData.ingredientId,
        distributionPercent: validatedData.distributionPercent.toString(),
        effectiveFrom: validatedData.effectiveFrom,
        effectiveTo: validatedData.effectiveTo || null,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/cost-rules')

    return {
      success: true,
      data: rule,
    }
  } catch (error) {
    console.error('Failed to create cost distribution rule:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '규칙 등록에 실패했습니다',
    }
  }
}

export async function updateCostRule(id: string, formData: FormData) {
  try {
    const effectiveTo = formData.get('effectiveTo')
    const rawData = {
      menuId: formData.get('menuId'),
      ingredientId: formData.get('ingredientId'),
      distributionPercent: formData.get('distributionPercent'),
      effectiveFrom: formData.get('effectiveFrom'),
      effectiveTo: effectiveTo && effectiveTo !== '' ? effectiveTo : null,
    }

    const validatedData = costRuleSchema.parse(rawData)

    // Validate date range
    if (validatedData.effectiveTo && validatedData.effectiveTo < validatedData.effectiveFrom) {
      return {
        success: false,
        error: '종료일은 시작일 이후여야 합니다',
      }
    }

    const [rule] = await db
      .update(costDistributionRules)
      .set({
        menuId: validatedData.menuId,
        ingredientId: validatedData.ingredientId,
        distributionPercent: validatedData.distributionPercent.toString(),
        effectiveFrom: validatedData.effectiveFrom,
        effectiveTo: validatedData.effectiveTo || null,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(costDistributionRules.id, id))
      .returning()

    revalidatePath('/dashboard/master-data/cost-rules')

    return {
      success: true,
      data: rule,
    }
  } catch (error) {
    console.error('Failed to update cost distribution rule:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '규칙 수정에 실패했습니다',
    }
  }
}

export async function deleteCostRule(id: string) {
  try {
    await db
      .update(costDistributionRules)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(costDistributionRules.id, id))

    revalidatePath('/dashboard/master-data/cost-rules')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete cost distribution rule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '규칙 삭제에 실패했습니다',
    }
  }
}

export async function getCostRules() {
  try {
    const rules = await db
      .select({
        id: costDistributionRules.id,
        menuId: costDistributionRules.menuId,
        menuName: menuCategories.menuName,
        ingredientId: costDistributionRules.ingredientId,
        ingredientName: ingredients.ingredientName,
        distributionPercent: costDistributionRules.distributionPercent,
        effectiveFrom: costDistributionRules.effectiveFrom,
        effectiveTo: costDistributionRules.effectiveTo,
      })
      .from(costDistributionRules)
      .leftJoin(menuCategories, eq(costDistributionRules.menuId, menuCategories.id))
      .leftJoin(ingredients, eq(costDistributionRules.ingredientId, ingredients.id))
      .where(isNull(costDistributionRules.deletedAt))
      .orderBy(menuCategories.menuName, costDistributionRules.effectiveFrom)

    return rules
  } catch (error) {
    console.error('Failed to fetch cost distribution rules:', error)
    return []
  }
}

export async function getMenus() {
  try {
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
      .orderBy(menuCategories.menuName)

    return menus
  } catch (error) {
    console.error('Failed to fetch menus:', error)
    return []
  }
}

export async function getIngredients() {
  try {
    const ingredientsList = await db
      .select({
        id: ingredients.id,
        ingredientName: ingredients.ingredientName,
        unit: ingredients.unit,
      })
      .from(ingredients)
      .where(and(
        isNull(ingredients.deletedAt),
        eq(ingredients.isActive, true)
      ))
      .orderBy(ingredients.ingredientName)

    return ingredientsList
  } catch (error) {
    console.error('Failed to fetch ingredients:', error)
    return []
  }
}
