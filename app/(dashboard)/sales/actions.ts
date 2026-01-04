'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { salesRecords, skus, menuCategories } from '@/lib/db/schema'
import { eq, isNull, desc } from 'drizzle-orm'
import { z } from 'zod'

const salesRecordSchema = z.object({
  saleDate: z.string().min(1, '날짜를 선택해주세요'),
  skuId: z.string().uuid('SKU를 선택해주세요'),
  quantitySold: z.coerce.number().int().positive('판매량은 1 이상이어야 합니다'),
})

export async function createSalesRecord(formData: FormData) {
  try {
    const rawData = {
      saleDate: formData.get('saleDate'),
      skuId: formData.get('skuId'),
      quantitySold: formData.get('quantitySold'),
    }

    const validatedData = salesRecordSchema.parse(rawData)

    const [record] = await db
      .insert(salesRecords)
      .values({
        ...validatedData,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/sales')

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    console.error('Failed to create sales record:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '판매 등록에 실패했습니다',
    }
  }
}

export async function updateSalesRecord(id: string, formData: FormData) {
  try {
    const rawData = {
      saleDate: formData.get('saleDate'),
      skuId: formData.get('skuId'),
      quantitySold: formData.get('quantitySold'),
    }

    const validatedData = salesRecordSchema.parse(rawData)

    const [record] = await db
      .update(salesRecords)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(salesRecords.id, id))
      .returning()

    revalidatePath('/dashboard/sales')

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    console.error('Failed to update sales record:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '판매 수정에 실패했습니다',
    }
  }
}

export async function deleteSalesRecord(id: string) {
  try {
    await db
      .update(salesRecords)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(salesRecords.id, id))

    revalidatePath('/dashboard/sales')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete sales record:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '판매 삭제에 실패했습니다',
    }
  }
}

export async function getSalesRecords() {
  try {
    const records = await db
      .select({
        id: salesRecords.id,
        saleDate: salesRecords.saleDate,
        skuName: skus.skuName,
        menuName: menuCategories.menuName,
        quantitySold: salesRecords.quantitySold,
        unitPrice: skus.unitPrice,
        totalRevenue: salesRecords.totalRevenue,
      })
      .from(salesRecords)
      .leftJoin(skus, eq(salesRecords.skuId, skus.id))
      .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
      .where(isNull(salesRecords.deletedAt))
      .orderBy(desc(salesRecords.saleDate))
      .limit(100)

    return records
  } catch (error) {
    console.error('Failed to fetch sales records:', error)
    return []
  }
}
