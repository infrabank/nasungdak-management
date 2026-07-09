'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { salesMenus, salesMenuItems, skus } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { z } from 'zod'
import { getOrganizationId, requireOrganizationId } from '@/lib/auth-context'
import { cacheTags, revalidateSalesMenuData } from '@/lib/cache-tags'

const salesMenuSchema = z.object({
  menuName: z.string().min(1, '메뉴명을 입력해주세요').max(100),
  menuType: z.enum(['single', 'bundle'], {
    required_error: '메뉴 유형을 선택해주세요',
  }),
  basePrice: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '가격은 0 이상이어야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
})

export async function createSalesMenu(formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const rawData = {
      menuName: formData.get('menuName'),
      menuType: formData.get('menuType'),
      basePrice: formData.get('basePrice'),
      description: formData.get('description') || null,
      isActive: formData.get('isActive') === 'true',
      sortOrder: formData.get('sortOrder') || 0,
    }

    const validatedData = salesMenuSchema.parse(rawData)

    const [menu] = await db
      .insert(salesMenus)
      .values({
        ...validatedData,
        organizationId,
        createdBy: 'system',
      })
      .returning()

    // If single menu type, create a menu item linking to SKU
    const skuId = formData.get('skuId') as string | null
    if (validatedData.menuType === 'single' && skuId) {
      await db.insert(salesMenuItems).values({
        organizationId,
        salesMenuId: menu.id,
        skuId,
        quantity: 1,
        isRequired: true,
        createdBy: 'system',
      })
    }

    revalidatePath('/dashboard/master-data/sales-menus')
    revalidateSalesMenuData(organizationId)

    return {
      success: true,
      data: menu,
    }
  } catch (error) {
    logger.error('Failed to create sales menu:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: '메뉴 등록에 실패했습니다',
    }
  }
}

export async function updateSalesMenu(id: string, formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const rawData = {
      menuName: formData.get('menuName'),
      menuType: formData.get('menuType'),
      basePrice: formData.get('basePrice'),
      description: formData.get('description') || null,
      isActive: formData.get('isActive') === 'true',
      sortOrder: formData.get('sortOrder') || 0,
    }

    const validatedData = salesMenuSchema.parse(rawData)

    const [menu] = await db
      .update(salesMenus)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(
        and(
          eq(salesMenus.id, id),
          eq(salesMenus.organizationId, organizationId)
        )
      )
      .returning()

    revalidatePath('/dashboard/master-data/sales-menus')
    revalidateSalesMenuData(organizationId)

    return {
      success: true,
      data: menu,
    }
  } catch (error) {
    logger.error('Failed to update sales menu:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: '메뉴 수정에 실패했습니다',
    }
  }
}

export async function deleteSalesMenu(id: string) {
  try {
    const organizationId = await requireOrganizationId()

    // Soft delete menu items first
    await db
      .update(salesMenuItems)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(
        and(
          eq(salesMenuItems.salesMenuId, id),
          eq(salesMenuItems.organizationId, organizationId)
        )
      )

    // Soft delete the menu
    await db
      .update(salesMenus)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(
        and(
          eq(salesMenus.id, id),
          eq(salesMenus.organizationId, organizationId)
        )
      )

    revalidatePath('/dashboard/master-data/sales-menus')
    revalidateSalesMenuData(organizationId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete sales menu:', errorToContext(error))
    return {
      success: false,
      error: '메뉴 삭제에 실패했습니다',
    }
  }
}

export async function addMenuItemToBundle(
  menuId: string,
  skuId: string,
  quantity: number
) {
  try {
    const organizationId = await requireOrganizationId()

    const [item] = await db
      .insert(salesMenuItems)
      .values({
        organizationId,
        salesMenuId: menuId,
        skuId,
        quantity,
        isRequired: true,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/sales-menus')
    revalidateSalesMenuData(organizationId)

    return {
      success: true,
      data: item,
    }
  } catch (error) {
    logger.error('Failed to add menu item:', errorToContext(error))
    return {
      success: false,
      error: '구성 추가에 실패했습니다',
    }
  }
}

export async function removeMenuItemFromBundle(itemId: string) {
  try {
    const organizationId = await requireOrganizationId()

    await db
      .update(salesMenuItems)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(
        and(
          eq(salesMenuItems.id, itemId),
          eq(salesMenuItems.organizationId, organizationId)
        )
      )

    revalidatePath('/dashboard/master-data/sales-menus')
    revalidateSalesMenuData(organizationId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to remove menu item:', errorToContext(error))
    return {
      success: false,
      error: '구성 삭제에 실패했습니다',
    }
  }
}

export async function getSalesMenus() {
  try {
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        // Get all active menus
        const menuList = await db
          .select()
          .from(salesMenus)
          .where(
            and(
              isNull(salesMenus.deletedAt),
              organizationId
                ? eq(salesMenus.organizationId, organizationId)
                : undefined
            )
          )
          .orderBy(salesMenus.sortOrder)

        // Get all menu items with SKU details
        const itemList = await db
          .select({
            id: salesMenuItems.id,
            salesMenuId: salesMenuItems.salesMenuId,
            skuId: salesMenuItems.skuId,
            skuName: skus.skuName,
            quantity: salesMenuItems.quantity,
            isRequired: salesMenuItems.isRequired,
          })
          .from(salesMenuItems)
          .leftJoin(skus, eq(salesMenuItems.skuId, skus.id))
          .where(
            and(
              isNull(salesMenuItems.deletedAt),
              organizationId
                ? eq(salesMenuItems.organizationId, organizationId)
                : undefined
            )
          )

        // Build a Map for O(1) lookup
        const itemsByMenuId = new Map<string, typeof itemList>()
        for (const item of itemList) {
          const existing = itemsByMenuId.get(item.salesMenuId) ?? []
          existing.push(item)
          itemsByMenuId.set(item.salesMenuId, existing)
        }

        // Group items by menu
        const menusWithItems = menuList.map((menu) => ({
          ...menu,
          items: itemsByMenuId.get(menu.id) ?? [],
        }))

        return menusWithItems
      },
      ['sales-menus:list', orgKey],
      { tags: [cacheTags.salesMenus(organizationId)] }
    )

    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch sales menus:', errorToContext(error))
    return []
  }
}

export async function getSkusForSelect() {
  try {
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        return await db
          .select({
            id: skus.id,
            skuName: skus.skuName,
            unitPrice: skus.unitPrice,
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
      ['skus:select', orgKey],
      { tags: [cacheTags.skus(organizationId)] }
    )

    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch SKUs:', errorToContext(error))
    return []
  }
}
