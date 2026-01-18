'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { salesRecords, skus, menuCategories } from '@/lib/db/schema'
import { eq, isNull, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

const salesRecordSchema = z.object({
  saleDate: z.string().min(1, '날짜를 선택해주세요'),
  skuId: z.string().uuid('SKU를 선택해주세요'),
  quantitySold: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num <= 0 || num !== Math.floor(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '판매량은 1 이상의 정수여야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
})

export async function createSalesRecord(formData: FormData) {
  try {
    const storeId = formData.get('storeId') as string | null
    const rawData = {
      saleDate: formData.get('saleDate'),
      skuId: formData.get('skuId'),
      quantitySold: formData.get('quantitySold'),
    }

    const validatedData = salesRecordSchema.parse(rawData)

    // Get SKU unit price
    const sku = await db.query.skus.findFirst({
      where: eq(skus.id, validatedData.skuId),
    })

    if (!sku) {
      return {
        success: false,
        error: 'SKU를 찾을 수 없습니다',
      }
    }

    const [record] = await db
      .insert(salesRecords)
      .values({
        ...validatedData,
        storeId: storeId || null,
        unitPrice: sku.unitPrice,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/sales')
    revalidateTag('sales:all')
    if (storeId) {
      revalidateTag(`sales:${storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

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
    revalidateTag('sales:all')
    if (record.storeId) {
      revalidateTag(`sales:${record.storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

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
    // Fetch storeId before soft delete for cache invalidation
    const existing = await db.query.salesRecords.findFirst({
      where: eq(salesRecords.id, id),
      columns: { storeId: true },
    })

    await db
      .update(salesRecords)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(salesRecords.id, id))

    revalidatePath('/dashboard/sales')
    revalidateTag('sales:all')
    if (existing?.storeId) {
      revalidateTag(`sales:${existing.storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

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

export async function bulkDeleteSalesRecords(ids: string[]) {
  try {
    if (ids.length === 0) {
      return {
        success: false,
        error: '삭제할 항목을 선택해주세요',
      }
    }

    // Fetch storeIds before deletion for cache invalidation
    const existingRecords = await Promise.all(
      ids.map(id => db.query.salesRecords.findFirst({
        where: eq(salesRecords.id, id),
        columns: { storeId: true },
      }))
    )
    const storeIds = new Set(existingRecords.map(r => r?.storeId).filter(Boolean))

    // Perform bulk soft delete using loop for simplicity
    let deletedCount = 0
    for (const id of ids) {
      await db
        .update(salesRecords)
        .set({
          deletedAt: new Date(),
          deletedBy: 'system',
        })
        .where(eq(salesRecords.id, id))
      deletedCount++
    }

    revalidatePath('/dashboard/sales')
    revalidateTag('sales:all')
    for (const storeId of storeIds) {
      revalidateTag(`sales:${storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: true,
      deletedCount,
    }
  } catch (error) {
    console.error('Failed to bulk delete sales records:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '일괄 삭제에 실패했습니다',
    }
  }
}

// Default page size for pagination
const SALES_PAGE_SIZE = 50

async function fetchSalesRecords(
  startDate: string,
  endDate: string,
  skuId: string,
  storeId: string,
  page: number
) {
  // Build WHERE conditions
  const conditions = [isNull(salesRecords.deletedAt)]

  if (startDate !== 'all' && endDate !== 'all') {
    conditions.push(
      sql`${salesRecords.saleDate} BETWEEN ${startDate}::date AND ${endDate}::date`
    )
  }

  if (skuId !== 'all') {
    conditions.push(eq(salesRecords.skuId, skuId))
  }

  if (storeId !== 'all') {
    conditions.push(eq(salesRecords.storeId, storeId))
  }

  const offset = (page - 1) * SALES_PAGE_SIZE

  const records = await db
    .select({
      id: salesRecords.id,
      saleDate: salesRecords.saleDate,
      skuId: salesRecords.skuId,
      skuName: skus.skuName,
      menuName: menuCategories.menuName,
      quantitySold: salesRecords.quantitySold,
      unitPrice: skus.unitPrice,
      totalRevenue: salesRecords.totalRevenue,
    })
    .from(salesRecords)
    .leftJoin(skus, eq(salesRecords.skuId, skus.id))
    .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
    .where(sql`${sql.join(conditions, sql` AND `)}`)
    .orderBy(desc(salesRecords.saleDate))
    .limit(SALES_PAGE_SIZE + 1) // Fetch one extra to check if there are more
    .offset(offset)

  // Determine if there are more pages
  const hasMore = records.length > SALES_PAGE_SIZE
  const items = hasMore ? records.slice(0, SALES_PAGE_SIZE) : records

  return { items, hasMore, page }
}

export async function getSalesRecords(
  startDate?: string,
  endDate?: string,
  skuId?: string,
  storeId?: string,
  page: number = 1
) {
  try {
    const normalizedStartDate = startDate ?? 'all'
    const normalizedEndDate = endDate ?? 'all'
    const normalizedSkuId = skuId ?? 'all'
    const normalizedStoreId = storeId ?? 'all'
    const normalizedPage = Math.max(1, page)

    const getCachedSalesRecords = unstable_cache(
      fetchSalesRecords,
      ['sales:list', normalizedStartDate, normalizedEndDate, normalizedSkuId, normalizedStoreId, String(normalizedPage)],
      { tags: [`sales:${normalizedStoreId}`] }
    )

    return await getCachedSalesRecords(normalizedStartDate, normalizedEndDate, normalizedSkuId, normalizedStoreId, normalizedPage)
  } catch (error) {
    console.error('Failed to fetch sales records:', error)
    return { items: [], hasMore: false, page: 1 }
  }
}

async function fetchActiveSKUs() {
  const skuList = await db
    .select({
      id: skus.id,
      skuName: skus.skuName,
      menuName: menuCategories.menuName,
      unitPrice: skus.unitPrice,
    })
    .from(skus)
    .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
    .where(isNull(skus.deletedAt))
    .orderBy(menuCategories.menuName, skus.skuName)

  return skuList
}

export async function getActiveSKUs() {
  try {
    const getCachedActiveSKUs = unstable_cache(
      fetchActiveSKUs,
      ['skus:active'],
      { tags: ['skus:active'] }
    )

    return await getCachedActiveSKUs()
  } catch (error) {
    console.error('Failed to fetch SKUs:', error)
    return []
  }
}

async function fetchSKUsForFilter() {
  const skuList = await db
    .select({
      id: skus.id,
      skuName: skus.skuName,
      menuName: menuCategories.menuName,
    })
    .from(skus)
    .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
    .where(isNull(skus.deletedAt))
    .orderBy(menuCategories.menuName, skus.skuName)

  return skuList
}

export async function getSKUsForFilter() {
  try {
    const getCachedSKUsForFilter = unstable_cache(
      fetchSKUsForFilter,
      ['skus:filter'],
      { tags: ['skus:filter'] }
    )

    return await getCachedSKUsForFilter()
  } catch (error) {
    console.error('Failed to fetch SKUs for filter:', error)
    return []
  }
}

interface DailySaleInput {
  skuId: string
  quantitySold: string
}

export async function createDailySales(saleDate: string, sales: DailySaleInput[], storeId?: string) {
  'use server'

  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    // Filter out entries with no quantity
    const validSales = sales.filter(s => s.quantitySold && s.quantitySold.trim() !== '' && Number(s.quantitySold) > 0)

    if (validSales.length === 0) {
      return {
        success: false,
        error: '판매량을 입력해주세요',
      }
    }

    // Get SKU prices
    const skuIds = validSales.map(s => s.skuId)
    const skuList = await db
      .select({
        id: skus.id,
        skuName: skus.skuName,
        unitPrice: skus.unitPrice,
      })
      .from(skus)
      .where(isNull(skus.deletedAt))

    const skuMap = new Map(skuList.map(s => [s.id, s]))

    for (let i = 0; i < validSales.length; i++) {
      const sale = validSales[i]

      try {
        const sku = skuMap.get(sale.skuId)

        if (!sku) {
          errors.push(`SKU를 찾을 수 없습니다`)
          failedCount++
          continue
        }

        // Validate data
        const validatedData = salesRecordSchema.parse({
          saleDate,
          skuId: sale.skuId,
          quantitySold: sale.quantitySold,
        })

        // Insert sales record
        await db
          .insert(salesRecords)
          .values({
            ...validatedData,
            storeId: storeId || null,
            unitPrice: sku.unitPrice,
            createdBy: 'system',
          })

        successCount++
      } catch (error) {
        failedCount++
        if (error instanceof z.ZodError) {
          errors.push(`${error.errors[0].message}`)
        } else {
          errors.push(`${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        }
      }
    }

    revalidatePath('/dashboard/sales')
    revalidateTag('sales:all')
    if (storeId) {
      revalidateTag(`sales:${storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: true,
      successCount,
      failedCount,
      errors,
    }
  } catch (error) {
    console.error('Failed to create daily sales:', error)
    return {
      success: false,
      successCount,
      failedCount,
      error: error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}

interface CSVRow {
  날짜: string
  SKU: string
  판매수량: string
  비고?: string
}

export async function bulkCreateSales(rows: CSVRow[], storeId?: string) {
  'use server'

  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    // Fetch all SKUs for name-to-ID mapping
    const skuList = await db
      .select({
        id: skus.id,
        skuName: skus.skuName,
        unitPrice: skus.unitPrice,
      })
      .from(skus)
      .where(isNull(skus.deletedAt))

    // Create lookup map
    const skuMap = new Map(skuList.map(s => [s.skuName, { id: s.id, unitPrice: s.unitPrice }]))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        // Find SKU ID
        const skuInfo = skuMap.get(row.SKU)

        if (!skuInfo) {
          errors.push(`${rowNum}행: SKU '${row.SKU}'를 찾을 수 없습니다`)
          failedCount++
          continue
        }

        // Validate data
        const validatedData = salesRecordSchema.parse({
          saleDate: row.날짜,
          skuId: skuInfo.id,
          quantitySold: row.판매수량,
        })

        // Insert sales record
        await db
          .insert(salesRecords)
          .values({
            ...validatedData,
            storeId: storeId || null,
            unitPrice: skuInfo.unitPrice,
            createdBy: 'system',
          })

        successCount++
      } catch (error) {
        failedCount++
        if (error instanceof z.ZodError) {
          errors.push(`${rowNum}행: ${error.errors[0].message}`)
        } else {
          errors.push(`${rowNum}행: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        }
      }
    }

    revalidatePath('/dashboard/sales')
    revalidateTag('sales:all')
    if (storeId) {
      revalidateTag(`sales:${storeId}`)
    }
    revalidateTag('dashboard:stats')
    revalidateTag('analysis:sku')
    revalidateTag('analysis:monthly')

    return {
      success: true,
      successCount,
      failedCount,
      errors: errors.slice(0, 20), // Return first 20 errors
    }
  } catch (error) {
    console.error('Failed to bulk create sales:', error)
    return {
      success: false,
      successCount,
      failedCount,
      error: error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}
