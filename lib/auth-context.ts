'use server'

import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import {
  userStoreAssignments,
  organizationMembers,
  organizations,
  roles,
} from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { SESSION_SECRET, SESSION_COOKIE_NAME } from '@/lib/auth/constants'
import { logger, errorToContext } from '@/lib/logger'

export interface UserContext {
  userId: string
  email: string
  name: string
  organizationId: string | null
  storeIds: string[]
  isAuthenticated: boolean
}

/**
 * 현재 로그인한 사용자의 컨텍스트를 가져옵니다.
 * 인증되지 않았거나 조직/매장이 없으면 빈 storeIds를 반환합니다.
 */
export async function getUserContext(): Promise<UserContext> {
  const defaultContext: UserContext = {
    userId: '',
    email: '',
    name: '',
    organizationId: null,
    storeIds: [],
    isAuthenticated: false,
  }

  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return defaultContext
    }

    const { payload } = await jwtVerify(token, SESSION_SECRET)
    const jwtPayload = payload as {
      userId?: string
      email?: string
      name?: string
      organizationId?: string
      storeIds?: string[]
    }

    if (!jwtPayload.userId) {
      return defaultContext
    }

    // 항상 DB에서 최신 storeIds 조회 (JWT 업데이트 지연/실패 대비)
    const assignments = await db.query.userStoreAssignments.findMany({
      where: and(
        eq(userStoreAssignments.userId, jwtPayload.userId),
        isNull(userStoreAssignments.deletedAt)
      ),
    })
    const storeIds = assignments.map((a) => a.storeId)
    let organizationId = jwtPayload.organizationId || null

    if (!organizationId) {
      // 다중 조직 소속 시 가장 오래된 멤버십으로 결정 (비결정적 선택 방지)
      const membership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, jwtPayload.userId),
          isNull(organizationMembers.deletedAt)
        ),
        orderBy: (m, { asc }) => asc(m.invitedAt),
      })
      organizationId = membership?.organizationId || null
    }

    return {
      userId: jwtPayload.userId,
      email: jwtPayload.email || '',
      name: jwtPayload.name || '',
      organizationId,
      storeIds,
      isAuthenticated: true,
    }
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Get user context error', errorToContext(error))
    return defaultContext
  }
}

/**
 * 사용자가 특정 매장에 접근 권한이 있는지 확인합니다.
 */
export async function canAccessStore(storeId: string): Promise<boolean> {
  const context = await getUserContext()
  if (!context.isAuthenticated) return false
  if (context.storeIds.length === 0) return false
  return context.storeIds.includes(storeId)
}

/**
 * 사용자의 허용된 storeIds를 반환합니다.
 * 인증되지 않았거나 권한이 없으면 빈 배열을 반환합니다.
 */
export async function getAuthorizedStoreIds(): Promise<string[]> {
  const context = await getUserContext()
  return context.storeIds
}

/**
 * 특정 매장 접근 권한을 강제합니다. 권한이 없으면 throw합니다.
 * 서버 액션의 update/delete에서 대상 레코드의 storeId를 넘겨 소유권을 검증하는 용도.
 */
export async function assertStoreAccess(storeId: string | null | undefined): Promise<void> {
  if (!storeId) {
    throw new Error('매장 정보가 없어 접근 권한을 확인할 수 없습니다.')
  }
  const ok = await canAccessStore(storeId)
  if (!ok) {
    throw new Error('접근 권한이 없는 매장입니다.')
  }
}

/**
 * 클라이언트가 보낸 storeId를 검증해 반환합니다.
 * - storeId가 주어지면 반드시 권한 보유 매장인지 확인(없으면 throw).
 * - storeId가 없으면 첫 번째 권한 매장으로 대체.
 * 생성 계열 액션에서 "클라이언트 storeId 그대로 신뢰" 취약점을 막는 용도.
 */
