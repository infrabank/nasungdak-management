'use server'

import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { logger, errorToContext } from '@/lib/logger'
import {
  organizations,
  organizationMembers,
  organizationInvitations,
  users,
  subscriptions,
  usageMetrics,
} from '@/lib/db/schema'
import { eq, and, isNull, desc, gte } from 'drizzle-orm'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { revalidateOrganizationData } from '@/lib/cache-tags'
import {
  type PlanType,
  normalizePlanType,
  getPlanConfig,
} from '@/lib/features'
import { createBillingPortalSession, createCheckoutSession } from '@/lib/stripe'
import crypto from 'crypto'

import { SESSION_SECRET } from '@/lib/auth/constants'

// Schema for organization update
const updateOrgSchema = z.object({
  name: z.string().min(1, '조직명을 입력해주세요').max(200),
  businessNumber: z.string().optional().nullable(),
  billingEmail: z
    .string()
    .email('올바른 이메일 형식이 아닙니다')
    .optional()
    .or(z.literal('')),
  billingName: z.string().optional().nullable(),
})

// Schema for branding update
const updateBrandingSchema = z.object({
  logoUrl: z
    .string()
    .url('올바른 URL 형식이 아닙니다')
    .max(500)
    .optional()
    .or(z.literal('')),
})

// Schema for invitation
const inviteSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  role: z.enum(['admin', 'member']),
})

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

/**
 * Get current user ID from session
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    return (payload as { userId?: string }).userId || null
  } catch {
    return null
  }
}

/**
 * Get user's organization with membership check
 */
async function getUserOrganization(userId: string) {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, userId),
      isNull(organizationMembers.deletedAt)
    ),
    with: {
      organization: true,
    },
  })
  return membership
}

/**
 * Get organization details for settings page
 */
export async function getOrganizationSettings() {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const membership = await getUserOrganization(userId)
  if (!membership) return null

  const org = membership.organization

  // Get subscription
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.organizationId, org.id),
      eq(subscriptions.status, 'active')
    ),
    orderBy: desc(subscriptions.createdAt),
  })

  // Get members
  const members = await db
    .select({
      id: organizationMembers.id,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
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

  // Get pending invitations
  const pendingInvites = await db.query.organizationInvitations.findMany({
    where: and(
      eq(organizationInvitations.organizationId, org.id),
      isNull(organizationInvitations.acceptedAt),
      gte(organizationInvitations.expiresAt, new Date())
    ),
  })

  // Get current month usage
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const usage = await db.query.usageMetrics.findMany({
    where: and(
      eq(usageMetrics.organizationId, org.id),
      gte(usageMetrics.periodStart, monthStart)
    ),
  })

  const normalizedPlan = normalizePlanType(org.plan || 'free')
  const planInfo = getPlanConfig(normalizedPlan)

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      plan: normalizedPlan,
      planName: planInfo.nameKo,
      maxStores: org.maxStores,
      maxUsers: org.maxUsers,
      businessNumber: org.businessNumber,
      billingEmail: org.billingEmail,
      billingName: org.billingName,
      trialEndsAt: org.trialEndsAt,
      createdAt: org.createdAt,
    },
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          priceMonthly: subscription.priceMonthly,
        }
      : null,
    members,
    pendingInvites: pendingInvites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
    })),
    usage: usage.reduce(
      (acc, u) => {
        acc[u.metricType] = (acc[u.metricType] || 0) + u.metricValue
        return acc
      },
      {} as Record<string, number>
    ),
    currentUserRole: membership.role,
    isOwner: membership.role === 'owner',
  }
}

/**
 * Update organization info
 */
export async function updateOrganization(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: '로그인이 필요합니다' }

    const membership = await getUserOrganization(userId)
    if (!membership) return { success: false, error: '조직을 찾을 수 없습니다' }

    // Only owner/admin can update
    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: '수정 권한이 없습니다' }
    }

    const rawData = {
      name: formData.get('name') as string,
      businessNumber: (formData.get('businessNumber') as string) || null,
      billingEmail: (formData.get('billingEmail') as string) || '',
      billingName: (formData.get('billingName') as string) || null,
    }

    const result = updateOrgSchema.safeParse(rawData)
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    await db
      .update(organizations)
      .set({
        ...result.data,
        billingEmail: result.data.billingEmail || null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, membership.organization.id))

    revalidatePath('/dashboard/settings')
    revalidateOrganizationData(membership.organization.id)

    return { success: true }
  } catch (error) {
    logger.error('Update organization error:', errorToContext(error))
    return { success: false, error: '저장 중 오류가 발생했습니다' }
  }
}

/**
 * Invite a team member
 */
