'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import { salesRecords, skus, menuCategories } from '@/lib/db/schema'
import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'
import {
  getAuthorizedStoreIds,
  getOrganizationId,
  assertStoreAccess,
  resolveStoreId,
  assertPermission,
} from '@/lib/auth-context'
import {
  revalidateSalesData,
  revalidateSalesDataMany,
  cacheTags,
} from '@/lib/cache-tags'
import {
  syncSaleToInventory,
  reverseInventoryByReferences,
  fetchRecipesBySkuIds,
} from '@/lib/inventory-sync'

const salesRecordSchema = z.object({
  saleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다'),
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
    await assertPermission('sales', 'write')
    // 클라이언트가 보낸 storeId는 반드시 권한 검증 (없으면 첫 권한 매장)
    const storeId = await resolveStoreId(formData.get('storeId') as string | null)
    const organizationId = await getOrganizationId()

    const rawData = {
      saleDate: formData.get('saleDate'),
      skuId: formData.get('skuId'),
      quantitySold: formData.get('quantitySold'),
    }

    const validatedData = salesRecordSchema.parse(rawData)

    // SKU 조회 (삭제되지 않고 사용자 조직 소속인지 확인)
    const sku = await db.query.skus.findFirst({
      where: and(
        eq(skus.id, validatedData.skuId),
        isNull(skus.deletedAt),
        organizationId
          ? eq(skus.organizationId, organizationId)
          : isNull(skus.organizationId)
      ),
    })

    if (!sku) {
      return {
        success: false,
        error: 'SKU를 찾을 수 없습니다',
      }
    }

    const record = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(salesRecords)
        .values({
          ...validatedData,
          storeId,
          unitPrice: sku.unitPrice,
          createdBy: 'system',
        })
        .returning()

      // 레시피(sku_recipes) 기준 재고 자동 차감
      if (created.storeId) {
        await syncSaleToInventory(tx, {
          storeId: created.storeId,
          skuId: created.skuId,
          quantitySold: Number(created.quantitySold),
          saleId: created.id,
          saleDate: created.saleDate,
        })
      }

      return created
    })

    revalidatePath('/dashboard/sales')
    revalidateSalesData(storeId)

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    logger.error('Failed to create sales record:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '판매 등록에 실패했습니다',
    }
  }
}

export async function updateSalesRecord(id: string, formData: FormData) {
  try {
    await assertPermission('sales', 'write')
    const rawData = {
      saleDate: formData.get('saleDate'),
      skuId: formData.get('skuId'),
      quantitySold: formData.get('quantitySold'),
    }

    const validatedData = salesRecordSchema.parse(rawData)
    const organizationId = await getOrganizationId()

    // 대상 레코드 소유권 검증 (삭제된 레코드는 부활 불가)
    const existing = await db.query.salesRecords.findFirst({
      where: and(eq(salesRecords.id, id), isNull(salesRecords.deletedAt)),
      columns: { storeId: true },
    })
    if (!existing) {
      return { success: false, error: '판매 기록을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    // 변경된 SKU의 판매 단가를 다시 적용 (단가 미갱신으로 매출-재고 불일치 방지)
    const sku = await db.query.skus.findFirst({
      where: and(
        eq(skus.id, validatedData.skuId),
        isNull(skus.deletedAt),
        organizationId
          ? eq(skus.organizationId, organizationId)
          : isNull(skus.organizationId)
      ),
    })
    if (!sku) {
      return { success: false, error: 'SKU를 찾을 수 없습니다' }
    }

    const record = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(salesRecords)
        .set({
          ...validatedData,
          unitPrice: sku.unitPrice,
          updatedAt: new Date(),
          updatedBy: 'system',
        })
        .where(and(eq(salesRecords.id, id), isNull(salesRecords.deletedAt)))
        .returning()

      if (updated?.storeId) {
        // 기존 차감분 원복 후 새 값으로 다시 차감
        await reverseInventoryByReferences(
          tx,
          [id],
          'adjustment',
          '판매 수정 원복',
          updated.saleDate
        )
        await syncSaleToInventory(tx, {
          storeId: updated.storeId,
          skuId: updated.skuId,
          quantitySold: Number(updated.quantitySold),
          saleId: updated.id,
          saleDate: updated.saleDate,
        })
      }

      return updated
    })

    revalidatePath('/dashboard/sales')
    revalidateSalesData(record?.storeId ?? existing.storeId)

    return {
      success: true,
      data: record,
    }
  } catch (error) {
    logger.error('Failed to update sales record:', errorToContext(error))

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : '판매 수정에 실패했습니다',
    }
  }
}

