'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { skus, menuCategories } from '@/lib/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const skuSchema = z.object({
  skuName: z.string().min(1, 'SKU명을 입력해주세요').max(100),
  menuId: z.string().uuid('메뉴를 선택해주세요'),
  unitPrice: z.coerce.number().nonnegative('단가는 0 이상이어야 합니다'),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
})

export async function createSku(formData: FormData) {
  try {
    const rawData = {
      skuName: formData.get('skuName'),
      menuId: formData.get('menuId'),
      unitPrice: formData.get('unitPrice'),
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = skuSchema.parse(rawData)

    const [sku] = await db
      .insert(skus)
      .values({
        ...validatedData,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/skus')

    return {
      success: true,
      data: sku,
    }
  } catch (error) {
    console.error('Failed to create SKU:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: 'SKU 등록에 실패했습니다',
    }
  }
}

export async function updateSku(id: string, formData: FormData) {
  try {
    const rawData = {
      skuName: formData.get('skuName'),
      menuId: formData.get('menuId'),
      unitPrice: formData.get('unitPrice'),
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = skuSchema.parse(rawData)

    const [sku] = await db
      .update(skus)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(skus.id, id))
      .returning()

    revalidatePath('/dashboard/master-data/skus')

    return {
      success: true,
      data: sku,
    }
  } catch (error) {
    console.error('Failed to update SKU:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: 'SKU 수정에 실패했습니다',
    }
  }
}

export async function deleteSku(id: string) {
  try {
    await db
      .update(skus)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(skus.id, id))

    revalidatePath('/dashboard/master-data/skus')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete SKU:', error)
    return {
      success: false,
      error: 'SKU 삭제에 실패했습니다',
    }
  }
}

export async function getSkus() {
  try {
    const items = await db
      .select({
        id: skus.id,
        skuName: skus.skuName,
        menuId: skus.menuId,
        menuName: menuCategories.menuName,
        unitPrice: skus.unitPrice,
        description: skus.description,
        isActive: skus.isActive,
        createdAt: skus.createdAt,
      })
      .from(skus)
      .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
      .where(isNull(skus.deletedAt))
      .orderBy(skus.skuName)

    return items
  } catch (error) {
    console.error('Failed to fetch SKUs:', error)
    return []
  }
}
