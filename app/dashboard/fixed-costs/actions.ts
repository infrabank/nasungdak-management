'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { fixedCosts } from '@/lib/db/schema'
import { eq, isNull, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

const fixedCostSchema = z.object({
  costDate: z.string().min(1, '날짜를 선택해주세요'),
  costType: z.enum(['인건비', '임대료', '관리비', '기타'], {
    errorMap: () => ({ message: '비용 유형을 선택해주세요' }),
  }),
  costName: z.string().min(1, '비용 항목명을 입력해주세요'),
  amount: z.coerce.number().positive('금액은 0보다 커야 합니다'),
  notes: z.string().optional(),
})

export async function createFixedCost(
  prevState: any,
  formData: FormData
) {
  try {
    const rawData = {
      costDate: formData.get('costDate'),
      costType: formData.get('costType'),
      costName: formData.get('costName'),
      amount: formData.get('amount'),
      notes: formData.get('notes') || '',
    }

    const validatedData = fixedCostSchema.parse(rawData)

    const [record] = await db
      .insert(fixedCosts)
      .values({
        ...validatedData,
        amount: validatedData.amount.toString(),
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/fixed-costs')

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    console.error('Failed to create fixed cost:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '고정비 등록에 실패했습니다',
    }
  }
}

export async function updateFixedCost(id: string, formData: FormData) {
  try {
    const rawData = {
      costDate: formData.get('costDate'),
      costType: formData.get('costType'),
      costName: formData.get('costName'),
      amount: formData.get('amount'),
      notes: formData.get('notes') || '',
    }

    const validatedData = fixedCostSchema.parse(rawData)

    const [record] = await db
      .update(fixedCosts)
      .set({
        ...validatedData,
        amount: validatedData.amount.toString(),
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(fixedCosts.id, id))
      .returning()

    revalidatePath('/dashboard/fixed-costs')

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    console.error('Failed to update fixed cost:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '고정비 수정에 실패했습니다',
    }
  }
}

export async function deleteFixedCost(id: string) {
  try {
    await db
      .update(fixedCosts)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(fixedCosts.id, id))

    revalidatePath('/dashboard/fixed-costs')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete fixed cost:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '고정비 삭제에 실패했습니다',
    }
  }
}

export async function getFixedCosts(startDate?: string, endDate?: string) {
  try {
    const records = await db
      .select()
      .from(fixedCosts)
      .where(
        startDate && endDate
          ? sql`${fixedCosts.deletedAt} IS NULL AND ${fixedCosts.costDate} BETWEEN ${startDate}::date AND ${endDate}::date`
          : isNull(fixedCosts.deletedAt)
      )
      .orderBy(desc(fixedCosts.costDate))
      .limit(1000)

    return records
  } catch (error) {
    console.error('Failed to fetch fixed costs:', error)
    return []
  }
}