export async function deleteSalesRecord(id: string) {
  try {
    await assertPermission('sales', 'delete')
    // Fetch storeId before soft delete for cache invalidation + 소유권 검증
    const existing = await db.query.salesRecords.findFirst({
      where: and(eq(salesRecords.id, id), isNull(salesRecords.deletedAt)),
      columns: { storeId: true, saleDate: true },
    })
    if (!existing) {
      return { success: false, error: '판매 기록을 찾을 수 없습니다' }
    }
    await assertStoreAccess(existing.storeId)

    await db.transaction(async (tx) => {
      await tx
        .update(salesRecords)
        .set({
          deletedAt: new Date(),
          deletedBy: 'system',
        })
        .where(and(eq(salesRecords.id, id), isNull(salesRecords.deletedAt)))

      // 자동 차감된 재고를 원복 (차감 이력이 없으면 no-op)
      await reverseInventoryByReferences(
        tx,
        [id],
        'adjustment',
        '판매 삭제 원복',
        existing.saleDate ?? new Date().toISOString().slice(0, 10)
      )
    })

    revalidatePath('/dashboard/sales')
    revalidateSalesData(existing.storeId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete sales record:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '판매 삭제에 실패했습니다',
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

    await assertPermission('sales', 'delete')

    // 권한 있는 매장의 미삭제 레코드만 대상으로 좁힌다 (타 조직 레코드 삭제 방지)
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { success: false, error: '접근 가능한 매장이 없습니다' }
    }

    const existingRecords = await db
      .select({ id: salesRecords.id, storeId: salesRecords.storeId })
      .from(salesRecords)
      .where(
        and(
          inArray(salesRecords.id, ids),
          isNull(salesRecords.deletedAt),
          inArray(salesRecords.storeId, authorizedStoreIds)
        )
      )

    const deletableIds = existingRecords.map((r) => r.id)
    if (deletableIds.length === 0) {
      return { success: false, error: '삭제 가능한 항목이 없습니다' }
    }
    const storeIds = existingRecords.map((r) => r.storeId)

    // Perform bulk soft delete + 재고 원복
    const deletedCount = await db.transaction(async (tx) => {
      const result = await tx
        .update(salesRecords)
        .set({
          deletedAt: new Date(),
          deletedBy: 'system',
        })
        .where(
          and(
            inArray(salesRecords.id, deletableIds),
            isNull(salesRecords.deletedAt)
          )
        )
        .returning({ id: salesRecords.id })

      await reverseInventoryByReferences(
        tx,
        result.map((r) => r.id),
        'adjustment',
        '판매 일괄 삭제 원복',
        new Date().toISOString().slice(0, 10)
      )

      return result.length
    })

    revalidatePath('/dashboard/sales')
    revalidateSalesDataMany(storeIds)

    return {
      success: true,
      deletedCount,
    }
  } catch (error) {
    logger.error('Failed to bulk delete sales records:', errorToContext(error))
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '일괄 삭제에 실패했습니다',
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
  page: number,
  authorizedStoreIds: string[]
) {
  // 권한이 있는 매장이 없으면 빈 결과 반환
  if (authorizedStoreIds.length === 0) {
    return { items: [], hasMore: false, page: 1 }
  }

  // Build WHERE conditions
  const conditions = [isNull(salesRecords.deletedAt)]

  // 항상 권한 있는 매장으로 필터링
  conditions.push(inArray(salesRecords.storeId, authorizedStoreIds))

  if (startDate !== 'all' && endDate !== 'all') {
    conditions.push(
      sql`${salesRecords.saleDate} BETWEEN ${startDate}::date AND ${endDate}::date`
    )
  }

  if (skuId !== 'all') {
    conditions.push(eq(salesRecords.skuId, skuId))
  }

  // 특정 매장 필터 (권한 체크는 이미 위에서 함)
  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
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
      unitPrice: salesRecords.unitPrice,
      totalRevenue: salesRecords.totalRevenue,
    })
    .from(salesRecords)
    .leftJoin(skus, eq(salesRecords.skuId, skus.id))
    .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
    .where(and(...conditions))
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
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { items: [], hasMore: false, page: 1 }
    }

    const normalizedStartDate = startDate ?? 'all'
    const normalizedEndDate = endDate ?? 'all'
    const normalizedSkuId = skuId ?? 'all'
    const normalizedStoreId = storeId ?? 'all'
    const normalizedPage = Math.max(1, page)

    // 캐시 키에 사용자의 권한 정보 포함
    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedSalesRecords = unstable_cache(
      () =>
        fetchSalesRecords(
          normalizedStartDate,
          normalizedEndDate,
          normalizedSkuId,
          normalizedStoreId,
          normalizedPage,
          authorizedStoreIds
        ),
      [
        'sales:list:v3', // Cache version bump
        storeKey,
        normalizedStartDate,
        normalizedEndDate,
        normalizedSkuId,
        normalizedStoreId,
        String(normalizedPage),
      ],
      { tags: [cacheTags.sales(normalizedStoreId)] }
    )

    return await getCachedSalesRecords()
  } catch (error) {
    logger.error('Failed to fetch sales records:', errorToContext(error))
    return { items: [], hasMore: false, page: 1 }
  }
}

