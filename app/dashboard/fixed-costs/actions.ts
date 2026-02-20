'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { fixedCosts } from '@/lib/db/schema'
import { eq, isNull, desc, sql, inArray, and } from 'drizzle-orm'
import { z } from 'zod'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

const fixedCostSchema = z.object({
  costDate: z.string().min(1, '날짜를 선택해주세요'),
  costType: z.enum(['인건비', '임대료', '관리비', '기타'], {
    errorMap: () => ({ message: '비용 유형을 선택해주세요' }),
  }),
  costName: z.string().min(1, '비용 항목명을 입력해주세요'),
  amount: z.coerce.number().positive('금액은 0보다 커야 합니다'),
  notes: z.string().optional(),
})

export async function createFixedCost(prevState: any, formData: FormData) {
  try {
    // 권한 검사
    const authorizedStoreIds = await getAuthorizedStoreIds()
    const storeId = formData.get('storeId') as string | null

    if (storeId && !authorizedStoreIds.includes(storeId)) {
      return {
        success: false,
        error: '해당 매장에 대한 권한이 없습니다',
      }
    }

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
        storeId: storeId || null,
        amount: validatedData.amount.toString(),
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/fixed-costs')
    revalidatePath('/dashboard/analysis')
    revalidatePath('/dashboard')
    revalidateTag('fixed-costs:all')
    revalidateTag(`fixed-costs:${storeId ?? 'all'}`)
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    logger.error('Failed to create fixed cost:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '고정비 등록에 실패했습니다',
    }
  }
}

export async function updateFixedCost(id: string, formData: FormData) {
  try {
    // 권한 검사: 레코드가 권한 있는 매장에 속하는지 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

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
      .where(
        and(
          eq(fixedCosts.id, id),
          inArray(fixedCosts.storeId, authorizedStoreIds)
        )
      )
      .returning()

    if (!record) {
      return {
        success: false,
        error: '수정할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    revalidatePath('/dashboard/fixed-costs')
    revalidatePath('/dashboard/analysis')
    revalidatePath('/dashboard')
    revalidateTag('fixed-costs:all')
    if (record?.storeId) {
      revalidateTag(`fixed-costs:${record.storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    logger.error('Failed to update fixed cost:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '고정비 수정에 실패했습니다',
    }
  }
}

export async function deleteFixedCost(id: string) {
  try {
    // 권한 검사: 레코드가 권한 있는 매장에 속하는지 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    const result = await db
      .update(fixedCosts)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(
        and(
          eq(fixedCosts.id, id),
          inArray(fixedCosts.storeId, authorizedStoreIds)
        )
      )
      .returning({ id: fixedCosts.id, storeId: fixedCosts.storeId })

    if (result.length === 0) {
      return {
        success: false,
        error: '삭제할 레코드를 찾을 수 없거나 권한이 없습니다',
      }
    }

    revalidatePath('/dashboard/fixed-costs')
    revalidatePath('/dashboard/analysis')
    revalidatePath('/dashboard')
    revalidateTag('fixed-costs:all')
    if (result[0]?.storeId) {
      revalidateTag(`fixed-costs:${result[0].storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete fixed cost:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '고정비 삭제에 실패했습니다',
    }
  }
}

export async function getFixedCosts(
  startDate?: string,
  endDate?: string,
  storeId?: string
) {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    const normalizedStoreId = storeId ?? 'all'
    const storeKey = authorizedStoreIds.slice().sort().join(',')

    const getCached = unstable_cache(
      async () => {
        const conditions = [isNull(fixedCosts.deletedAt)]

        // 항상 권한 있는 매장으로 필터링
        conditions.push(inArray(fixedCosts.storeId, authorizedStoreIds))

        if (startDate && endDate) {
          conditions.push(
            sql`${fixedCosts.costDate} BETWEEN ${startDate}::date AND ${endDate}::date`
          )
        }

        // 특정 매장 필터 (권한 체크는 이미 위에서 함)
        if (storeId && authorizedStoreIds.includes(storeId)) {
          conditions.push(eq(fixedCosts.storeId, storeId))
        }

        return db
          .select()
          .from(fixedCosts)
          .where(and(...conditions))
          .orderBy(desc(fixedCosts.costDate))
          .limit(1000)
      },
      [
        'fixed-costs:list',
        normalizedStoreId,
        startDate ?? 'all',
        endDate ?? 'all',
        storeKey,
      ],
      { tags: [`fixed-costs:${normalizedStoreId}`] }
    )
    return await getCached()
  } catch (error) {
    logger.error('Failed to fetch fixed costs:', errorToContext(error))
    return []
  }
}
