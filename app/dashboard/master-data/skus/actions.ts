'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { skus, menuCategories } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { z } from 'zod'
import { getOrganizationId, requireOrganizationId } from '@/lib/auth-context'

const skuSchema = z.object({
  skuName: z.string().min(1, 'SKU명을 입력해주세요').max(100),
  menuId: z.string().uuid('메뉴를 선택해주세요'),
  unitPrice: z.coerce.string().transform((val, ctx) => {
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

export async function createSku(formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
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
        organizationId,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/skus')
    revalidateTag('skus:active')
    revalidateTag('skus:filter')

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
    const organizationId = await requireOrganizationId()
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
      .where(and(eq(skus.id, id), eq(skus.organizationId, organizationId)))
      .returning()

    revalidatePath('/dashboard/master-data/skus')
    revalidateTag('skus:active')
    revalidateTag('skus:filter')

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
    const organizationId = await requireOrganizationId()
    await db
      .update(skus)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(and(eq(skus.id, id), eq(skus.organizationId, organizationId)))

    revalidatePath('/dashboard/master-data/skus')
    revalidateTag('skus:active')
    revalidateTag('skus:filter')

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
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        return await db
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
          .where(
            and(
              isNull(skus.deletedAt),
              organizationId
                ? eq(skus.organizationId, organizationId)
                : undefined
            )
          )
          .orderBy(skus.skuName)
          .limit(500)
      },
      ['skus:list', orgKey],
      { tags: [`skus:${orgKey}`] }
    )

    return await getCached()
  } catch (error) {
    console.error('Failed to fetch SKUs:', error)
    return []
  }
}

interface CSVRow {
  SKU명: string
  메뉴: string
  단가: string
  설명?: string
  활성?: string
}

export async function bulkCreateSkus(rows: CSVRow[]) {
  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    const organizationId = await requireOrganizationId()
    // Fetch all menus for name-to-ID mapping
    const menus = await db
      .select({
        id: menuCategories.id,
        menuName: menuCategories.menuName,
      })
      .from(menuCategories)
      .where(
        and(
          isNull(menuCategories.deletedAt),
          eq(menuCategories.organizationId, organizationId)
        )
      )

    // Create lookup map
    const menuMap = new Map(menus.map((m) => [m.menuName, m.id]))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        // Find menu ID
        const menuId = menuMap.get(row.메뉴)

        if (!menuId) {
          errors.push(`${rowNum}행: 메뉴 '${row.메뉴}'를 찾을 수 없습니다`)
          failedCount++
          continue
        }

        // Parse isActive (default to true)
        let isActive = true
        if (row.활성 !== undefined && row.활성 !== '') {
          const activeStr = String(row.활성).toLowerCase().trim()
          isActive =
            activeStr === 'true' || activeStr === '1' || activeStr === 'yes'
        }

        // Validate data
        const validatedData = skuSchema.parse({
          skuName: row.SKU명,
          menuId,
          unitPrice: row.단가,
          description: row.설명 || '',
          isActive,
        })

        // Insert SKU
        await db.insert(skus).values({
          ...validatedData,
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

    revalidatePath('/dashboard/master-data/skus')
    revalidateTag('skus:active')
    revalidateTag('skus:filter')

    return {
      success: true,
      successCount,
      failedCount,
      errors: errors.slice(0, 20), // Return first 20 errors
    }
  } catch (error) {
    console.error('Failed to bulk create SKUs:', error)
    return {
      success: false,
      successCount,
      failedCount,
      error:
        error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}