async function fetchActiveSKUs(organizationId: string) {
  const skuList = await db
    .select({
      id: skus.id,
      skuName: skus.skuName,
      menuName: menuCategories.menuName,
      unitPrice: skus.unitPrice,
    })
    .from(skus)
    .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
    .where(
      and(
        isNull(skus.deletedAt),
        eq(skus.isActive, true),
        eq(skus.organizationId, organizationId)
      )
    )
    .orderBy(menuCategories.menuName, skus.skuName)

  return skuList
}

export async function getActiveSKUs() {
  try {
    const organizationId = await getOrganizationId()
    if (!organizationId) return []

    const getCachedActiveSKUs = unstable_cache(
      () => fetchActiveSKUs(organizationId),
      ['skus:active', organizationId],
      { tags: [cacheTags.skusActive, cacheTags.skus(organizationId)] }
    )

    return await getCachedActiveSKUs()
  } catch (error) {
    logger.error('Failed to fetch SKUs:', errorToContext(error))
    return []
  }
}

async function fetchSKUsForFilter(organizationId: string) {
  const skuList = await db
    .select({
      id: skus.id,
      skuName: skus.skuName,
      menuName: menuCategories.menuName,
    })
    .from(skus)
    .leftJoin(menuCategories, eq(skus.menuId, menuCategories.id))
    .where(
      and(
        isNull(skus.deletedAt),
        eq(skus.isActive, true),
        eq(skus.organizationId, organizationId)
      )
    )
    .orderBy(menuCategories.menuName, skus.skuName)

  return skuList
}

export async function getSKUsForFilter() {
  try {
    const organizationId = await getOrganizationId()
    if (!organizationId) return []

    const getCachedSKUsForFilter = unstable_cache(
      () => fetchSKUsForFilter(organizationId),
      ['skus:filter', organizationId],
      { tags: [cacheTags.skusFilter, cacheTags.skus(organizationId)] }
    )

    return await getCachedSKUsForFilter()
  } catch (error) {
    logger.error('Failed to fetch SKUs for filter:', errorToContext(error))
    return []
  }
}

interface DailySaleInput {
  skuId: string
  quantitySold: string
}

