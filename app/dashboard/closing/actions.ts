'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import {
  dailyClosings,
  salesRecords,
  skus,
  menuCategories,
} from '@/lib/db/schema'
import { eq, and, isNull, desc, sql, lt } from 'drizzle-orm'
import { z } from 'zod'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

const moneySchema = z.coerce
  .number()
  .min(0, '0 이상의 금액을 입력해주세요')
  .max(999_999_999, '금액이 너무 큽니다')

const closingSchema = z.object({
  closingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜를 선택해주세요'),
  cardSales: moneySchema,
  cashSales: moneySchema,
  deliverySales: moneySchema,
  memo: z.string().max(2000, '메모가 너무 깁니다').optional(),
})

export interface ClosingSkuRow {
  skuId: string
  skuName: string | null
  menuName: string | null
  unitPrice: string
  currentQty: number
  lastQty: number
}

export interface ClosingFormData {
  closing: {
    cardSales: string
    cashSales: string
    deliverySales: string
    memo: string | null
  } | null
  skuRows: ClosingSkuRow[]
  lastSaleDate: string | null
}

async function assertStoreAccess(storeId: string) {
  const authorizedStoreIds = await getAuthorizedStoreIds()
  if (!authorizedStoreIds.includes(storeId)) {
    throw new Error('해당 매장에 대한 권한이 없습니다')
  }
}

export async function getClosingFormData(
  storeId: string,
  date: string
): Promise<ClosingFormData> {
  await assertStoreAccess(storeId)

  const [closing, skuList, currentRows, lastDateRow] = await Promise.all([
    db.query.dailyClosings.findFirst({
      where: and(
        eq(dailyClosings.storeId, storeId),
        eq(dailyClosings.closingDate, date),
        isNull(dailyClosings.deletedAt)
      ),
    }),
    db
      .select({
        id: skus.id,
        skuName: skus.skuName,
        menuName: menuCategories.menuName,
        unitPrice: skus.unitPrice,
      })
      .from(skus)
      .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
      .where(and(isNull(skus.deletedAt), eq(skus.isActive, true)))
      .orderBy(skus.skuName),
    db
      .select({
        skuId: salesRecords.skuId,
        qty: sql<string>`COALESCE(SUM(${salesRecords.quantitySold}), 0)`,
      })
      .from(salesRecords)
      .where(
        and(
          eq(salesRecords.storeId, storeId),
          eq(salesRecords.saleDate, date),
          isNull(salesRecords.deletedAt)
        )
      )
      .groupBy(salesRecords.skuId),
    db
      .select({ d: salesRecords.saleDate })
      .from(salesRecords)
      .where(
        and(
          eq(salesRecords.storeId, storeId),
          lt(salesRecords.saleDate, date),
          isNull(salesRecords.deletedAt)
        )
      )
      .orderBy(desc(salesRecords.saleDate))
      .limit(1),
  ])

  const lastSaleDate = lastDateRow[0]?.d ?? null

  // 지난 영업일 판매량 (직전 판매 기록이 있는 날 기준)
  let lastQtyMap = new Map<string, number>()
  if (lastSaleDate) {
    const lastRows = await db
      .select({
        skuId: salesRecords.skuId,
        qty: sql<string>`COALESCE(SUM(${salesRecords.quantitySold}), 0)`,
      })
      .from(salesRecords)
      .where(
        and(
          eq(salesRecords.storeId, storeId),
          eq(salesRecords.saleDate, lastSaleDate),
          isNull(salesRecords.deletedAt)
        )
      )
      .groupBy(salesRecords.skuId)
    lastQtyMap = new Map(lastRows.map((r) => [r.skuId, Number(r.qty)]))
  }

  const currentQtyMap = new Map(
    currentRows.map((r) => [r.skuId, Number(r.qty)])
  )

  const skuRows: ClosingSkuRow[] = skuList
    .map((s) => ({
      skuId: s.id,
      skuName: s.skuName,
      menuName: s.menuName,
      unitPrice: s.unitPrice,
      currentQty: currentQtyMap.get(s.id) ?? 0,
      lastQty: lastQtyMap.get(s.id) ?? 0,
    }))
    // 지난 영업일에 팔린 메뉴를 위로 정렬
    .sort((a, b) => b.lastQty - a.lastQty || (a.skuName ?? '').localeCompare(b.skuName ?? ''))

  return {
    closing: closing
      ? {
          cardSales: closing.cardSales,
          cashSales: closing.cashSales,
          deliverySales: closing.deliverySales,
          memo: closing.memo,
        }
      : null,
    skuRows,
    lastSaleDate,
  }
}

