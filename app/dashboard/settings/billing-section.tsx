'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getBillingPortalUrl, createUpgradeCheckout } from './actions'
import { PLANS, type PlanType } from '@/lib/features'
import { toast } from 'sonner'
import { CreditCard, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

interface Props {
  organization: {
    id: string
    plan: PlanType
    planName: string
    maxStores: number
    maxUsers: number
    trialEndsAt: Date | null
  }
  subscription: {
    id: string
    status: string
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
    priceMonthly: number
  } | null
  usage: Record<string, number>
  isOwner: boolean
}

export default function BillingSection({
  organization,
  subscription,
  usage,
  isOwner,
}: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const isTrial =
    organization.trialEndsAt && new Date(organization.trialEndsAt) > new Date()
  const trialDaysLeft = isTrial
    ? Math.ceil(
        (new Date(organization.trialEndsAt!).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0

  const handleManageBilling = async () => {
    setIsLoading(true)
    try {
      const result = await getBillingPortalUrl()
      if (result.success && result.data) {
        window.location.href = (result.data as { url: string }).url
      } else {
        toast.error(result.error || '오류가 발생했습니다')
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (plan: PlanType) => {
    setIsLoading(true)
    try {
      const result = await createUpgradeCheckout(plan, 'monthly')
      if (result.success && result.data) {
        window.location.href = (result.data as { url: string }).url
      } else {
        toast.error(result.error || '오류가 발생했습니다')
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return '무료'
    return `₩${price.toLocaleString('ko-KR')}`
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border-2 border-brutal-black bg-brutal-yellow/10 p-4">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <CreditCard className="h-4 w-4" />
            현재 플랜
          </div>
          <div className="mt-1 text-2xl font-bold text-brutal-black">
            {organization.planName}
          </div>
          {isTrial && (
            <div className="mt-1 text-sm text-brutal-black/70">
              무료 체험 {trialDaysLeft}일 남음
            </div>
          )}
        </div>

        <div className="border-2 border-brutal-black p-4">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <TrendingUp className="h-4 w-4" />월 요금
          </div>
          <div className="mt-1 text-2xl font-bold text-brutal-black">
            {subscription
              ? formatPrice(subscription.priceMonthly)
              : formatPrice(PLANS[organization.plan].priceMonthly)}
          </div>
        </div>

        <div className="border-2 border-brutal-black p-4">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Calendar className="h-4 w-4" />
            다음 결제일
          </div>
          <div className="mt-1 text-2xl font-bold text-brutal-black">
            {subscription?.currentPeriodEnd
              ? formatDate(subscription.currentPeriodEnd)
              : '-'}
          </div>
          {subscription?.cancelAtPeriodEnd && (
            <div className="mt-1 text-sm font-medium text-brutal-red">
              기간 종료 시 해지 예정
            </div>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="border-2 border-brutal-black p-4">
        <h3 className="mb-4 font-bold text-brutal-black">사용량</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <div className="text-sm text-brutal-black/70">매장</div>
            <div className="font-bold">
              {usage.stores || 0} /{' '}
              {organization.maxStores === -1 ? '∞' : organization.maxStores}
            </div>
          </div>
          <div>
            <div className="text-sm text-brutal-black/70">사용자</div>
            <div className="font-bold">
              {usage.users || 0} /{' '}
              {organization.maxUsers === -1 ? '∞' : organization.maxUsers}
            </div>
          </div>
          <div>
            <div className="text-sm text-brutal-black/70">이번 달 매입</div>
            <div className="font-bold">{usage.purchases || 0}건</div>
          </div>
          <div>
            <div className="text-sm text-brutal-black/70">이번 달 판매</div>
            <div className="font-bold">{usage.sales || 0}건</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isOwner && (
        <div className="flex flex-wrap gap-4">
          {organization.plan !== 'enterprise' && (
            <Link
              href="/pricing"
              className="border-2 border-brutal-black bg-brutal-yellow px-6 py-3 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
            >
              플랜 업그레이드
            </Link>
          )}

          {subscription && (
            <button
              onClick={handleManageBilling}
              disabled={isLoading}
              className="border-2 border-brutal-black bg-brutal-white px-6 py-3 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '로딩...' : '결제 관리'}
            </button>
          )}
        </div>
      )}

      {/* Trial Warning */}
      {isTrial && trialDaysLeft <= 3 && (
        <div className="flex items-start gap-3 border-2 border-brutal-red bg-brutal-red/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-brutal-red" />
          <div>
            <p className="font-bold text-brutal-red">
              무료 체험이 곧 종료됩니다
            </p>
            <p className="mt-1 text-sm text-brutal-black/70">
              {trialDaysLeft}일 후 무료 체험이 종료됩니다. 계속 사용하려면
              플랜을 선택해주세요.
            </p>
          </div>
        </div>
      )}

      {/* Quick Upgrade Options */}
      {organization.plan === 'free' && (
        <div className="border-2 border-brutal-black p-4">
          <h3 className="mb-4 font-bold text-brutal-black">빠른 업그레이드</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(['basic', 'standard', 'pro'] as PlanType[]).map((plan) => (
              <button
                key={plan}
                onClick={() => handleUpgrade(plan)}
                disabled={isLoading || !isOwner}
                className="border-2 border-brutal-black p-4 text-left transition-colors hover:bg-brutal-yellow/10 disabled:opacity-50"
              >
                <div className="font-bold">{PLANS[plan].nameKo}</div>
                <div className="text-sm text-brutal-black/70">
                  {formatPrice(PLANS[plan].priceMonthly)}/월
                </div>
                <div className="mt-2 text-xs text-brutal-black/50">
                  매장{' '}
                  {PLANS[plan].maxStores === -1
                    ? '무제한'
                    : `${PLANS[plan].maxStores}개`}
                  {' · '}
                  사용자{' '}
                  {PLANS[plan].maxUsers === -1
                    ? '무제한'
                    : `${PLANS[plan].maxUsers}명`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
