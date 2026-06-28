'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { maintenanceLogSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { maintenanceLogs } from '@/lib/db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export async function createMaintenanceLog(prevState: any, formData: FormData) {
  try {
    let storeId = formData.get('storeId') as string | null

    // storeId가 없으면 사용자의 권한 있는 첫 번째 매장을 자동 할당
    if (!storeId) {
      const authorizedStoreIds = await getAuthorizedStoreIds()
      if (authorizedStoreIds.length === 0) {
        return { success: false, error: '접근 가능한 매장이 없습니다' }
      }
      storeId = authorizedStoreIds[0]
    }

    const notes = formData.get('notes')
    const rawData = {
      performedDate: formData.get('performedDate'),
      taskType: formData.get('taskType'),
      notes:
        notes && typeof notes === 'string' && notes.trim()
          ? notes.trim()
          : null,
    }

    const validatedData = maintenanceLogSchema.parse(rawData)

    await db.insert(maintenanceLogs).values({
      storeId: storeId || null,
      taskType: validatedData.taskType,
      performedDate: validatedData.performedDate,
      notes: validatedData.notes,
    })

    revalidatePath('/dashboard/maintenance')
    revalidateTag(`maintenance:${storeId ?? 'all'}`)

    return { success: true, error: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    logger.error('Error creating maintenance log:', errorToContext(error))
    return {
      success: false,
      error: '정비·청소 기록 등록 중 오류가 발생했습니다',
    }
  }
}

export async function getMaintenanceLogs(filters?: {
  startDate?: string
  endDate?: string
  taskType?: string
  storeId?: string
}) {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    const storeId = filters?.storeId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        const conditions = [isNull(maintenanceLogs.deletedAt)]

        // 권한 있는 매장 + storeId가 NULL인 레코드도 포함
        conditions.push(
          sql`(${maintenanceLogs.storeId} IN (${sql.join(authorizedStoreIds.map((id) => sql`${id}`), sql`, `)}) OR ${maintenanceLogs.storeId} IS NULL)`
        )

        if (filters?.startDate) {
          conditions.push(
            sql`maintenance_logs.performed_date >= ${filters.startDate}`
          )
        }

        if (filters?.endDate) {
          conditions.push(
            sql`maintenance_logs.performed_date <= ${filters.endDate}`
          )
        }

        if (filters?.taskType) {
          conditions.push(eq(maintenanceLogs.taskType, filters.taskType))
        }

        if (filters?.storeId && authorizedStoreIds.includes(filters.storeId)) {
          conditions.push(eq(maintenanceLogs.storeId, filters.storeId))
        }

        return db
          .select()
          .from(maintenanceLogs)
          .where(and(...conditions))
          .orderBy(desc(maintenanceLogs.performedDate))
          .limit(100)
      },
      [
        'maintenance:list',
        storeId,
        filters?.startDate ?? 'all',
        filters?.endDate ?? 'all',
        filters?.taskType ?? 'all',
      ],
      { tags: [`maintenance:${storeId}`] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Error fetching maintenance logs:', errorToContext(error))
    return []
  }
}

export async function getMaintenanceLogById(id: string) {
  try {
    const result = await db.query.maintenanceLogs.findFirst({
      where: and(eq(maintenanceLogs.id, id), isNull(maintenanceLogs.deletedAt)),
    })
    return result
  } catch (error) {
    logger.error('Error fetching maintenance log:', errorToContext(error))
    return null
  }
}

export async function updateMaintenanceLog(id: string, formData: FormData) {
  try {
    const notes = formData.get('notes')
    const rawData = {
      performedDate: formData.get('performedDate'),
      taskType: formData.get('taskType'),
      notes:
        notes && typeof notes === 'string' && notes.trim()
          ? notes.trim()
          : null,
    }

    const validatedData = maintenanceLogSchema.parse(rawData)

    const [updated] = await db
      .update(maintenanceLogs)
      .set({
        performedDate: validatedData.performedDate,
        taskType: validatedData.taskType,
        notes: validatedData.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(maintenanceLogs.id, id), isNull(maintenanceLogs.deletedAt)))
      .returning({ storeId: maintenanceLogs.storeId })

    revalidatePath('/dashboard/maintenance')
    revalidateTag(`maintenance:${updated?.storeId ?? 'all'}`)

    return { success: true, error: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    logger.error('Error updating maintenance log:', errorToContext(error))
    return {
      success: false,
      error: '정비·청소 기록 수정 중 오류가 발생했습니다',
    }
  }
}

export async function deleteMaintenanceLog(id: string) {
  try {
    const [deleted] = await db
      .update(maintenanceLogs)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(maintenanceLogs.id, id))
      .returning({ storeId: maintenanceLogs.storeId })

    revalidatePath('/dashboard/maintenance')
    revalidateTag(`maintenance:${deleted?.storeId ?? 'all'}`)

    return { success: true, error: undefined }
  } catch (error) {
    logger.error('Error deleting maintenance log:', errorToContext(error))
    return {
      success: false,
      error: '정비·청소 기록 삭제 중 오류가 발생했습니다',
    }
  }
}

// 항목별 마지막 수행일 통계
export async function getMaintenanceStats(storeId?: string) {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { recentCount: 0, lastByType: {} as Record<string, string> }
    }

    const storeKey = storeId ?? 'all'

    const getCached = unstable_cache(
      async () => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const baseStoreCond = sql`(${maintenanceLogs.storeId} IN (${sql.join(authorizedStoreIds.map((id) => sql`${id}`), sql`, `)}) OR ${maintenanceLogs.storeId} IS NULL)`

        const recentConditions = [
          isNull(maintenanceLogs.deletedAt),
          sql`maintenance_logs.performed_date >= ${thirtyDaysAgo.toISOString().split('T')[0]}`,
          baseStoreCond,
        ]
        if (storeId && authorizedStoreIds.includes(storeId)) {
          recentConditions.push(eq(maintenanceLogs.storeId, storeId))
        }

        const recent = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(maintenanceLogs)
          .where(and(...recentConditions))

        const lastConditions = [isNull(maintenanceLogs.deletedAt), baseStoreCond]
        if (storeId && authorizedStoreIds.includes(storeId)) {
          lastConditions.push(eq(maintenanceLogs.storeId, storeId))
        }

        const logs = await db.query.maintenanceLogs.findMany({
          where: and(...lastConditions),
          orderBy: [desc(maintenanceLogs.performedDate)],
          limit: 200,
        })

        const lastByType = logs.reduce(
          (acc, log) => {
            if (
              !acc[log.taskType] ||
              new Date(log.performedDate) > new Date(acc[log.taskType])
            ) {
              acc[log.taskType] = log.performedDate
            }
            return acc
          },
          {} as Record<string, string>
        )

        return { recentCount: recent[0]?.count ?? 0, lastByType }
      },
      ['maintenance:stats', storeKey],
      { tags: [`maintenance:${storeKey}`] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Error fetching maintenance stats:', errorToContext(error))
    return { recentCount: 0, lastByType: {} as Record<string, string> }
  }
}
