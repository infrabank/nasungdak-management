'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { menuCategories } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { z } from 'zod'
import { getOrganizationId, requireOrganizationId } from '@/lib/auth-context'
import { cacheTags, revalidateMenuData } from '@/lib/cache-tags'

const menuSchema = z.object({
  menuName: z.string().min(1, '메뉴명을 입력해주세요').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

export async function createMenu(formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const description = formData.get('description')
    const rawData = {
      menuName: formData.get('menuName'),
      description: description ? String(description) : undefined,
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = menuSchema.parse(rawData)

    const [menu] = await db
      .insert(menuCategories)
      .values({
        ...validatedData,
        organizationId,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/menus')
    revalidateMenuData(organizationId)

    return {
      success: true,
      data: menu,
    }
  } catch (error) {
    logger.error('Failed to create menu:', errorToContext(error))

    if (error instanceof z.ZodError) {
      logger.error('Validation errors:', { errors: error.errors })
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '메뉴 등록에 실패했습니다',
    }
  }
}

export async function updateMenu(id: string, formData: FormData) {
  try {
    const organizationId = await requireOrganizationId()
    const rawData = {
      menuName: formData.get('menuName'),
      description: formData.get('description') || '',
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = menuSchema.parse(rawData)

    const [menu] = await db
      .update(menuCategories)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(
        and(
          eq(menuCategories.id, id),
          eq(menuCategories.organizationId, organizationId)
        )
      )
      .returning()

    revalidatePath('/dashboard/master-data/menus')
    revalidateMenuData(organizationId)

    return {
      success: true,
      data: menu,
    }
  } catch (error) {
    logger.error('Failed to update menu:', errorToContext(error))

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

export async function deleteMenu(id: string) {
  try {
    const organizationId = await requireOrganizationId()
    await db
      .update(menuCategories)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(
        and(
          eq(menuCategories.id, id),
          eq(menuCategories.organizationId, organizationId)
        )
      )

    revalidatePath('/dashboard/master-data/menus')
    revalidateMenuData(organizationId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete menu:', errorToContext(error))
    return {
      success: false,
      error: '메뉴 삭제에 실패했습니다',
    }
  }
}

export async function getMenus() {
  try {
    const organizationId = await getOrganizationId()
    const orgKey = organizationId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        return await db
          .select()
          .from(menuCategories)
          .where(
            and(
              isNull(menuCategories.deletedAt),
              organizationId
                ? eq(menuCategories.organizationId, organizationId)
                : undefined
            )
          )
          .orderBy(menuCategories.menuName)
          .limit(500)
      },
      ['menus:list', orgKey],
      { tags: [cacheTags.menus(organizationId)] }
    )

    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch menus:', errorToContext(error))
    return []
  }
}

interface CSVRow {
  메뉴명: string
  설명?: string
  활성?: string
}

export async function bulkCreateMenus(rows: CSVRow[]) {
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
        const validatedData = menuSchema.parse({
          menuName: row.메뉴명,
          description: row.설명 || '',
          isActive,
        })

        // Insert menu
        await db.insert(menuCategories).values({
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

    revalidatePath('/dashboard/master-data/menus')
    revalidateMenuData(organizationId)

    return {
      success: true,
      successCount,
      failedCount,
      errors: errors.slice(0, 20), // Return first 20 errors
    }
  } catch (error) {
    logger.error('Failed to bulk create menus:', errorToContext(error))
    return {
      success: false,
      successCount,
      failedCount,
      error:
        error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}
