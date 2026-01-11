'use server'

import { revalidatePath } from 'next/cache'
import { tossSkuMappingSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { tossSkuMappings, stores, skus } from '@/lib/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { z } from 'zod'

export async function createTossMapping(formData: FormData) {
  try {
    const rawData = {
      storeId: formData.get('storeId'),
      tossItemCode: formData.get('tossItemCode'),
      tossItemName: formData.get('tossItemName') || null,
      skuId: formData.get('skuId') || null,
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = tossSkuMappingSchema.parse(rawData)

    // Check if toss item code already exists for same store
    const existingMapping = await db.query.tossSkuMappings.findFirst({
      where: and(
        eq(tossSkuMappings.storeId, validatedData.storeId),
        eq(tossSkuMappings.tossItemCode, validatedData.tossItemCode),
        isNull(tossSkuMappings.deletedAt)
      ),
    })

    if (existingMapping) {
      return {
        success: false,
        error: '이미 사용 중인 토스 품목 코드입니다',
      }
    }

    const [mapping] = await db
      .insert(tossSkuMappings)
      .values({
        ...validatedData,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/toss-mappings')

    return {
      success: true,
      data: mapping,
    }
  } catch (error) {
    console.error('Failed to create toss mapping:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '토스 매핑 등록에 실패했습니다',
    }
  }
}

export async function updateTossMapping(id: string, formData: FormData) {
  try {
    const rawData = {
      storeId: formData.get('storeId'),
      tossItemCode: formData.get('tossItemCode'),
      tossItemName: formData.get('tossItemName') || null,
      skuId: formData.get('skuId') || null,
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = tossSkuMappingSchema.parse(rawData)

    // Check if toss item code already exists for same store (different ID)
    const existingMapping = await db.query.tossSkuMappings.findFirst({
      where: and(
        eq(tossSkuMappings.storeId, validatedData.storeId),
        eq(tossSkuMappings.tossItemCode, validatedData.tossItemCode),
        isNull(tossSkuMappings.deletedAt)
      ),
    })

    if (existingMapping && existingMapping.id !== id) {
      return {
        success: false,
        error: '이미 사용 중인 토스 품목 코드입니다',
      }
    }

    const [mapping] = await db
      .update(tossSkuMappings)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(tossSkuMappings.id, id))
      .returning()

    revalidatePath('/dashboard/toss-mappings')

    return {
      success: true,
      data: mapping,
    }
  } catch (error) {
    console.error('Failed to update toss mapping:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '토스 매핑 수정에 실패했습니다',
    }
  }
}

export async function deleteTossMapping(id: string) {
  try {
    await db
      .update(tossSkuMappings)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(tossSkuMappings.id, id))

    revalidatePath('/dashboard/toss-mappings')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete toss mapping:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '토스 매핑 삭제에 실패했습니다',
    }
  }
}

export async function getTossMappings(storeId?: string) {
  try {
    const conditions = [isNull(tossSkuMappings.deletedAt)]

    if (storeId) {
      conditions.push(eq(tossSkuMappings.storeId, storeId))
    }

    const mappings = await db
      .select({
        id: tossSkuMappings.id,
        storeId: tossSkuMappings.storeId,
        storeName: stores.storeName,
        storeCode: stores.storeCode,
        tossItemCode: tossSkuMappings.tossItemCode,
        tossItemName: tossSkuMappings.tossItemName,
        skuId: tossSkuMappings.skuId,
        skuName: skus.skuName,
        isActive: tossSkuMappings.isActive,
      })
      .from(tossSkuMappings)
      .innerJoin(stores, eq(tossSkuMappings.storeId, stores.id))
      .leftJoin(skus, eq(tossSkuMappings.skuId, skus.id))
      .where(and(...conditions))
      .orderBy(desc(tossSkuMappings.createdAt))

    return mappings
  } catch (error) {
    console.error('Failed to fetch toss mappings:', error)
    return []
  }
}

export async function getUnmappedTossItems(storeId: string) {
  try {
    // This would require actual Toss API integration
    // For now, return empty array
    return []
  } catch (error) {
    console.error('Failed to fetch unmapped items:', error)
    return []
  }
}

export async function getStoresAndSkus() {
  try {
    const [activeStores, activeSkus] = await Promise.all([
      db
        .select({
          id: stores.id,
          storeName: stores.storeName,
          storeCode: stores.storeCode,
        })
        .from(stores)
        .where(and(isNull(stores.deletedAt), eq(stores.isActive, true)))
        .orderBy(stores.storeName),
      db
        .select({
          id: skus.id,
          skuName: skus.skuName,
        })
        .from(skus)
        .where(and(isNull(skus.deletedAt), eq(skus.isActive, true)))
        .orderBy(skus.skuName),
    ])

    return { stores: activeStores, skus: activeSkus }
  } catch (error) {
    console.error('Failed to fetch stores and SKUs:', error)
    return { stores: [], skus: [] }
  }
}