export async function createDailySales(
  saleDate: string,
  sales: DailySaleInput[],
  storeId?: string
) {
  'use server'

  let failedCount = 0
  const errors: string[] = []

  try {
    await assertPermission('sales', 'write')
    // 매장이 지정되면 반드시 권한 검증
    if (storeId) {
      await assertStoreAccess(storeId)
    }
    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return { success: false, error: '조직 정보가 없습니다' }
    }

    // Filter out entries with no quantity
    const validSales = sales.filter(
      (s) =>
        s.quantitySold &&
        s.quantitySold.trim() !== '' &&
        Number(s.quantitySold) > 0
    )

    if (validSales.length === 0) {
      return {
        success: false,
        error: '판매량을 입력해주세요',
      }
    }

    // Get SKU prices (조직 스코프)
    const skuList = await db
      .select({
        id: skus.id,
        skuName: skus.skuName,
        unitPrice: skus.unitPrice,
      })
      .from(skus)
      .where(
        and(
          isNull(skus.deletedAt),
          eq(skus.isActive, true),
          eq(skus.organizationId, organizationId)
        )
      )

    const skuMap = new Map(skuList.map((s) => [s.id, s]))

    // DB 진입 전 전량 검증 (tx 중 abort로 인한 거짓 성공 보고 방지)
    const prepared: Array<{
      validatedData: z.infer<typeof salesRecordSchema>
      unitPrice: string
    }> = []
    for (const sale of validSales) {
      try {
        const sku = skuMap.get(sale.skuId)
        if (!sku) {
          errors.push('SKU를 찾을 수 없습니다')
          failedCount++
          continue
        }
        const validatedData = salesRecordSchema.parse({
          saleDate,
          skuId: sale.skuId,
          quantitySold: sale.quantitySold,
        })
        prepared.push({ validatedData, unitPrice: sku.unitPrice })
      } catch (error) {
        failedCount++
        errors.push(
          error instanceof z.ZodError
            ? error.errors[0].message
            : error instanceof Error
              ? error.message
              : '알 수 없는 오류'
        )
      }
    }

    if (prepared.length === 0) {
      return { success: false, successCount: 0, failedCount, errors }
    }

    // Use transaction for atomicity - 검증된 행만 삽입, DB 오류는 tx 전체 롤백
    await db.transaction(async (tx) => {
      const recipesBySkuId = storeId
        ? await fetchRecipesBySkuIds(
            tx,
            prepared.map((p) => p.validatedData.skuId)
          )
        : new Map()

      for (const { validatedData, unitPrice } of prepared) {
        const [created] = await tx
          .insert(salesRecords)
          .values({
            ...validatedData,
            storeId: storeId || null,
            unitPrice,
            createdBy: 'system',
          })
          .returning()

        if (created.storeId) {
          await syncSaleToInventory(
            tx,
            {
              storeId: created.storeId,
              skuId: created.skuId,
              quantitySold: Number(created.quantitySold),
              saleId: created.id,
              saleDate: created.saleDate,
            },
            recipesBySkuId.get(created.skuId) ?? []
          )
        }
      }
    })

    revalidatePath('/dashboard/sales')
    revalidateSalesData(storeId ?? null)

    return {
      success: true,
      successCount: prepared.length,
      failedCount,
      errors,
    }
  } catch (error) {
    logger.error('Failed to create daily sales:', errorToContext(error))
    return {
      success: false,
      successCount: 0,
      failedCount,
      error:
        error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
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

  let failedCount = 0
  const errors: string[] = []

  try {
    await assertPermission('sales', 'write')
    // 매장이 지정되면 반드시 권한 검증
    if (storeId) {
      await assertStoreAccess(storeId)
    }
    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return { success: false, error: '조직 정보가 없습니다' }
    }

    // Fetch all SKUs for name-to-ID mapping (조직 스코프)
    const skuList = await db
      .select({
        id: skus.id,
        skuName: skus.skuName,
        unitPrice: skus.unitPrice,
      })
      .from(skus)
      .where(
        and(
          isNull(skus.deletedAt),
          eq(skus.isActive, true),
          eq(skus.organizationId, organizationId)
        )
      )

    // Create lookup map
    const skuMap = new Map(
      skuList.map((s) => [s.skuName, { id: s.id, unitPrice: s.unitPrice }])
    )

    // DB 진입 전 전량 검증 (tx 중 abort로 인한 거짓 성공 보고 방지)
    const prepared: Array<{
      validatedData: z.infer<typeof salesRecordSchema>
      unitPrice: string
    }> = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1
      try {
        const skuInfo = skuMap.get(row.SKU)
        if (!skuInfo) {
          errors.push(`${rowNum}행: SKU '${row.SKU}'를 찾을 수 없습니다`)
          failedCount++
          continue
        }
        const validatedData = salesRecordSchema.parse({
          saleDate: row.날짜,
          skuId: skuInfo.id,
          quantitySold: row.판매수량,
        })
        prepared.push({ validatedData, unitPrice: skuInfo.unitPrice })
      } catch (error) {
        failedCount++
        errors.push(
          `${rowNum}행: ${
            error instanceof z.ZodError
              ? error.errors[0].message
              : error instanceof Error
                ? error.message
                : '알 수 없는 오류'
          }`
        )
      }
    }

    if (prepared.length === 0) {
      return {
        success: false,
        successCount: 0,
        failedCount,
        errors: errors.slice(0, 20),
      }
    }

    // Use transaction for atomicity - DB 오류는 tx 전체 롤백
    await db.transaction(async (tx) => {
      const recipesBySkuId = storeId
        ? await fetchRecipesBySkuIds(
            tx,
            prepared.map((p) => p.validatedData.skuId)
          )
        : new Map()

      for (const { validatedData, unitPrice } of prepared) {
        const [created] = await tx
          .insert(salesRecords)
          .values({
            ...validatedData,
            storeId: storeId || null,
            unitPrice,
            createdBy: 'system',
          })
          .returning()

        if (created.storeId) {
          await syncSaleToInventory(
            tx,
            {
              storeId: created.storeId,
              skuId: created.skuId,
              quantitySold: Number(created.quantitySold),
              saleId: created.id,
              saleDate: created.saleDate,
            },
            recipesBySkuId.get(created.skuId) ?? []
          )
        }
      }
    })

    revalidatePath('/dashboard/sales')
    revalidateSalesData(storeId ?? null)

    return {
      success: true,
      successCount: prepared.length,
      failedCount,
      errors: errors.slice(0, 20), // Return first 20 errors
    }
  } catch (error) {
    logger.error('Failed to bulk create sales:', errorToContext(error))
    return {
      success: false,
      successCount: 0,
      failedCount,
      error:
        error instanceof Error ? error.message : '일괄 등록에 실패했습니다',
    }
  }
}

