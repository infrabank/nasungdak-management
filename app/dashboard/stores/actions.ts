'use server'

import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { storeSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import {
  stores,
  userStoreAssignments,
  roles,
  organizationMembers,
} from '@/lib/db/schema'
import { eq, and, isNull, desc, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getAuthorizedStoreIds, getUserContext } from '@/lib/auth-context'
import {
  SESSION_SECRET,
  SESSION_DURATION,
  JWT_EXPIRATION,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/constants'

export async function createStore(formData: FormData) {
  try {
    // 현재 사용자 정보 가져오기
    const userContext = await getUserContext()
    if (!userContext.isAuthenticated || !userContext.userId) {
      return {
        success: false,
        error: '로그인이 필요합니다',
      }
    }

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

    // 사용자의 조직 ID 가져오기
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userContext.userId),
        isNull(organizationMembers.deletedAt)
      ),
    })

    const [store] = await db
      .insert(stores)
      .values({
        ...validatedData,
        organizationId: membership?.organizationId || null,
        createdBy: userContext.userId,
      })
      .returning()

    // store_owner 역할 가져오기 (없으면 생성)
    let ownerRole = await db.query.roles.findFirst({
      where: eq(roles.roleName, 'store_owner'),
    })

    if (!ownerRole) {
      // store_owner 역할이 없으면 생성
      const [newRole] = await db
        .insert(roles)
        .values({
          roleName: 'store_owner',
          description: '매장 오너 - 소속 매장의 모든 기능 접근',
          permissions: {
            purchases: ['read', 'write', 'delete'],
            sales: ['read', 'write', 'delete'],
            inventory: ['read', 'write', 'delete'],
            employees: ['read', 'write', 'delete'],
            attendance: ['read', 'write', 'delete'],
            'fixed-costs': ['read', 'write', 'delete'],
            'oil-changes': ['read', 'write', 'delete'],
            'master-data': ['read', 'write'],
            analysis: ['read'],
            settings: ['read', 'write'],
          },
          isSystem: true,
        })
        .returning()
      ownerRole = newRole
    }

    // 사용자를 매장에 연결
    await db.insert(userStoreAssignments).values({
      userId: userContext.userId,
      storeId: store.id,
      roleId: ownerRole.id,
      assignedBy: userContext.userId,
    })

    // JWT 세션 업데이트
    await updateSessionWithNewStore(userContext.userId, store.id)

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
      error:
        error instanceof Error ? error.message : '매장 등록에 실패했습니다',
    }
  }
}

/**
 * JWT 세션에 새 매장 추가
 */
async function updateSessionWithNewStore(
  userId: string,
  storeId: string
): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!token) return

    const { payload } = await jwtVerify(token, SESSION_SECRET)
    const currentPayload = payload as {
      userId: string
      email: string
      name: string
      storeIds?: string[]
      organizationId?: string
      [key: string]: unknown
    }

    // 새 매장을 storeIds에 추가
    const currentStoreIds = currentPayload.storeIds || []
    if (!currentStoreIds.includes(storeId)) {
      const newStoreIds = [...currentStoreIds, storeId]

      // 새 토큰 생성
      const newToken = await new SignJWT({
        ...currentPayload,
        storeIds: newStoreIds,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRATION)
        .sign(SESSION_SECRET)

      cookieStore.set(SESSION_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION / 1000,
        path: '/',
      })
    }
  } catch (error) {
    console.error('Update session error:', error)
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
      error:
        error instanceof Error ? error.message : '매장 수정에 실패했습니다',
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
      error:
        error instanceof Error ? error.message : '매장 삭제에 실패했습니다',
    }
  }
}

export async function getStores() {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    const storeList = await db
      .select()
      .from(stores)
      .where(
        and(isNull(stores.deletedAt), inArray(stores.id, authorizedStoreIds))
      )
      .orderBy(desc(stores.createdAt))

    return storeList
  } catch (error) {
    console.error('Failed to fetch stores:', error)
    return []
  }
}

async function fetchActiveStores(authorizedStoreIds: string[]) {
  if (authorizedStoreIds.length === 0) {
    return []
  }

  const storeList = await db
    .select({
      id: stores.id,
      storeName: stores.storeName,
      storeCode: stores.storeCode,
    })
    .from(stores)
    .where(
      and(
        isNull(stores.deletedAt),
        eq(stores.isActive, true),
        inArray(stores.id, authorizedStoreIds)
      )
    )
    .orderBy(stores.storeName)

  return storeList
}

export async function getActiveStores() {
  try {
    // 사용자 권한 확인
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (authorizedStoreIds.length === 0) {
      return []
    }

    // 캐시 키에 사용자의 권한 정보 포함
    const storeKey = authorizedStoreIds.sort().join(',')

    const getCachedActiveStores = unstable_cache(
      () => fetchActiveStores(authorizedStoreIds),
      ['stores:active', storeKey],
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
