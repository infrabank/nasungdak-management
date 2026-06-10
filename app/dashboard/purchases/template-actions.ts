'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import {
  purchaseTemplates,
  purchaseTemplateItems,
  purchaseTransactions,
  ingredients,
} from '@/lib/db/schema'
import { eq, and, isNull, desc, sql, inArray, or, asc } from 'drizzle-orm'
import { z } from 'zod'
import { getAuthorizedStoreIds } from '@/lib/auth-context'

const templateNameSchema = z
  .string()
  .trim()
  .min(1, '템플릿 이름을 입력해주세요')
  .max(100, '템플릿 이름이 너무 깁니다')

export interface TemplateItemView {
  ingredientId: string
  ingredientName: string
  unit: string | null
  defaultQuantity: number
  latestUnitPrice: number
}

export interface PurchaseTemplateView {
  id: string
  templateName: string
  supplierName: string
  items: TemplateItemView[]
  estimatedTotal: number
}

// 재료별 최근 매입 단가 조회 (없으면 재료 마스터 unitCost 사용)
async function getLatestUnitPrices(
  ingredientIds: string[]
): Promise<Map<string, number>> {
  if (ingredientIds.length === 0) return new Map()

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (ingredient_id)
      ingredient_id,
      unit_price
    FROM purchase_transactions
    WHERE deleted_at IS NULL
      AND ingredient_id IN (${sql.join(
        ingredientIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )})
    ORDER BY ingredient_id, transaction_date DESC, created_at DESC
  `)

  return new Map(
    rows.rows.map((r) => [
      String(r.ingredient_id),
      Number(r.unit_price),
    ])
  )
}

export async function getPurchaseTemplates(): Promise<{
  success: boolean
  data?: PurchaseTemplateView[]
  error?: string
}> {
  try {
    const templates = await db
      .select({
        id: purchaseTemplates.id,
        templateName: purchaseTemplates.templateName,
        supplierName: purchaseTemplates.supplierName,
      })
      .from(purchaseTemplates)
      .where(isNull(purchaseTemplates.deletedAt))
      .orderBy(asc(purchaseTemplates.sortOrder), asc(purchaseTemplates.createdAt))

    if (templates.length === 0) {
      return { success: true, data: [] }
    }

    const templateIds = templates.map((t) => t.id)
    const items = await db
      .select({
        templateId: purchaseTemplateItems.templateId,
        ingredientId: purchaseTemplateItems.ingredientId,
        defaultQuantity: purchaseTemplateItems.defaultQuantity,
        sortOrder: purchaseTemplateItems.sortOrder,
        ingredientName: ingredients.ingredientName,
        unit: ingredients.unit,
        unitCost: ingredients.unitCost,
      })
      .from(purchaseTemplateItems)
      .leftJoin(
        ingredients,
        eq(purchaseTemplateItems.ingredientId, ingredients.id)
      )
      .where(
        and(
          inArray(purchaseTemplateItems.templateId, templateIds),
          isNull(purchaseTemplateItems.deletedAt)
        )
      )
      .orderBy(asc(purchaseTemplateItems.sortOrder))

    const priceMap = await getLatestUnitPrices(
      Array.from(new Set(items.map((i) => i.ingredientId)))
    )

    const data: PurchaseTemplateView[] = templates.map((t) => {
      const templateItems = items
        .filter((i) => i.templateId === t.id)
        .map((i) => ({
          ingredientId: i.ingredientId,
          ingredientName: i.ingredientName ?? '-',
          unit: i.unit,
          defaultQuantity: Number(i.defaultQuantity),
          latestUnitPrice:
            priceMap.get(i.ingredientId) ?? Number(i.unitCost ?? 0),
        }))
      return {
        id: t.id,
        templateName: t.templateName,
        supplierName: t.supplierName,
        items: templateItems,
        estimatedTotal: templateItems.reduce(
          (sum, i) => sum + i.defaultQuantity * i.latestUnitPrice,
          0
        ),
      }
    })

    return { success: true, data }
  } catch (error) {
    logger.error('Failed to fetch purchase templates:', errorToContext(error))
    return { success: false, error: '템플릿 조회에 실패했습니다' }
  }
}

// 가장 최근 매입일의 항목으로 템플릿 생성
export async function createTemplateFromLastPurchaseDay(name: string) {
  try {
    const templateName = templateNameSchema.parse(name)

    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: false, error: '매장 권한이 없습니다' }
    }

    const storeCondition = or(
      inArray(purchaseTransactions.storeId, authorizedStoreIds),
      isNull(purchaseTransactions.storeId)
    )

    const latest = await db
      .select({ d: purchaseTransactions.transactionDate })
      .from(purchaseTransactions)
      .where(and(isNull(purchaseTransactions.deletedAt), storeCondition))
      .orderBy(desc(purchaseTransactions.transactionDate))
      .limit(1)

    if (latest.length === 0) {
      return { success: false, error: '템플릿으로 만들 매입 내역이 없습니다' }
    }

    const rows = await db
      .select({
        ingredientId: purchaseTransactions.ingredientId,
        supplierName: purchaseTransactions.supplierName,
        quantity: purchaseTransactions.quantity,
        storeId: purchaseTransactions.storeId,
      })
      .from(purchaseTransactions)
      .where(
        and(
          eq(purchaseTransactions.transactionDate, latest[0].d),
          isNull(purchaseTransactions.deletedAt),
          storeCondition
        )
      )

    // 같은 재료가 여러 건이면 수량 합산
    const merged = new Map<string, { quantity: number }>()
    for (const row of rows) {
      const existing = merged.get(row.ingredientId)
      if (existing) {
        existing.quantity += Number(row.quantity)
      } else {
        merged.set(row.ingredientId, { quantity: Number(row.quantity) })
      }
    }

    // 거래처: 그날 가장 많이 등장한 거래처 사용
    const supplierCounts = new Map<string, number>()
    for (const row of rows) {
      supplierCounts.set(
        row.supplierName,
        (supplierCounts.get(row.supplierName) ?? 0) + 1
      )
    }
    const supplierName =
      Array.from(supplierCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      '미지정'

    const storeId = rows.find((r) => r.storeId)?.storeId ?? null

    await db.transaction(async (tx) => {
      const [template] = await tx
        .insert(purchaseTemplates)
        .values({
          templateName,
          supplierName,
          storeId,
          createdBy: 'system',
        })
        .returning()

      let order = 0
      for (const [ingredientId, item] of merged) {
        await tx.insert(purchaseTemplateItems).values({
          templateId: template.id,
          ingredientId,
          defaultQuantity: String(item.quantity),
          sortOrder: order++,
          createdBy: 'system',
        })
      }
    })

    revalidatePath('/dashboard/purchases')

    return {
      success: true,
      itemCount: merged.size,
      sourceDate: latest[0].d,
    }
  } catch (error) {
    logger.error('Failed to create purchase template:', errorToContext(error))
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: '템플릿 생성에 실패했습니다' }
  }
}

export async function deletePurchaseTemplate(id: string) {
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(purchaseTemplates)
        .set({ deletedAt: new Date(), deletedBy: 'system' })
        .where(eq(purchaseTemplates.id, id))
      await tx
        .update(purchaseTemplateItems)
        .set({ deletedAt: new Date(), deletedBy: 'system' })
        .where(eq(purchaseTemplateItems.templateId, id))
    })

    revalidatePath('/dashboard/purchases')
    return { success: true }
  } catch (error) {
    logger.error('Failed to delete purchase template:', errorToContext(error))
    return { success: false, error: '템플릿 삭제에 실패했습니다' }
  }
}