export interface SaveClosingInput {
  storeId: string
  closingDate: string
  cardSales: string
  cashSales: string
  deliverySales: string
  memo?: string
  quantities: Array<{ skuId: string; quantitySold: string }>
}

export async function saveDailyClosing(input: SaveClosingInput) {
  try {
    await assertStoreAccess(input.storeId)

    const validated = closingSchema.parse({
      closingDate: input.closingDate,
      cardSales: input.cardSales || '0',
      cashSales: input.cashSales || '0',
      deliverySales: input.deliverySales || '0',
      memo: input.memo?.trim() || undefined,
    })

    // 판매량 검증: 0 이상 정수만 허용, 0은 제외
    const validQuantities: Array<{ skuId: string; quantitySold: number }> = []
    for (const q of input.quantities) {
      if (!q.quantitySold || q.quantitySold.trim() === '') continue
      const num = Number(q.quantitySold)
      if (isNaN(num) || num < 0 || num !== Math.floor(num)) {
        return {
          success: false,
          error: '판매량은 0 이상의 정수여야 합니다',
        }
      }
      if (num > 0) {
        validQuantities.push({ skuId: q.skuId, quantitySold: num })
      }
    }

    // SKU 단가 조회
    const skuList = await db
      .select({ id: skus.id, unitPrice: skus.unitPrice })
      .from(skus)
      .where(and(isNull(skus.deletedAt), eq(skus.isActive, true)))
    const skuMap = new Map(skuList.map((s) => [s.id, s]))

    for (const q of validQuantities) {
      if (!skuMap.has(q.skuId)) {
        return { success: false, error: 'SKU를 찾을 수 없습니다' }
      }
    }

    await db.transaction(async (tx) => {
      // 마감은 해당 날짜 판매량의 확정값임: 기존 기록을 대체함
      await tx
        .update(salesRecords)
        .set({ deletedAt: new Date(), deletedBy: 'daily-closing' })
        .where(
          and(
            eq(salesRecords.storeId, input.storeId),
            eq(salesRecords.saleDate, validated.closingDate),
            isNull(salesRecords.deletedAt)
          )
        )

      for (const q of validQuantities) {
        const sku = skuMap.get(q.skuId)!
        await tx.insert(salesRecords).values({
          storeId: input.storeId,
          saleDate: validated.closingDate,
          skuId: q.skuId,
          quantitySold: String(q.quantitySold),
          unitPrice: sku.unitPrice,
          createdBy: 'daily-closing',
        })
      }

      // 마감 upsert
      const existing = await tx.query.dailyClosings.findFirst({
        where: and(
          eq(dailyClosings.storeId, input.storeId),
          eq(dailyClosings.closingDate, validated.closingDate),
          isNull(dailyClosings.deletedAt)
        ),
      })

      const closingValues = {
        cardSales: String(validated.cardSales),
        cashSales: String(validated.cashSales),
        deliverySales: String(validated.deliverySales),
        memo: validated.memo ?? null,
      }

      if (existing) {
        await tx
          .update(dailyClosings)
          .set({
            ...closingValues,
            updatedAt: new Date(),
            updatedBy: 'system',
          })
          .where(eq(dailyClosings.id, existing.id))
      } else {
        await tx.insert(dailyClosings).values({
          storeId: input.storeId,
          closingDate: validated.closingDate,
          ...closingValues,
          createdBy: 'system',
        })
      }
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/closing')
    revalidateTag('sales:all')
    revalidateTag(`sales:${input.storeId}`)
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    const salesTotal = validQuantities.reduce(
      (sum, q) => sum + q.quantitySold * Number(skuMap.get(q.skuId)!.unitPrice),
      0
    )
    const paymentTotal =
      validated.cardSales + validated.cashSales + validated.deliverySales

    return {
      success: true,
      salesTotal,
      paymentTotal,
      recordCount: validQuantities.length,
    }
  } catch (error) {
    logger.error('Failed to save daily closing:', errorToContext(error))
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '마감 저장에 실패했습니다',
    }
  }
}
