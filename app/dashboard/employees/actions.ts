'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { employees } from '@/lib/db/schema'
import { eq, isNull, desc, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { employeeSchema } from '@/lib/utils/validation'
import {
  getAuthorizedStoreIds,
  assertStoreAccess,
  assertPermission,
} from '@/lib/auth-context'
import { revalidateEmployeeData, cacheTags } from '@/lib/cache-tags'

export async function createEmployee(prevState: any, formData: FormData) {
  try {
    await assertPermission('employees', 'write')
    const storeId = formData.get('storeId') as string | null

    // storeId validation in action (not in Zod schema)
    if (!storeId) {
      return {
        success: false,
        error: '매장을 선택해주세요',
      }
    }
    // 선택한 매장이 권한 매장인지 검증
    await assertStoreAccess(storeId)

    const rawData = {
      employeeName: formData.get('employeeName'),
      hourlyRate: formData.get('hourlyRate'),
      phone: formData.get('phone') || null,
      hireDate: formData.get('hireDate') || null,
      isActive:
        formData.get('isActive') === 'true' ||
        formData.get('isActive') === 'on',
    }

    const validatedData = employeeSchema.parse(rawData)

    const [record] = await db
      .insert(employees)
      .values({
        storeId,
        employeeName: validatedData.employeeName,
        hourlyRate: validatedData.hourlyRate,
        phone: validatedData.phone,
        hireDate: validatedData.hireDate,
        isActive: validatedData.isActive,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/employees')
    revalidateEmployeeData(storeId)

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    logger.error('Failed to create employee:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '직원 등록에 실패했습니다',
    }
  }
}

export async function updateEmployee(id: string, formData: FormData) {
  try {
    await assertPermission('employees', 'write')
    // 대상 직원 소유권 검증
    const existing = await db.query.employees.findFirst({
      where: and(eq(employees.id, id), isNull(employees.deletedAt)),
      columns: { storeId: true },
    })
    if (!existing) {
      return { success: false, error: '직원을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    // Note: storeId is NOT updatable - ignored even if provided
    const rawData = {
      employeeName: formData.get('employeeName'),
      hourlyRate: formData.get('hourlyRate'),
      phone: formData.get('phone') || null,
      hireDate: formData.get('hireDate') || null,
      isActive:
        formData.get('isActive') === 'true' ||
        formData.get('isActive') === 'on',
    }

    const validatedData = employeeSchema.parse(rawData)

    const [record] = await db
      .update(employees)
      .set({
        employeeName: validatedData.employeeName,
        hourlyRate: validatedData.hourlyRate,
        phone: validatedData.phone,
        hireDate: validatedData.hireDate,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
      .returning()

    revalidatePath('/dashboard/employees')
    revalidateEmployeeData(record?.storeId ?? existing.storeId)

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    logger.error('Failed to update employee:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '직원 수정에 실패했습니다',
    }
  }
}

export async function deleteEmployee(id: string) {
  try {
    await assertPermission('employees', 'delete')
    // 대상 직원 소유권 검증
    const existing = await db.query.employees.findFirst({
      where: and(eq(employees.id, id), isNull(employees.deletedAt)),
      columns: { storeId: true },
    })
    if (!existing) {
      return { success: false, error: '직원을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    const [deleted] = await db
      .update(employees)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
      .returning({ storeId: employees.storeId })

    revalidatePath('/dashboard/employees')
    revalidateEmployeeData(deleted?.storeId ?? existing.storeId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete employee:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '직원 삭제에 실패했습니다',
    }
  }
}

export async function getEmployees(storeId?: string) {
  try {
    // If no storeId, return empty array (as per plan requirement)
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
            and(isNull(employees.deletedAt), eq(employees.storeId, storeId))
          )
          .orderBy(desc(employees.createdAt))
          .limit(1000)
      },
      ['employees:list', storeId],
      { tags: [cacheTags.employees(storeId)] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch employees:', errorToContext(error))
    return []
  }
}

// For attendance form - only active employees
export async function getActiveEmployees(storeId?: string) {
  try {
    // If no storeId, return empty array
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
              eq(employees.storeId, storeId),
              eq(employees.isActive, true)
            )
          )
          .orderBy(employees.employeeName)
          .limit(1000)
      },
      ['employees:active', storeId],
      { tags: [cacheTags.employees(storeId)] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch active employees:', errorToContext(error))
    return []
  }
}
