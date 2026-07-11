'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { attendanceRecords, employees, fixedCosts } from '@/lib/db/schema'
import { eq, isNull, desc, and, sql, gte, lte } from 'drizzle-orm'
import { z } from 'zod'
import { attendanceSchema } from '@/lib/utils/validation'
import { formatDate } from '@/lib/utils/format'
import {
  getAuthorizedStoreIds,
  assertStoreAccess,
  assertPermission,
} from '@/lib/auth-context'
import { revalidateAttendanceData, cacheTags } from '@/lib/cache-tags'

export async function createAttendance(prevState: any, formData: FormData) {
  try {
    const rawData = {
      employeeId: formData.get('employeeId'),
      workDate: formData.get('workDate'),
      workHours: formData.get('workHours'),
      hourlyRate: formData.get('hourlyRate'),
      totalPay: formData.get('totalPay') || '',
      notes: formData.get('notes') || null,
    }

    await assertPermission('attendance', 'write')
    const validatedData = attendanceSchema.parse(rawData)
    const authorizedStoreIds = await getAuthorizedStoreIds()

    // Transaction: create attendance + fixed_cost
    const result = await db.transaction(async (tx) => {
      // 1. Get employee info (with validation)
      const [employee] = await tx
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.id, validatedData.employeeId),
            isNull(employees.deletedAt)
          )
        )
        .limit(1)

      if (!employee) {
        throw new Error('직원을 찾을 수 없습니다')
      }

      if (!employee.isActive) {
        throw new Error('퇴직한 직원입니다')
      }

      if (!employee.storeId) {
        throw new Error('매장에 소속되지 않은 직원입니다')
      }

      // 직원의 매장이 사용자 권한 범위인지 검증 (타 조직 직원으로 허위 근무·인건비 삽입 방지)
      if (!authorizedStoreIds.includes(employee.storeId)) {
        throw new Error('해당 매장에 대한 권한이 없습니다')
      }

      // 2. Calculate totalPay if not provided
      let totalPay = validatedData.totalPay
      if (!totalPay) {
        const calculated = Math.round(
          Number(validatedData.workHours) * Number(validatedData.hourlyRate)
        )
        totalPay = String(calculated)
      }

      // 3. Insert attendance record
      const [attendance] = await tx
        .insert(attendanceRecords)
        .values({
          storeId: employee.storeId,
          employeeId: validatedData.employeeId,
          workDate: validatedData.workDate,
          workHours: validatedData.workHours,
          hourlyRate: validatedData.hourlyRate,
          totalPay,
          notes: validatedData.notes,
          createdBy: 'system',
        })
        .returning()

      // 4. Insert fixed_cost record
      const [fixedCost] = await tx
        .insert(fixedCosts)
        .values({
          storeId: employee.storeId,
          costDate: validatedData.workDate,
          costType: '인건비',
          costName: `${employee.employeeName} 급여 (${validatedData.workDate})`,
          amount: totalPay,
          createdBy: 'system',
        })
        .returning()

      // 5. Link attendance to fixed_cost
      await tx
        .update(attendanceRecords)
        .set({ fixedCostId: fixedCost.id })
        .where(eq(attendanceRecords.id, attendance.id))

      return { attendance, fixedCost }
    })

    // Revalidate paths
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/fixed-costs')
    revalidateAttendanceData(result.attendance.storeId)

    return {
      success: true,
      data: result.attendance,
    }
  } catch (error) {
    logger.error('Failed to create attendance:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '출퇴근 기록 등록에 실패했습니다',
    }
  }
}

export async function updateAttendance(id: string, formData: FormData) {
  try {
    // Note: employeeId is NOT updatable
    const rawData = {
      employeeId: formData.get('employeeId'), // Required for Zod but ignored
      workDate: formData.get('workDate'),
      workHours: formData.get('workHours'),
      hourlyRate: formData.get('hourlyRate'),
      totalPay: formData.get('totalPay') || '',
      notes: formData.get('notes') || null,
    }

    await assertPermission('attendance', 'write')
    const validatedData = attendanceSchema.parse(rawData)

    // 대상 기록 소유권 검증
    const existing = await db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.id, id),
        isNull(attendanceRecords.deletedAt)
      ),
      columns: { storeId: true, fixedCostId: true },
    })
    if (!existing) {
      return { success: false, error: '출퇴근 기록을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    // Calculate totalPay if not provided (same as create)
    let totalPay = validatedData.totalPay
    if (!totalPay) {
      const calculated = Math.round(
        Number(validatedData.workHours) * Number(validatedData.hourlyRate)
      )
      totalPay = String(calculated)
    }

    // 출퇴근 + 연동된 인건비(fixed_cost)를 함께 갱신 (인건비 desync 방지)
    const record = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(attendanceRecords)
        .set({
          workDate: validatedData.workDate,
          workHours: validatedData.workHours,
          hourlyRate: validatedData.hourlyRate,
          totalPay,
          notes: validatedData.notes,
          updatedAt: new Date(),
          updatedBy: 'system',
        })
        .where(
          and(
            eq(attendanceRecords.id, id),
            isNull(attendanceRecords.deletedAt)
          )
        )
        .returning()

      if (existing.fixedCostId) {
        await tx
          .update(fixedCosts)
          .set({
            costDate: validatedData.workDate,
            amount: totalPay,
            updatedAt: new Date(),
            updatedBy: 'system',
          })
          .where(eq(fixedCosts.id, existing.fixedCostId))
      }

      return updated
    })

    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/fixed-costs')
    revalidateAttendanceData(record?.storeId ?? existing.storeId)

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    logger.error('Failed to update attendance:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '출퇴근 기록 수정에 실패했습니다',
    }
  }
}

