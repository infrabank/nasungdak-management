'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { menuCategories } from '@/lib/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const menuSchema = z.object({
  menuName: z.string().min(1, '메뉴명을 입력해주세요').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

export async function createMenu(formData: FormData) {
  try {
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
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/menus')

    return {
      success: true,
      data: menu,
    }
  } catch (error) {
    console.error('Failed to create menu:', error)

    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '메뉴 등록에 실패했습니다',
    }
  }
}

export async function updateMenu(id: string, formData: FormData) {
  try {
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
      .where(eq(menuCategories.id, id))
      .returning()

    revalidatePath('/dashboard/master-data/menus')

    return {
      success: true,
      data: menu,
    }
  } catch (error) {
    console.error('Failed to update menu:', error)

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
    await db
      .update(menuCategories)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(menuCategories.id, id))

    revalidatePath('/dashboard/master-data/menus')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete menu:', error)
    return {
      success: false,
      error: '메뉴 삭제에 실패했습니다',
    }
  }
}

export async function getMenus() {
  try {
    const menus = await db
      .select()
      .from(menuCategories)
      .where(isNull(menuCategories.deletedAt))
      .orderBy(menuCategories.menuName)

    return menus
  } catch (error) {
    console.error('Failed to fetch menus:', error)
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
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        // Parse isActive (default to true)
        let isActive = true
        if (row.활성 !== undefined && row.활성 !== '') {
          const activeStr = String(row.활성).toLowerCase().trim()
          isActive = activeStr === 'true' || activeStr === '1' || activeStr === 'yes'
        }

        // Validate data
        const validatedData = menuSchema.parse({
          menuName: row.메뉴명,
          description: row.설명 || '',
          isActive,
        })

        // Insert menu
        await db
          .insert(menuCategories)
          .values({
            ...validatedData,
            createdBy: 'system',
          })

        successCount++
      } catch (error) {
        failedCount++
        if (error instanceof z.ZodError) {
          errors.push(`${rowNum}행: ${error.errors[0].message}`)
        } else {
          errors.push(`${rowNum}행: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        }
      }
    }

    revalidatePath('/dashboard/master-data/menus')

    return {
      success: true,
      successCount,
      failedCount,
      errors: errors.slice(0, 20), // Return first 20 errors
    }
  } catch (error) {
    console.error('Failed to bulk create menus:', error)
    return {
      success: false,
      successCount,
      failedCount,
      error: error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}
