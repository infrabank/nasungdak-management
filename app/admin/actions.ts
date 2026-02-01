'use server'

import { db } from '@/lib/db'
import {
  organizations,
  organizationMembers,
  stores,
  users,
  subscriptions,
  userStoreAssignments,
} from '@/lib/db/schema'
import { eq, and, isNull, desc, count, sql } from 'drizzle-orm'
import { requireSuperAdmin, getAdminContext } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

export interface AdminStats {
  totalOrganizations: number
  activeOrganizations: number
  totalStores: number
  totalUsers: number
  trialOrganizations: number
  paidOrganizations: number
}

export interface OrganizationListItem {
  id: string
  name: string
  slug: string
  plan: string
  isActive: boolean
  storeCount: number
  memberCount: number
  createdAt: Date
  trialEndsAt: Date | null
  subscriptionStatus: string | null
}

export interface OrganizationDetail {
  id: string
  name: string
  slug: string
  plan: string
  maxStores: number
  maxUsers: number
  isActive: boolean
  businessNumber: string | null
  billingEmail: string | null
  trialEndsAt: Date | null
  createdAt: Date
  updatedAt: Date
  stores: {
    id: string
    storeName: string
    storeCode: string
    isActive: boolean
    createdAt: Date
  }[]
  members: {
    id: string
    role: string
    joinedAt: Date | null
    user: {
      id: string
      name: string
      email: string
      isActive: boolean
    }
  }[]
  subscription: {
    id: string
    status: string
    plan: string
    priceMonthly: number
    currentPeriodEnd: Date | null
  } | null
}

/**
 * 관리자 대시보드 통계 조회
 */
export async function getAdminStats(): Promise<AdminStats | null> {
  try {
    const context = await getAdminContext()
    if (!context.isSuperAdmin) {
      return null
    }

    const now = new Date()

    // 전체 조직 수
    const [totalOrgsResult] = await db
      .select({ count: count() })
      .from(organizations)
      .where(isNull(organizations.deletedAt))

    // 활성 조직 수
    const [activeOrgsResult] = await db
      .select({ count: count() })
      .from(organizations)
      .where(
        and(isNull(organizations.deletedAt), eq(organizations.isActive, true))
      )

    // 전체 매장 수
    const [totalStoresResult] = await db
      .select({ count: count() })
      .from(stores)
      .where(isNull(stores.deletedAt))

    // 전체 사용자 수
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(isNull(users.deletedAt))

    // 무료 체험 중인 조직 수
    const [trialOrgsResult] = await db
      .select({ count: count() })
      .from(organizations)
      .where(
        and(
          isNull(organizations.deletedAt),
          eq(organizations.plan, 'free'),
          sql`${organizations.trialEndsAt} > ${now}`
        )
      )

    // 유료 구독 조직 수
    const [paidOrgsResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))

    return {
      totalOrganizations: totalOrgsResult?.count || 0,
      activeOrganizations: activeOrgsResult?.count || 0,
      totalStores: totalStoresResult?.count || 0,
      totalUsers: totalUsersResult?.count || 0,
      trialOrganizations: trialOrgsResult?.count || 0,
      paidOrganizations: paidOrgsResult?.count || 0,
    }
  } catch (error) {
    console.error('Get admin stats error:', error)
    return null
  }
}

/**
 * 전체 조직 목록 조회
 */
export async function getOrganizations(): Promise<OrganizationListItem[]> {
  try {
    await requireSuperAdmin()

    const orgs = await db.query.organizations.findMany({
      where: isNull(organizations.deletedAt),
      orderBy: desc(organizations.createdAt),
    })

    const result: OrganizationListItem[] = []

    for (const org of orgs) {
      // 매장 수
      const [storeCountResult] = await db
        .select({ count: count() })
        .from(stores)
        .where(and(eq(stores.organizationId, org.id), isNull(stores.deletedAt)))

      // 멤버 수
      const [memberCountResult] = await db
        .select({ count: count() })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, org.id),
            isNull(organizationMembers.deletedAt)
          )
        )

      // 구독 상태
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, org.id),
        orderBy: desc(subscriptions.createdAt),
      })

      result.push({
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        isActive: org.isActive,
        storeCount: storeCountResult?.count || 0,
        memberCount: memberCountResult?.count || 0,
        createdAt: org.createdAt,
        trialEndsAt: org.trialEndsAt,
        subscriptionStatus: subscription?.status || null,
      })
    }

    return result
  } catch (error) {
    console.error('Get organizations error:', error)
    return []
  }
}

