'use server'

import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { revalidatePath, unstable_cache } from 'next/cache'
import { storeSchema } from '@/lib/utils/validation'
import { revalidateStoresData, cacheTags } from '@/lib/cache-tags'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import {
  stores,
  userStoreAssignments,
  roles,
  organizationMembers,
  organizations,
} from '@/lib/db/schema'
import { eq, and, isNull, desc, inArray, count } from 'drizzle-orm'
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

    // 플랜 매장 한도 검증 (maxStores = -1 이면 무제한)
    if (membership?.organizationId) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, membership.organizationId),
        columns: { maxStores: true },
      })
      const maxStores = org?.maxStores ?? 1
      if (maxStores !== -1) {
        const [{ value: storeCount }] = await db
          .select({ value: count() })
          .from(stores)
          .where(
            and(
              eq(stores.organizationId, membership.organizationId),
              isNull(stores.deletedAt)
            )
          )
        if (storeCount >= maxStores) {
          return {
            success: false,
            error: `현재 플랜의 매장 한도(${maxStores}개)에 도달했습니다. 플랜을 업그레이드해주세요.`,
          }
        }
      }
    }

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
    revalidateStoresData()

    return {
      success: true,
      data: store,
    }
  } catch (error) {
    logger.error('Failed to create store:', errorToContext(error))

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
    logger.error('Update session error:', errorToContext(error))
  }
}

export async function updateStore(id: string, formData: FormData) {
  try {
    // 소유권 검증: 권한 있는 매장만 수정 가능 (managerPhone 등 탈취 방지)
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (!authorizedStoreIds.includes(id)) {
      return {
        success: false,
        error: '해당 매장에 대한 권한이 없습니다',
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
      .where(and(eq(stores.id, id), isNull(stores.deletedAt)))
      .returning()

    if (!store) {
      return { success: false, error: '매장을 찾을 수 없습니다' }
    }

    revalidatePath('/dashboard/stores')
    revalidateStoresData()

    return {
      success: true,
      data: store,
    }
  } catch (error) {
    logger.error('Failed to update store:', errorToContext(error))

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
    // 소유권 검증: 권한 있는 매장만 삭제 가능
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (!authorizedStoreIds.includes(id)) {
      return {
        success: false,
        error: '해당 매장에 대한 권한이 없습니다',
      }
    }

    await db
      .update(stores)
      .set({
        deletedAt: new Date(),
        deletedBy: 'system',
      })
      .where(and(eq(stores.id, id), isNull(stores.deletedAt)))

    revalidatePath('/dashboard/stores')
    revalidateStoresData()

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Failed to delete store:', errorToContext(error))
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
    logger.error('Failed to fetch stores:', errorToContext(error))
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
      { tags: [cacheTags.storesActive] }
    )

    return await getCachedActiveStores()
  } catch (error) {
    logger.error('Failed to fetch active stores:', errorToContext(error))
    return []
  }
}

export async function getStoreById(id: string) {
  try {
    // 소유권 검증: 권한 있는 매장만 조회 (주소·전화·managerPhone 노출 방지)
    const authorizedStoreIds = await getAuthorizedStoreIds()
    if (!authorizedStoreIds.includes(id)) {
      return null
    }

    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, id), isNull(stores.deletedAt)),
    })

    return store
  } catch (error) {
    logger.error('Failed to fetch store:', errorToContext(error))
    return null
  }
}