export async function inviteMember(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: '로그인이 필요합니다' }

    const membership = await getUserOrganization(userId)
    if (!membership) return { success: false, error: '조직을 찾을 수 없습니다' }

    // Only owner/admin can invite
    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: '초대 권한이 없습니다' }
    }

    const rawData = {
      email: formData.get('email') as string,
      role: formData.get('role') as 'admin' | 'member',
    }

    const result = inviteSchema.safeParse(rawData)
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    const { email, role } = result.data
    const org = membership.organization

    // Check member limit
    const memberCount = await db
      .select({ count: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          isNull(organizationMembers.deletedAt)
        )
      )

    if (org.maxUsers !== -1 && memberCount.length >= org.maxUsers) {
      return {
        success: false,
        error: `현재 플랜은 최대 ${org.maxUsers}명까지 초대할 수 있습니다`,
      }
    }

    // Check if already a member
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })

    if (existingUser) {
      const existingMembership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, existingUser.id),
          isNull(organizationMembers.deletedAt)
        ),
      })

      if (existingMembership) {
        return { success: false, error: '이미 조직의 멤버입니다' }
      }
    }

    // Check existing invitation
    const existingInvite = await db.query.organizationInvitations.findFirst({
      where: and(
        eq(organizationInvitations.organizationId, org.id),
        eq(organizationInvitations.email, email.toLowerCase()),
        isNull(organizationInvitations.acceptedAt),
        gte(organizationInvitations.expiresAt, new Date())
      ),
    })

    if (existingInvite) {
      return { success: false, error: '이미 초대가 발송되었습니다' }
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await db.insert(organizationInvitations).values({
      organizationId: org.id,
      email: email.toLowerCase(),
      role,
      token,
      invitedBy: userId,
      expiresAt,
    })

    // TODO: Send invitation email

    revalidatePath('/dashboard/settings')

    return { success: true, data: { email } }
  } catch (error) {
    logger.error('Invite member error:', errorToContext(error))
    return { success: false, error: '초대 발송 중 오류가 발생했습니다' }
  }
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(
  invitationId: string
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: '로그인이 필요합니다' }

    const membership = await getUserOrganization(userId)
    if (!membership) return { success: false, error: '조직을 찾을 수 없습니다' }

    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: '권한이 없습니다' }
    }

    await db
      .delete(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.id, invitationId),
          eq(organizationInvitations.organizationId, membership.organization.id)
        )
      )

    revalidatePath('/dashboard/settings')

    return { success: true }
  } catch (error) {
    logger.error('Cancel invitation error:', errorToContext(error))
    return { success: false, error: '취소 중 오류가 발생했습니다' }
  }
}

/**
 * Remove a member from organization
 */
export async function removeMember(memberId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: '로그인이 필요합니다' }

    const membership = await getUserOrganization(userId)
    if (!membership) return { success: false, error: '조직을 찾을 수 없습니다' }

    if (membership.role !== 'owner') {
      return { success: false, error: '소유자만 멤버를 제거할 수 있습니다' }
    }

    // Get target member
    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.organizationId, membership.organization.id)
      ),
    })

    if (!targetMember) {
      return { success: false, error: '멤버를 찾을 수 없습니다' }
    }

    if (targetMember.role === 'owner') {
      return { success: false, error: '소유자는 제거할 수 없습니다' }
    }

    // Soft delete
    await db
      .update(organizationMembers)
      .set({ deletedAt: new Date() })
      .where(eq(organizationMembers.id, memberId))

    revalidatePath('/dashboard/settings')

    return { success: true }
  } catch (error) {
    logger.error('Remove member error:', errorToContext(error))
    return { success: false, error: '제거 중 오류가 발생했습니다' }
  }
}

/**
 * Get Stripe billing portal URL
 */
export async function getBillingPortalUrl(): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: '로그인이 필요합니다' }

    const membership = await getUserOrganization(userId)
    if (!membership) return { success: false, error: '조직을 찾을 수 없습니다' }

    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: '권한이 없습니다' }
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings`

    const { url } = await createBillingPortalSession(
      membership.organization.id,
      returnUrl
    )

    return { success: true, data: { url } }
  } catch (error) {
    logger.error('Billing portal error:', errorToContext(error))
    return { success: false, error: '결제 포털을 열 수 없습니다' }
  }
}

/**
 * Create checkout session for plan upgrade
 */
export async function createUpgradeCheckout(
  plan: PlanType,
  billingCycle: 'monthly' | 'yearly'
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: '로그인이 필요합니다' }

    const membership = await getUserOrganization(userId)
    if (!membership) return { success: false, error: '조직을 찾을 수 없습니다' }

    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: '권한이 없습니다' }
    }

    const org = membership.organization
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) return { success: false, error: '사용자를 찾을 수 없습니다' }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const { url } = await createCheckoutSession({
      organizationId: org.id,
      plan,
      billingCycle,
      successUrl: `${baseUrl}/dashboard/settings?upgrade=success`,
      cancelUrl: `${baseUrl}/dashboard/settings?upgrade=cancelled`,
      customerEmail: org.billingEmail || user.email,
    })

    return { success: true, data: { url } }
  } catch (error) {
    logger.error('Checkout error:', errorToContext(error))
    return { success: false, error: '결제 페이지를 열 수 없습니다' }
  }
}

/**
 * Update organization branding (logo URL)
 */
export async function updateBranding(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: '로그인이 필요합니다' }

    const membership = await getUserOrganization(userId)
    if (!membership) return { success: false, error: '조직을 찾을 수 없습니다' }

    // Only owner/admin can update branding
    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: '수정 권한이 없습니다' }
    }

    const rawData = {
      logoUrl: (formData.get('logoUrl') as string) || '',
    }

    const result = updateBrandingSchema.safeParse(rawData)
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    await db
      .update(organizations)
      .set({
        logoUrl: result.data.logoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, membership.organization.id))

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')
    revalidateOrganizationData(membership.organization.id)

    return { success: true }
  } catch (error) {
    logger.error('Update branding error:', errorToContext(error))
    return { success: false, error: '저장 중 오류가 발생했습니다' }
  }
}
