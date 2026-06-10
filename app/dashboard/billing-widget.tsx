import Link from 'next/link'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import {
  organizationMembers,
  organizations,
  subscriptions,
} from '@/lib/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { normalizePlanType, getPlanConfig } from '@/lib/features'
import { CreditCard, AlertTriangle, ArrowRight } from 'lucide-react'

import { SESSION_SECRET } from '@/lib/auth/constants'

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

async function getBillingInfo() {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, userId),
      isNull(organizationMembers.deletedAt)
    ),
  })

  if (!membership) return null

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, membership.organizationId),
  })

  if (!org) return null

  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.organizationId, org.id),
      eq(subscriptions.status, 'active')
    ),
    orderBy: desc(subscriptions.createdAt),
  })

  const normalizedPlan = normalizePlanType(org.plan || 'free')
  const planInfo = getPlanConfig(normalizedPlan)

  const isTrial = org.trialEndsAt && new Date(org.trialEndsAt) > new Date()
  const trialDaysLeft = isTrial
    ? Math.ceil(
        (new Date(org.trialEndsAt!).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0

  return {
    plan: normalizedPlan,
    planName: planInfo.nameKo,
    isTrial,
    trialDaysLeft,
    trialEndsAt: org.trialEndsAt,
    hasSubscription: !!subscription,
    nextBillingDate: subscription?.currentPeriodEnd,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    isOwner: membership.role === 'owner',
  }
}

export default async function BillingWidget() {
  const billing = await getBillingInfo()

  if (!billing) return null

  const showTrialWarning = billing.isTrial && billing.trialDaysLeft <= 5
  const showCancelWarning = billing.cancelAtPeriodEnd

  return (
    <div
      className={`border-3 border-brutal-black p-4 shadow-brutal ${
        showTrialWarning || showCancelWarning
          ? 'bg-brutal-yellow'
          : 'bg-brutal-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="border-2 border-brutal-black bg-brutal-yellow/50 p-2">
            <CreditCard className="h-5 w-5 text-brutal-black" />
          </div>
          <div>
            <p className="text-sm font-bold text-brutal-black">
              {billing.planName} 플랜
            </p>
            {billing.isTrial && (
              <p className="text-xs text-brutal-black/70">
                무료 체험 {billing.trialDaysLeft}일 남음
              </p>
            )}
            {!billing.isTrial && billing.nextBillingDate && (
              <p className="text-xs text-brutal-black/70">
                다음 결제:{' '}
                {new Date(billing.nextBillingDate).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>
        {billing.isOwner && (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1 text-sm font-bold text-brutal-black hover:underline"
          >
            관리 <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {showTrialWarning && (
        <div className="mt-3 flex items-start gap-2 border-2 border-brutal-black bg-brutal-white p-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brutal-black" />
          <div>
            <p className="text-xs font-bold text-brutal-black">
              무료 체험이 곧 종료됩니다
            </p>
            <p className="text-xs text-brutal-black/70">
              {billing.trialDaysLeft}일 후 종료 ·{' '}
              <Link href="/pricing" className="font-bold underline">
                플랜 선택
              </Link>
            </p>
          </div>
        </div>
      )}

      {showCancelWarning && (
        <div className="mt-3 flex items-start gap-2 border-2 border-brutal-black bg-brutal-white p-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brutal-red" />
          <div>
            <p className="text-xs font-bold text-brutal-red">구독 해지 예정</p>
            <p className="text-xs text-brutal-black/70">
              기간 종료 후 무료 플랜으로 전환됩니다
            </p>
          </div>
        </div>
      )}

      {billing.plan === 'free' && !billing.isTrial && (
        <div className="mt-3">
          <Link
            href="/pricing"
            className="block w-full border-2 border-brutal-black bg-brutal-yellow px-3 py-2 text-center text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:shadow-brutal"
          >
            업그레이드
          </Link>
        </div>
      )}
    </div>
  )
}
