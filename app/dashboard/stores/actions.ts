'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { storeSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { z } from 'zod'

export async function createStore(formData: FormData) {
  try {
    const rawData = {
      storeName: formData.get('storeName'),
      storeCode: formData.get('storeCode'),
      address: formData.get('address') || null,
      phone: formData.get('phone') || null,
      managerPhone: formData.get('managerPhone') || null,
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = storeSchema.parse(rawData)

    // Check if store code already exists
    const existingStore = await db.query.stores.findFirst({
      where: and(
        eq(stores.storeCode, validatedData.storeCode),
        isNull(stores.deletedAt)
      ),
    })

    if (existingStore) {
      return {
        success: false,
        error: '이미 사용 중인 매장 코드입니다',
      }
    }

    const [store] = await db
      .insert(stores)
      .values({
        ...validatedData,
        createdBy: 'system',
      })
      .returning()

    revalidatePath('/dashboard/stores')
    revalidateTag('stores:active')

    return {
      success: true,
      data: store,
    }
  } catch (error) {
    console.error('Failed to create store:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '매장 등록에 실패했습니다',
    }
  }
}

export async function updateStore(id: string, formData: FormData) {
  try {
    const rawData = {
      storeName: formData.get('storeName'),
      storeCode: formData.get('storeCode'),
      address: formData.get('address') || null,
      phone: formData.get('phone') || null,
      managerPhone: formData.get('managerPhone') || null,
      isActive: formData.get('isActive') === 'true',
    }

    const validatedData = storeSchema.parse(rawData)

    // Check if store code already exists for other stores
    const existingStore = await db.query.stores.findFirst({
      where: and(
        eq(stores.storeCode, validatedData.storeCode),
        isNull(stores.deletedAt)
      ),
    })

    if (existingStore && existingStore.id !== id) {
      return {
        success: false,
        error: '이미 사용 중인 매장 코드입니다',
      }
    }

    const [store] = await db
      .update(stores)
      .set({
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(eq(stores.id, id))
      .returning()

    revalidatePath('/dashboard/stores')
    revalidateTag('stores:active')

    return {
      success: true,
      data: store,
    }
  } catch (error) {
    console.error('Failed to update store:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '매장 수정에 실패했습니다',
    }
  }
}

export async function deleteStore(id: string) {
  try {
    await db
      .update(stores)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(eq(stores.id, id))

    revalidatePath('/dashboard/stores')
    revalidateTag('stores:active')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete store:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '매장 삭제에 실패했습니다',
    }
  }
}

export async function getStores() {
  try {
    const storeList = await db
      .select()
      .from(stores)
      .where(isNull(stores.deletedAt))
      .orderBy(desc(stores.createdAt))

    return storeList
  } catch (error) {
    console.error('Failed to fetch stores:', error)
    return []
  }
}

async function fetchActiveStores() {
  const storeList = await db
    .select({
      id: stores.id,
      storeName: stores.storeName,
      storeCode: stores.storeCode,
    })
    .from(stores)
    .where(and(isNull(stores.deletedAt), eq(stores.isActive, true)))
    .orderBy(stores.storeName)

  return storeList
}

export async function getActiveStores() {
  try {
    const getCachedActiveStores = unstable_cache(
      fetchActiveStores,
      ['stores:active'],
      { tags: ['stores:active'] }
    )

    return await getCachedActiveStores()
  } catch (error) {
    console.error('Failed to fetch active stores:', error)
    return []
  }
}

export async function getStoreById(id: string) {
  try {
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, id), isNull(stores.deletedAt)),
    })

    return store
  } catch (error) {
    console.error('Failed to fetch store:', error)
    return null
  }
}
