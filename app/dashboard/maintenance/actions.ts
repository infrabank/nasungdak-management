'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { maintenanceLogSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { maintenanceLogs } from '@/lib/db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  getAuthorizedStoreIds,
  assertStoreAccess,
  resolveStoreId,
} from '@/lib/auth-context'
import {
  revalidateMaintenanceData,
  revalidateOilChangeData,
  cacheTags,
} from '@/lib/cache-tags'
import {
  CLEANING_TASK_TO_FRYER,
  insertOilChangeIfMissing,
} from '@/lib/fryer-maintenance'

export async function createMaintenanceLog(prevState: any, formData: FormData) {
  try {
    // 클라이언트가 보낸 storeId는 반드시 권한 검증 (없으면 첫 권한 매장)
    const storeId = await resolveStoreId(formData.get('storeId') as string | null)

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

    // 튀김기 청소는 기름 교체와 함께 진행되므로 요청 시 교체 이력도 동시 등록 (같은 날짜 중복 방지)
    const fryerType = CLEANING_TASK_TO_FRYER[validatedData.taskType]
    if (fryerType && formData.get('withOilChange') === 'on') {
      const added = await insertOilChangeIfMissing(
        storeId || null,
        validatedData.performedDate,
        fryerType,
        validatedData.notes ?? null
      )
      if (added) {
        revalidatePath('/dashboard/oil-changes')
        revalidateOilChangeData(storeId)
      }
    }

    revalidatePath('/dashboard/maintenance')
    revalidateMaintenanceData(storeId)

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
      { tags: [cacheTags.maintenance(storeId)] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Error fetching maintenance logs:', errorToContext(error))
    return []
  }
}

export async function getMaintenanceLogById(id: string) {
  try {
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) return null

    const result = await db.query.maintenanceLogs.findFirst({
      where: and(eq(maintenanceLogs.id, id), isNull(maintenanceLogs.deletedAt)),
    })
    if (
      result &&
      result.storeId &&
      !authorizedStoreIds.includes(result.storeId)
    ) {
      return null
    }
    return result
  } catch (error) {
    logger.error('Error fetching maintenance log:', errorToContext(error))
    return null
  }
}

export async function updateMaintenanceLog(id: string, formData: FormData) {
  try {
    // 대상 레코드 소유권 검증
    const existing = await db.query.maintenanceLogs.findFirst({
      where: and(eq(maintenanceLogs.id, id), isNull(maintenanceLogs.deletedAt)),
      columns: { storeId: true },
    })
    if (!existing) {
      return { success: false, error: '정비·청소 기록을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

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
    revalidateMaintenanceData(updated?.storeId ?? existing.storeId)

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
    // 대상 레코드 소유권 검증
    const existing = await db.query.maintenanceLogs.findFirst({
      where: and(eq(maintenanceLogs.id, id), isNull(maintenanceLogs.deletedAt)),
      columns: { storeId: true },
    })
    if (!existing) {
      return { success: false, error: '정비·청소 기록을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    const [deleted] = await db
      .update(maintenanceLogs)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(maintenanceLogs.id, id), isNull(maintenanceLogs.deletedAt)))
      .returning({ storeId: maintenanceLogs.storeId })

    revalidatePath('/dashboard/maintenance')
    revalidateMaintenanceData(deleted?.storeId ?? existing.storeId)

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
      { tags: [cacheTags.maintenance(storeKey)] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Error fetching maintenance stats:', errorToContext(error))
    return { recentCount: 0, lastByType: {} as Record<string, string> }
  }
}
