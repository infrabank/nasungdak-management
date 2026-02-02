'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { employees } from '@/lib/db/schema'
import { eq, isNull, desc, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { employeeSchema } from '@/lib/utils/validation'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

export async function createEmployee(prevState: any, formData: FormData) {
  try {
    const storeId = formData.get('storeId') as string | null

    // storeId validation in action (not in Zod schema)
    if (!storeId) {
      return {
        success: false,
        error: '매장을 선택해주세요',
      }
    }

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

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    console.error('Failed to create employee:', error)

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
      .where(eq(employees.id, id))
      .returning()

    revalidatePath('/dashboard/employees')

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    console.error('Failed to update employee:', error)

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
    await db
      .update(employees)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(employees.id, id))

    revalidatePath('/dashboard/employees')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete employee:', error)
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

    const records = await db
      .select()
      .from(employees)
      .where(and(isNull(employees.deletedAt), eq(employees.storeId, storeId)))
      .orderBy(desc(employees.createdAt))
      .limit(1000)

    return records
  } catch (error) {
    console.error('Failed to fetch employees:', error)
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

    const records = await db
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

    return records
  } catch (error) {
    console.error('Failed to fetch active employees:', error)
    return []
  }
}
