'use server'

import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { db } from '@/lib/db'
import {
  organizations,
  stores,
  organizationMembers,
  userStoreAssignments,
  roles,
} from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logger, errorToContext } from '@/lib/logger'

import { SESSION_SECRET } from '@/lib/auth/constants'

// Step 1: Organization creation schema
const organizationSchema = z.object({
  name: z
    .string()
    .min(1, '조직명을 입력해주세요')
    .max(200, '조직명이 너무 깁니다'),
  slug: z
    .string()
    .min(1, 'URL 슬러그를 입력해주세요')
    .max(100, '슬러그가 너무 깁니다')
    .regex(
      /^[a-z0-9-]+$/,
      '슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다'
    ),
  businessNumber: z
    .string()
    .optional()
    .transform((val) => val || null),
  billingEmail: z
    .string()
    .email('올바른 이메일 형식이 아닙니다')
    .optional()
    .or(z.literal('')),
})

// Step 2: Store creation schema
const storeSchema = z.object({
  storeName: z
    .string()
    .min(1, '매장명을 입력해주세요')
    .max(100, '매장명이 너무 깁니다'),
  storeCode: z
    .string()
    .min(1, '매장 코드를 입력해주세요')
    .max(20, '매장 코드가 너무 깁니다')
    .regex(
      /^[A-Z0-9-]+$/,
      '매장 코드는 영문 대문자, 숫자, 하이픈만 사용할 수 있습니다'
    ),
  address: z
    .string()
    .optional()
    .transform((val) => val || null),
  phone: z
    .string()
    .optional()
    .transform((val) => val || null),
})

export interface OnboardingState {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
  organizationId?: string
  storeId?: string
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
 * Step 1: Create organization
 */
export async function createOrganization(
  _prevState: OnboardingState | null,
  formData: FormData
): Promise<OnboardingState> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: '로그인이 필요합니다' }
    }

    const rawData = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      businessNumber: formData.get('businessNumber') as string,
      billingEmail: formData.get('billingEmail') as string,
    }

    // Validate
    const result = organizationSchema.safeParse(rawData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      return { success: false, error: '입력 정보를 확인해주세요', fieldErrors }
    }

    const { name, slug, businessNumber, billingEmail } = result.data

    // Check slug uniqueness
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    })
    if (existingOrg) {
      return {
        success: false,
        error: '이미 사용 중인 슬러그입니다',
        fieldErrors: { slug: '이미 사용 중인 슬러그입니다' },
      }
    }

    // Create organization with 14-day trial
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const [org] = await db
      .insert(organizations)
      .values({
        name,
        slug,
        businessNumber,
        billingEmail: billingEmail || null,
        plan: 'free',
        maxStores: 1,
        maxUsers: 3,
        trialEndsAt,
      })
      .returning({ id: organizations.id })

    // Add user as organization owner
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId,
      role: 'owner',
      joinedAt: new Date(),
    })

    return { success: true, organizationId: org.id }
  } catch (error) {
    logger.error('Create organization error', errorToContext(error))
    return { success: false, error: '조직 생성 중 오류가 발생했습니다' }
  }
}

/**
 * Step 2: Create first store
 */
export async function createFirstStore(
  _prevState: OnboardingState | null,
  formData: FormData
): Promise<OnboardingState> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: '로그인이 필요합니다' }
    }

    const organizationId = formData.get('organizationId') as string
    if (!organizationId) {
      return { success: false, error: '조직 정보가 없습니다' }
    }

    // Verify user is organization member
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
        isNull(organizationMembers.deletedAt)
      ),
    })
    if (!membership) {
      return { success: false, error: '조직에 대한 권한이 없습니다' }
    }

    const rawData = {
      storeName: formData.get('storeName') as string,
      storeCode: formData.get('storeCode') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
    }

    // Validate
    const result = storeSchema.safeParse(rawData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      return { success: false, error: '입력 정보를 확인해주세요', fieldErrors }
    }

    const { storeName, storeCode, address, phone } = result.data

    // Check store code uniqueness
    const existingStore = await db.query.stores.findFirst({
      where: eq(stores.storeCode, storeCode),
    })
    if (existingStore) {
      return {
        success: false,
        error: '이미 사용 중인 매장 코드입니다',
        fieldErrors: { storeCode: '이미 사용 중인 매장 코드입니다' },
      }
    }

    // Create store
    const [store] = await db
      .insert(stores)
      .values({
        organizationId,
        storeName,
        storeCode,
        address,
        phone,
        isActive: true,
        createdBy: userId,
      })
      .returning({ id: stores.id })

    // Get store_owner role
    const ownerRole = await db.query.roles.findFirst({
      where: eq(roles.roleName, 'store_owner'),
    })

    if (ownerRole) {
      // Assign user to store with owner role
      await db.insert(userStoreAssignments).values({
        userId,
        storeId: store.id,
        roleId: ownerRole.id,
        assignedBy: userId,
      })

      // Update session with new store access
      await updateSessionWithStore(userId, store.id)
    }

    revalidatePath('/dashboard')

    return { success: true, storeId: store.id }
  } catch (error) {
    logger.error('Create store error', errorToContext(error))
    return { success: false, error: '매장 생성 중 오류가 발생했습니다' }
  }
}

/**
 * Update user session to include new store access
 */
async function updateSessionWithStore(
  userId: string,
  storeId: string
): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return

    const { payload } = await jwtVerify(token, SESSION_SECRET)
    const currentPayload = payload as {
      userId: string
      email: string
      name: string
      storeIds: string[]
      permissions: Record<string, string[]>
    }

    // Add new store to storeIds
    const newStoreIds = [...(currentPayload.storeIds || []), storeId]

    // Get permissions from role
    const assignments = await db
      .select({ permissions: roles.permissions })
      .from(userStoreAssignments)
      .innerJoin(roles, eq(userStoreAssignments.roleId, roles.id))
      .where(
        and(
          eq(userStoreAssignments.userId, userId),
          eq(userStoreAssignments.storeId, storeId),
          isNull(userStoreAssignments.deletedAt)
        )
      )

    // Merge permissions
    const mergedPermissions = { ...currentPayload.permissions }
    for (const assignment of assignments) {
      const perms = assignment.permissions as Record<string, string[]>
      for (const [resource, actions] of Object.entries(perms)) {
        if (!mergedPermissions[resource]) {
          mergedPermissions[resource] = []
        }
        for (const action of actions) {
          if (!mergedPermissions[resource].includes(action)) {
            mergedPermissions[resource].push(action)
          }
        }
      }
    }

    // Create new token
    const newToken = await new SignJWT({
      userId: currentPayload.userId,
      email: currentPayload.email,
      name: currentPayload.name,
      storeIds: newStoreIds,
      permissions: mergedPermissions,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(SESSION_SECRET)

    cookieStore.set('session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
  } catch (error) {
    logger.error('Update session error', errorToContext(error))
  }
}

/**
 * Check if slug is available
 */
export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean }> {
  if (!slug || slug.length < 1) {
    return { available: false }
  }

  const existingOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug.toLowerCase()),
  })

  return { available: !existingOrg }
}