/**
 * 조직 상세 정보 조회
 */
export async function getOrganizationDetail(
  organizationId: string
): Promise<OrganizationDetail | null> {
  try {
    await requireSuperAdmin()

    const org = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.id, organizationId),
        isNull(organizations.deletedAt)
      ),
    })

    if (!org) return null

    // 매장 목록
    const storeList = await db.query.stores.findMany({
      where: and(eq(stores.organizationId, org.id), isNull(stores.deletedAt)),
      orderBy: desc(stores.createdAt),
    })

    // 멤버 목록
    const members = await db
      .select({
        id: organizationMembers.id,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          isActive: users.isActive,
        },
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          isNull(organizationMembers.deletedAt)
        )
      )

    // 구독 정보
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, org.id),
      orderBy: desc(subscriptions.createdAt),
    })

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      maxStores: org.maxStores,
      maxUsers: org.maxUsers,
      isActive: org.isActive,
      businessNumber: org.businessNumber,
      billingEmail: org.billingEmail,
      trialEndsAt: org.trialEndsAt,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      stores: storeList.map((s) => ({
        id: s.id,
        storeName: s.storeName,
        storeCode: s.storeCode,
        isActive: s.isActive,
        createdAt: s.createdAt,
      })),
      members,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            plan: subscription.plan,
            priceMonthly: subscription.priceMonthly,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    }
  } catch (error) {
    console.error('Get organization detail error:', error)
    return null
  }
}

/**
 * 조직 활성화/비활성화
 */
export async function toggleOrganizationStatus(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin()

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    })

    if (!org) {
      return { success: false, error: '조직을 찾을 수 없습니다' }
    }

    await db
      .update(organizations)
      .set({
        isActive: !org.isActive,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))

    revalidatePath('/admin')
    revalidatePath(`/admin/organizations/${organizationId}`)

    return { success: true }
  } catch (error) {
    console.error('Toggle organization status error:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '처리 중 오류가 발생했습니다',
    }
  }
}

/**
 * 조직 플랜 변경
 */
export async function updateOrganizationPlan(
  organizationId: string,
  plan: string,
  maxStores: number,
  maxUsers: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin()

    await db
      .update(organizations)
      .set({
        plan,
        maxStores,
        maxUsers,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))

    revalidatePath('/admin')
    revalidatePath(`/admin/organizations/${organizationId}`)

    return { success: true }
  } catch (error) {
    console.error('Update organization plan error:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '처리 중 오류가 발생했습니다',
    }
  }
}

/**
 * 조직 삭제 (soft delete)
 */
export async function deleteOrganization(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin()

    await db
      .update(organizations)
      .set({
        deletedAt: new Date(),
        isActive: false,
      })
      .where(eq(organizations.id, organizationId))

    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    console.error('Delete organization error:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '처리 중 오류가 발생했습니다',
    }
  }
}

/**
 * 무료 체험 기간 연장
 */
export async function extendTrial(
  organizationId: string,
  days: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin()

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    })

    if (!org) {
      return { success: false, error: '조직을 찾을 수 없습니다' }
    }

    const currentTrialEnd = org.trialEndsAt || new Date()
    const newTrialEnd = new Date(currentTrialEnd)
    newTrialEnd.setDate(newTrialEnd.getDate() + days)

    await db
      .update(organizations)
      .set({
        trialEndsAt: newTrialEnd,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))

    revalidatePath('/admin')
    revalidatePath(`/admin/organizations/${organizationId}`)

    return { success: true }
  } catch (error) {
    console.error('Extend trial error:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '처리 중 오류가 발생했습니다',
    }
  }
}
