'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { menuCategories, ingredients, skus } from '@/lib/db/schema'
import { requireOrganizationId, assertPermission } from '@/lib/auth-context'
import { z } from 'zod'
import {
  revalidateMenuData,
  revalidateIngredientData,
  revalidateSkuData,
} from '@/lib/cache-tags'

const menuSetupSchema = z.object({
  menu: z.object({
    menuName: z.string().min(1, '메뉴명을 입력해주세요').max(100),
    description: z.string().max(500).optional(),
  }),
  ingredients: z
    .array(
      z.object({
        existingId: z.string().uuid().optional(),
        newIngredient: z
          .object({
            ingredientName: z.string().min(1).max(100),
            unit: z.string().min(1).max(20),
            unitCost: z.string().optional(),
          })
          .optional(),
        requiredQuantity: z.string().refine(
          (val) => {
            const num = Number(val)
            return !isNaN(num) && num > 0
          },
          { message: '필요 수량은 0보다 커야 합니다' }
        ),
      })
    )
    .min(1, '최소 하나의 재료를 추가해주세요')
    .refine(
      (items) =>
        items.every((item) => item.existingId || item.newIngredient),
      { message: '각 재료는 기존 재료 선택 또는 신규 재료 입력이 필요합니다' }
    ),
  skus: z
    .array(
      z.object({
        skuName: z.string().min(1, 'SKU명을 입력해주세요').max(100),
        unitPrice: z.string().refine(
          (val) => {
            const num = Number(val)
            return !isNaN(num) && num >= 0
          },
          { message: '판매단가는 0 이상이어야 합니다' }
        ),
        description: z.string().max(500).optional(),
      })
    )
    .min(1, '최소 하나의 SKU를 추가해주세요'),
})

export type MenuSetupData = z.infer<typeof menuSetupSchema>

export async function createMenuSetup(data: MenuSetupData) {
  try {
    await assertPermission('master-data', 'write')
    const organizationId = await requireOrganizationId()

    // Validate all data before starting transaction
    const validated = menuSetupSchema.parse(data)

    const result = await db.transaction(async (tx) => {
      // 1. Create menu category
      const [menu] = await tx
        .insert(menuCategories)
        .values({
          menuName: validated.menu.menuName,
          description: validated.menu.description || null,
          organizationId,
          createdBy: 'system',
        })
        .returning()

      // 2. Create new ingredients (재료-메뉴 매핑은 SKU 레시피에서 관리함)
      for (const item of validated.ingredients) {
        if (!item.existingId && item.newIngredient) {
          await tx.insert(ingredients).values({
            ingredientName: item.newIngredient.ingredientName,
            unit: item.newIngredient.unit,
            unitCost: item.newIngredient.unitCost || undefined,
            organizationId,
            createdBy: 'system',
          })
        }
      }

      // 3. Create SKUs
      for (const sku of validated.skus) {
        await tx.insert(skus).values({
          skuName: sku.skuName,
          menuId: menu.id,
          unitPrice: sku.unitPrice,
          description: sku.description || null,
          organizationId,
          createdBy: 'system',
        })
      }

      return menu
    })

    revalidatePath('/dashboard/master-data')
    revalidatePath('/dashboard/master-data/menus')
    revalidatePath('/dashboard/master-data/ingredients')
    revalidatePath('/dashboard/master-data/skus')
    revalidatePath('/dashboard/master-data/menu-ingredients')
    revalidatePath('/dashboard/master-data/sku-recipes')
    revalidatePath('/dashboard/inventory')
    // 메뉴 셋업은 메뉴+재료+SKU를 한 번에 만들므로 세 도메인 캐시를 모두 턴다.
    revalidateMenuData(organizationId)
    revalidateIngredientData(organizationId)
    revalidateSkuData(organizationId)

    return {
      success: true,
      data: { id: result.id, menuName: result.menuName },
    }
  } catch (error) {
    logger.error('Failed to create menu setup:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '메뉴 셋업에 실패했습니다',
    }
  }
}
