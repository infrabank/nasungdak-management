'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { suppliers } from '@/lib/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const supplierSchema = z.object({
  supplierName: z.string().min(1, '공급업체명을 입력해주세요').max(200),
  contactName: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('유효한 이메일 형식이 아닙니다').max(100).optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  businessNumber: z.string().max(20).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function createSupplier(formData: FormData) {
  try {
    const rawData = {
      supplierName: formData.get('supplierName'),
      contactName: formData.get('contactName') || null,
      phone: formData.get('phone') || null,
      email: formData.get('email') || null,
      address: formData.get('address') || null,
      businessNumber: formData.get('businessNumber') || null,
      notes: formData.get('notes') || null,
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = supplierSchema.parse(rawData)

    const [supplier] = await db
      .insert(suppliers)
      .values({
        ...validatedData,
        email: validatedData.email || null,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/master-data/suppliers')

    return {
      success: true,
      data: supplier,
    }
  } catch (error) {
    console.error('Failed to create supplier:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: '공급업체 등록에 실패했습니다',
    }
  }
}

export async function updateSupplier(id: string, formData: FormData) {
  try {
    const rawData = {
      supplierName: formData.get('supplierName'),
      contactName: formData.get('contactName') || null,
      phone: formData.get('phone') || null,
      email: formData.get('email') || null,
      address: formData.get('address') || null,
      businessNumber: formData.get('businessNumber') || null,
      notes: formData.get('notes') || null,
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = supplierSchema.parse(rawData)

    const [supplier] = await db
      .update(suppliers)
      .set({
        ...validatedData,
        email: validatedData.email || null,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(suppliers.id, id))
      .returning()

    revalidatePath('/dashboard/master-data/suppliers')

    return {
      success: true,
      data: supplier,
    }
  } catch (error) {
    console.error('Failed to update supplier:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: '공급업체 수정에 실패했습니다',
    }
  }
}

export async function deleteSupplier(id: string) {
  try {
    await db
      .update(suppliers)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(suppliers.id, id))

    revalidatePath('/dashboard/master-data/suppliers')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete supplier:', error)
    return {
      success: false,
      error: '공급업체 삭제에 실패했습니다',
    }
  }
}

export async function getSuppliers() {
  try {
    const items = await db
      .select()
      .from(suppliers)
      .where(isNull(suppliers.deletedAt))
      .orderBy(suppliers.supplierName)

    return items
  } catch (error) {
    console.error('Failed to fetch suppliers:', error)
    return []
  }
}

export async function getActiveSuppliers() {
  try {
    const items = await db
      .select({
        id: suppliers.id,
        supplierName: suppliers.supplierName,
      })
      .from(suppliers)
      .where(isNull(suppliers.deletedAt))
      .orderBy(suppliers.supplierName)

    return items
  } catch (error) {
    console.error('Failed to fetch active suppliers:', error)
    return []
  }
}