export async function deleteAttendance(id: string) {
  try {
    await assertPermission('attendance', 'delete')
    // 대상 기록 소유권 검증
    const existing = await db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.id, id),
        isNull(attendanceRecords.deletedAt)
      ),
      columns: { storeId: true, fixedCostId: true },
    })
    if (!existing) {
      return { success: false, error: '출퇴근 기록을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    // 출퇴근 소프트 삭제 + 연동된 인건비(fixed_cost)도 함께 삭제 (인건비 잔존 방지)
    const deleted = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(attendanceRecords)
        .set({
          deletedAt: new Date(),
          deletedBy: 'system',
        })
        .where(
          and(
            eq(attendanceRecords.id, id),
            isNull(attendanceRecords.deletedAt)
          )
        )
        .returning({ storeId: attendanceRecords.storeId })

      if (existing.fixedCostId) {
        await tx
          .update(fixedCosts)
          .set({ deletedAt: new Date(), deletedBy: 'system' })
          .where(eq(fixedCosts.id, existing.fixedCostId))
      }

      return row
    })

    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/fixed-costs')
    revalidateAttendanceData(deleted?.storeId ?? existing.storeId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete attendance:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '출퇴근 기록 삭제에 실패했습니다',
    }
  }
}

interface GetAttendanceParams {
  storeId?: string
  startDate?: string
  endDate?: string
  employeeId?: string
}

export async function getAttendance(params: GetAttendanceParams) {
  try {
    const { storeId, startDate, endDate, employeeId } = params

    // If no storeId, return empty result
    if (!storeId) {
      return { records: [], totalSum: 0, totalHours: 0 }
    }

    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (
      authorizedStoreIds.length === 0 ||
      !authorizedStoreIds.includes(storeId)
    ) {
      return { records: [], totalSum: 0, totalHours: 0 }
    }

    // Default dates: first day of current month to today
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const effectiveStartDate =
      startDate || formatDate(firstDayOfMonth, 'yyyy-MM-dd')
    const effectiveEndDate = endDate || formatDate(today, 'yyyy-MM-dd')

    const getCached = unstable_cache(
      async () => {
        // Build conditions
        const conditions = [
          isNull(attendanceRecords.deletedAt),
          eq(attendanceRecords.storeId, storeId!),
          gte(attendanceRecords.workDate, effectiveStartDate),
          lte(attendanceRecords.workDate, effectiveEndDate),
        ]

        if (employeeId) {
          conditions.push(eq(attendanceRecords.employeeId, employeeId))
        }

        // Query records with LEFT JOIN to employees
        const records = await db
          .select({
            id: attendanceRecords.id,
            storeId: attendanceRecords.storeId,
            employeeId: attendanceRecords.employeeId,
            workDate: attendanceRecords.workDate,
            workHours: attendanceRecords.workHours,
            hourlyRate: attendanceRecords.hourlyRate,
            totalPay: attendanceRecords.totalPay,
            fixedCostId: attendanceRecords.fixedCostId,
            notes: attendanceRecords.notes,
            createdAt: attendanceRecords.createdAt,
            employeeName: employees.employeeName,
            employeeDeleted:
              sql<boolean>`${employees.deletedAt} IS NOT NULL`.as(
                'employee_deleted'
              ),
          })
          .from(attendanceRecords)
          .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
          .where(and(...conditions))
          .orderBy(
            desc(attendanceRecords.workDate),
            desc(attendanceRecords.createdAt)
          )
          .limit(1000)

        // Query totals (all filtered records, not just limit 1000)
        const sumResult = await db
          .select({
            totalSum:
              sql<string>`COALESCE(SUM(${attendanceRecords.totalPay}), 0)`.as(
                'total_sum'
              ),
            totalHours:
              sql<string>`COALESCE(SUM(${attendanceRecords.workHours}), 0)`.as(
                'total_hours'
              ),
          })
          .from(attendanceRecords)
          .where(and(...conditions))

        const totalSum = Number(sumResult[0]?.totalSum) || 0
        const totalHours = Number(sumResult[0]?.totalHours) || 0

        return { records, totalSum, totalHours }
      },
      [
        'attendance:list',
        storeId ?? 'all',
        effectiveStartDate,
        effectiveEndDate,
        employeeId ?? 'all',
      ],
      { tags: [cacheTags.attendance(storeId)] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch attendance:', errorToContext(error))
    return { records: [], totalSum: 0, totalHours: 0 }
  }
}

// For attendance form - get active employees only
export async function getActiveEmployees(storeId?: string) {
  try {
    if (!storeId) {
      return []
    }

    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (
      authorizedStoreIds.length === 0 ||
      !authorizedStoreIds.includes(storeId)
    ) {
      return []
    }

    const getCached = unstable_cache(
      async () => {
        return db
          .select()
          .from(employees)
          .where(
            and(
              isNull(employees.deletedAt),
              eq(employees.storeId, storeId!),
              eq(employees.isActive, true)
            )
          )
          .orderBy(employees.employeeName)
          .limit(1000)
      },
      ['attendance:employees', storeId ?? 'all'],
      { tags: [cacheTags.employees(storeId)] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch active employees:', errorToContext(error))
    return []
  }
}
