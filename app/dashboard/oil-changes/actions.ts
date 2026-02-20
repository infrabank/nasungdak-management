'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { oilChangeSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { oilChangeHistory } from '@/lib/db/schema'
import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export async function createOilChange(prevState: any, formData: FormData) {
  try {
    const storeId = formData.get('storeId') as string | null
    const notes = formData.get('notes')
    const rawData = {
      changeDate: formData.get('changeDate'),
      fryerType: formData.get('fryerType'),
      notes:
        notes && typeof notes === 'string' && notes.trim()
          ? notes.trim()
          : null,
    }

    const validatedData = oilChangeSchema.parse(rawData)

    // Build conditions for finding last change
    const lastChangeConditions = [
      eq(oilChangeHistory.fryerType, validatedData.fryerType),
      isNull(oilChangeHistory.deletedAt),
    ]
    if (storeId) {
      lastChangeConditions.push(eq(oilChangeHistory.storeId, storeId))
    }

    // Calculate usage days automatically based on previous oil change history
    const lastChange = await db.query.oilChangeHistory.findFirst({
      where: and(...lastChangeConditions),
      orderBy: [desc(oilChangeHistory.changeDate)],
    })

    let usageDays = 0
    if (lastChange && lastChange.changeDate) {
      const daysDiff = Math.floor(
        (new Date(validatedData.changeDate).getTime() -
          new Date(lastChange.changeDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      usageDays = Math.max(0, daysDiff)
    }

    // Insert oil change record
    await db.insert(oilChangeHistory).values({
      storeId: storeId || null,
      changeDate: validatedData.changeDate,
      fryerType: validatedData.fryerType,
      oilType: '해바라기씨유',
      quantity: '0',
      supplierName: '자동 기록',
      unitPrice: '0',
      previousOilUsage: null,
      usageDays: usageDays,
      notes: validatedData.notes,
    })

    revalidatePath('/dashboard/oil-changes')
    revalidateTag(`oil-changes:${storeId ?? 'all'}`)

    return { success: true, error: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('Error creating oil change:', error)
    return {
      success: false,
      error: '기름 교체 이력 등록 중 오류가 발생했습니다',
    }
  }
}

export async function getOilChanges(filters?: {
  startDate?: string
  endDate?: string
  fryerType?: string
  storeId?: string
}) {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    const storeId = filters?.storeId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        const conditions = [isNull(oilChangeHistory.deletedAt)]

        // 항상 권한 있는 매장으로 필터링
        conditions.push(inArray(oilChangeHistory.storeId, authorizedStoreIds))

        if (filters?.startDate) {
          conditions.push(
            sql`oil_change_history.change_date >= ${filters.startDate}`
          )
        }

        if (filters?.endDate) {
          conditions.push(
            sql`oil_change_history.change_date <= ${filters.endDate}`
          )
        }

        if (filters?.fryerType) {
          conditions.push(eq(oilChangeHistory.fryerType, filters.fryerType))
        }

        // 특정 매장 필터 (권한 체크는 이미 위에서 함)
        if (filters?.storeId && authorizedStoreIds.includes(filters.storeId)) {
          conditions.push(eq(oilChangeHistory.storeId, filters.storeId))
        }

        return db
          .select()
          .from(oilChangeHistory)
          .where(and(...conditions))
          .orderBy(desc(oilChangeHistory.changeDate))
          .limit(100)
      },
      [
        'oil-changes:list',
        storeId,
        filters?.startDate ?? 'all',
        filters?.endDate ?? 'all',
        filters?.fryerType ?? 'all',
      ],
      { tags: [`oil-changes:${storeId}`] }
    )
    return await getCached()
  } catch (error) {
    console.error('Error fetching oil changes:', error)
    return []
  }
}

export async function getOilChangeById(id: string) {
  try {
    const result = await db.query.oilChangeHistory.findFirst({
      where: and(
        eq(oilChangeHistory.id, id),
        isNull(oilChangeHistory.deletedAt)
      ),
    })
    return result
  } catch (error) {
    console.error('Error fetching oil change:', error)
    return null
  }
}

export async function updateOilChange(id: string, formData: FormData) {
  try {
    const notes = formData.get('notes')
    const rawData = {
      changeDate: formData.get('changeDate'),
      fryerType: formData.get('fryerType'),
      notes:
        notes && typeof notes === 'string' && notes.trim()
          ? notes.trim()
          : null,
    }

    const validatedData = oilChangeSchema.parse(rawData)

    // Calculate usage days automatically based on previous oil change history (excluding current record)
    const previousChange = await db.query.oilChangeHistory.findFirst({
      where: and(
        eq(oilChangeHistory.fryerType, validatedData.fryerType),
        isNull(oilChangeHistory.deletedAt),
        sql`${oilChangeHistory.id} != ${id}`
      ),
      orderBy: [desc(oilChangeHistory.changeDate)],
    })

    let usageDays = 0
    if (previousChange && previousChange.changeDate) {
      const daysDiff = Math.floor(
        (new Date(validatedData.changeDate).getTime() -
          new Date(previousChange.changeDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      usageDays = Math.max(0, daysDiff)
    }

    const [updated] = await db
      .update(oilChangeHistory)
      .set({
        changeDate: validatedData.changeDate,
        fryerType: validatedData.fryerType,
        usageDays: usageDays,
        notes: validatedData.notes,
        updatedAt: new Date(),
      })
      .where(
        and(eq(oilChangeHistory.id, id), isNull(oilChangeHistory.deletedAt))
      )
      .returning({ storeId: oilChangeHistory.storeId })

    revalidatePath('/dashboard/oil-changes')
    revalidateTag(`oil-changes:${updated?.storeId ?? 'all'}`)

    return { success: true, error: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('Error updating oil change:', error)
    return {
      success: false,
      error: '기름 교체 이력 수정 중 오류가 발생했습니다',
    }
  }
}

export async function deleteOilChange(id: string) {
  try {
    const [deleted] = await db
      .update(oilChangeHistory)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(oilChangeHistory.id, id))
      .returning({ storeId: oilChangeHistory.storeId })

    revalidatePath('/dashboard/oil-changes')
    revalidateTag(`oil-changes:${deleted?.storeId ?? 'all'}`)

    return { success: true, error: undefined }
  } catch (error) {
    console.error('Error deleting oil change:', error)
    return {
      success: false,
      error: '기름 교체 이력 삭제 중 오류가 발생했습니다',
    }
  }
}

export async function getOilChangeStats(storeId?: string) {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        recentChanges: { count: 0 },
        lastChangeByFryer: {},
      }
    }

    const storeKey = storeId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        // Get total oil changes in last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const recentConditions = [
          isNull(oilChangeHistory.deletedAt),
          sql`oil_change_history.change_date >= ${thirtyDaysAgo.toISOString().split('T')[0]}`,
          inArray(oilChangeHistory.storeId, authorizedStoreIds),
        ]

        if (storeId && authorizedStoreIds.includes(storeId)) {
          recentConditions.push(eq(oilChangeHistory.storeId, storeId))
        }

        const recentChanges = await db
          .select({
            count: sql`COUNT(*)`.mapWith(Number),
          })
          .from(oilChangeHistory)
          .where(and(...recentConditions))

        // Get last change date for each fryer type
        const lastChangeConditions = [
          isNull(oilChangeHistory.deletedAt),
          inArray(oilChangeHistory.storeId, authorizedStoreIds),
        ]
        if (storeId && authorizedStoreIds.includes(storeId)) {
          lastChangeConditions.push(eq(oilChangeHistory.storeId, storeId))
        }

        const lastChanges = await db.query.oilChangeHistory.findMany({
          where: and(...lastChangeConditions),
          orderBy: [desc(oilChangeHistory.changeDate)],
          limit: 10,
        })

        const lastChangeByFryer = lastChanges.reduce(
          (acc, change) => {
            if (
              !acc[change.fryerType] ||
              new Date(change.changeDate) >
                new Date(acc[change.fryerType].changeDate)
            ) {
              acc[change.fryerType] = change
            }
            return acc
          },
          {} as Record<string, any>
        )

        return {
          recentChanges: recentChanges[0] || { count: 0 },
          lastChangeByFryer,
        }
      },
      ['oil-changes:stats', storeKey],
      { tags: [`oil-changes:${storeKey}`] }
    )
    return await getCached()
  } catch (error) {
    console.error('Error fetching oil change stats:', error)
    return {
      recentChanges: { count: 0 },
      lastChangeByFryer: {},
    }
  }
}