async function fetchSalesTotals(
  startDate: string,
  endDate: string,
  skuId: string,
  storeId: string,
  authorizedStoreIds: string[]
) {
  // 권한이 있는 매장이 없으면 빈 결과 반환
  if (authorizedStoreIds.length === 0) {
    return { totalCount: 0, totalQuantity: 0, totalRevenue: 0 }
  }

  const conditions = [isNull(salesRecords.deletedAt)]

  // 항상 권한 있는 매장으로 필터링
  conditions.push(inArray(salesRecords.storeId, authorizedStoreIds))

  if (startDate !== 'all' && endDate !== 'all') {
    conditions.push(
      sql`${salesRecords.saleDate} BETWEEN ${startDate}::date AND ${endDate}::date`
    )
  }

  if (skuId !== 'all') {
    conditions.push(eq(salesRecords.skuId, skuId))
  }

  if (storeId !== 'all' && authorizedStoreIds.includes(storeId)) {
    conditions.push(eq(salesRecords.storeId, storeId))
  }

  const result = await db
    .select({
      totalCount: sql<number>`COUNT(*)`.mapWith(Number),
      totalQuantity: sql<string>`COALESCE(SUM(${salesRecords.quantitySold}), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(${salesRecords.totalRevenue}), 0)`,
    })
    .from(salesRecords)
    .where(and(...conditions))

  return {
    totalCount: result[0]?.totalCount ?? 0,
    totalQuantity: Number(result[0]?.totalQuantity ?? 0),
    totalRevenue: Number(result[0]?.totalRevenue ?? 0),
  }
}

export async function getSalesTotals(
  startDate?: string,
  endDate?: string,
  skuId?: string,
  storeId?: string
) {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return { totalCount: 0, totalQuantity: 0, totalRevenue: 0 }
    }

    const normalizedStartDate = startDate ?? 'all'
    const normalizedEndDate = endDate ?? 'all'
    const normalizedSkuId = skuId ?? 'all'
    const normalizedStoreId = storeId ?? 'all'

    // 캐시 키에 사용자의 권한 정보 포함
    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedSalesTotals = unstable_cache(
      () =>
        fetchSalesTotals(
          normalizedStartDate,
          normalizedEndDate,
          normalizedSkuId,
          normalizedStoreId,
          authorizedStoreIds
        ),
      [
        'sales:totals',
        storeKey,
        normalizedStartDate,
        normalizedEndDate,
        normalizedSkuId,
        normalizedStoreId,
      ],
      { tags: [cacheTags.sales(normalizedStoreId)] }
    )

    return await getCachedSalesTotals()
  } catch (error) {
    logger.error('Failed to fetch sales totals:', errorToContext(error))
    return { totalCount: 0, totalQuantity: 0, totalRevenue: 0 }
  }
}