export async function resolveStoreId(
  storeId: string | null | undefined
): Promise<string> {
  const authorized = await getAuthorizedStoreIds()
  if (authorized.length === 0) {
    throw new Error('접근 가능한 매장이 없습니다.')
  }
  if (storeId) {
    if (!authorized.includes(storeId)) {
      throw new Error('접근 권한이 없는 매장입니다.')
    }
    return storeId
  }
  return authorized[0]
}

/**
 * 사용자의 역할(userStoreAssignments -> roles)에서 권한 매트릭스를 병합해 반환합니다.
 * 여러 매장/역할에 배정된 경우 합집합.
 */
async function getUserPermissions(
  userId: string
): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ permissions: roles.permissions })
    .from(userStoreAssignments)
    .innerJoin(roles, eq(userStoreAssignments.roleId, roles.id))
    .where(
      and(
        eq(userStoreAssignments.userId, userId),
        isNull(userStoreAssignments.deletedAt)
      )
    )

  const merged: Record<string, string[]> = {}
  for (const row of rows) {
    const perms = (row.permissions ?? {}) as Record<string, string[]>
    for (const [resource, actions] of Object.entries(perms)) {
      const set = new Set(merged[resource] ?? [])
      for (const a of actions) set.add(a)
      merged[resource] = Array.from(set)
    }
  }
  return merged
}

/**
 * 역할 기반 권한을 강제합니다. 권한이 없으면 throw합니다.
 *
 * 안전장치(lockout 방지): 사용자에게 권한 데이터가 전혀 없으면(레거시/미구성 배포)
 * 차단하지 않고 통과시킨다. 권한이 하나라도 구성돼 있으면 해당 리소스/액션을 엄격히 검사한다.
 * 이 방식으로 restricted 역할(staff/viewer 등)의 무단 쓰기/삭제만 막고,
 * 권한 미구성 사용자는 기존처럼 동작한다.
 */
export async function assertPermission(
  resource: string,
  action: 'read' | 'write' | 'delete'
): Promise<void> {
  const context = await getUserContext()
  if (!context.isAuthenticated || !context.userId) {
    throw new Error('로그인이 필요합니다.')
  }

  const perms = await getUserPermissions(context.userId)
  // 권한 데이터가 전혀 없으면 enforcement 미적용 (lockout 방지)
  if (Object.keys(perms).length === 0) return

  if (!perms[resource]?.includes(action)) {
    throw new Error('이 작업을 수행할 권한이 없습니다.')
  }
}

/**
 * 사용자의 조직 ID를 반환합니다.
 * 인증되지 않았거나 조직이 없으면 null을 반환합니다.
 */
export async function getOrganizationId(): Promise<string | null> {
  const context = await getUserContext()
  return context.organizationId
}

/**
 * 사용자의 조직 ID를 반환합니다.
 * 조직이 없으면 에러를 throw합니다.
 */
export async function requireOrganizationId(): Promise<string> {
  const orgId = await getOrganizationId()
  if (!orgId) {
    throw new Error('조직 정보가 없습니다. 다시 로그인해주세요.')
  }
  return orgId
}

/**
 * 조직 브랜딩 정보 타입
 */
export interface OrganizationBranding {
  id: string
  name: string
  logoUrl: string | null
}

/**
 * 사용자의 조직 브랜딩 정보 (이름, 로고)를 반환합니다.
 * 인증되지 않았거나 조직이 없으면 null을 반환합니다.
 */
export async function getOrganizationBranding(): Promise<OrganizationBranding | null> {
  const orgId = await getOrganizationId()
  if (!orgId) {
    return null
  }

  try {
    const org = await db.query.organizations.findFirst({
      where: and(eq(organizations.id, orgId), isNull(organizations.deletedAt)),
      columns: {
        id: true,
        name: true,
        logoUrl: true,
      },
    })

    if (!org) {
      return null
    }

    return {
      id: org.id,
      name: org.name,
      logoUrl: org.logoUrl,
    }
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Get organization branding error', errorToContext(error))
    return null
  }
}
