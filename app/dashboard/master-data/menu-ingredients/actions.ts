'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { menuIngredients, menuCategories, ingredients } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { z } from 'zod'
import { getOrganizationId, requireOrganizationId } from '@/lib/auth-context'

const menuIngredientSchema = z.object({
  menuId: z.string().uuid('메뉴를 선택해주세요'),
  ingredientId: z.string().uuid('재료를 선택해주세요'),
  requiredQuantity: z.coerce.number().positive('수량은 0보다 커야 합니다'),
})

export async function createMenuIngredient(formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const rawData = {
      menuId: formData.get('menuId'),
      ingredientId: formData.get('ingredientId'),
      requiredQuantity: formData.get('requiredQuantity'),
    }

    const validatedData = menuIngredientSchema.parse(rawData)

    // Check if mapping already exists
    const existing = await db.query.menuIngredients.findFirst({
      where: and(
        eq(menuIngredients.menuId, validatedData.menuId),
        eq(menuIngredients.ingredientId, validatedData.ingredientId),
        eq(menuIngredients.organizationId, organizationId),
        isNull(menuIngredients.deletedAt)
      ),
    })

    if (existing) {
      return {
        success: false,
        error: '이미 등록된 메뉴-재료 매핑입니다',
      }
    }

    const [mapping] = await db
      .insert(menuIngredients)
      .values({
        menuId: validatedData.menuId,
        ingredientId: validatedData.ingredientId,
        organizationId,
        requiredQuantity: validatedData.requiredQuantity.toString(),
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/menu-ingredients')

    return {
      success: true,
      data: mapping,
    }
  } catch (error) {
    console.error('Failed to create menu-ingredient mapping:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '매핑 등록에 실패했습니다',
    }
  }
}

export async function updateMenuIngredient(id: string, formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const rawData = {
      menuId: formData.get('menuId'),
      ingredientId: formData.get('ingredientId'),
      requiredQuantity: formData.get('requiredQuantity'),
    }

    const validatedData = menuIngredientSchema.parse(rawData)

    const [mapping] = await db
      .update(menuIngredients)
      .set({
        menuId: validatedData.menuId,
        ingredientId: validatedData.ingredientId,
        requiredQuantity: validatedData.requiredQuantity.toString(),
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(
        and(
          eq(menuIngredients.id, id),
          eq(menuIngredients.organizationId, organizationId)
        )
      )
      .returning()

    revalidatePath('/dashboard/master-data/menu-ingredients')

    return {
      success: true,
      data: mapping,
    }
  } catch (error) {
    console.error('Failed to update menu-ingredient mapping:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '매핑 수정에 실패했습니다',
    }
  }
}

export async function deleteMenuIngredient(id: string) {
  try {
    const organizationId = await requireOrganizationId()
    await db
      .update(menuIngredients)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(
        and(
          eq(menuIngredients.id, id),
          eq(menuIngredients.organizationId, organizationId)
        )
      )

    revalidatePath('/dashboard/master-data/menu-ingredients')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete menu-ingredient mapping:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '매핑 삭제에 실패했습니다',
    }
  }
}

export async function getMenuIngredients() {
  try {
    const organizationId = await getOrganizationId()
    const mappings = await db
      .select({
        id: menuIngredients.id,
        menuId: menuIngredients.menuId,
        menuName: menuCategories.menuName,
        ingredientId: menuIngredients.ingredientId,
        ingredientName: ingredients.ingredientName,
        unit: ingredients.unit,
        requiredQuantity: menuIngredients.requiredQuantity,
      })
      .from(menuIngredients)
      .leftJoin(menuCategories, eq(menuIngredients.menuId, menuCategories.id))
      .leftJoin(ingredients, eq(menuIngredients.ingredientId, ingredients.id))
      .where(
        and(
          isNull(menuIngredients.deletedAt),
          organizationId
            ? eq(menuIngredients.organizationId, organizationId)
            : undefined
        )
      )
      .orderBy(menuCategories.menuName, ingredients.ingredientName)

    return mappings
  } catch (error) {
    console.error('Failed to fetch menu-ingredient mappings:', error)
    return []
  }
}

export async function getMenus() {
  try {
    const organizationId = await getOrganizationId()
    const menus = await db
      .select({
        id: menuCategories.id,
        menuName: menuCategories.menuName,
      })
      .from(menuCategories)
      .where(
        and(
          isNull(menuCategories.deletedAt),
          eq(menuCategories.isActive, true),
          organizationId
            ? eq(menuCategories.organizationId, organizationId)
            : undefined
        )
      )
      .orderBy(menuCategories.menuName)

    return menus
  } catch (error) {
    console.error('Failed to fetch menus:', error)
    return []
  }
}

export async function getIngredients() {
  try {
    const organizationId = await getOrganizationId()
    const ingredientsList = await db
      .select({
        id: ingredients.id,
        ingredientName: ingredients.ingredientName,
        unit: ingredients.unit,
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

    return ingredientsList
  } catch (error) {
    console.error('Failed to fetch ingredients:', error)
    return []
  }
}
