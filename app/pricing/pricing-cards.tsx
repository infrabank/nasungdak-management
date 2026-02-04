'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

type PlanFeature = {
  key: string
  name: string
  description: string
}

type Plan = {
  id: string
  name: string
  nameKo: string
  priceMonthly: number
  priceYearly: number
  maxStores: number
  maxUsers: number
  description: string
  features: PlanFeature[]
}

function formatPrice(price: number): string {
  if (price === 0) return '무료'
  if (price === -1) return '문의'
  return `₩${price.toLocaleString('ko-KR')}`
}

function formatMonthlyFromYearly(yearlyPrice: number): string {
  const monthly = Math.round(yearlyPrice / 12)
  return `₩${monthly.toLocaleString('ko-KR')}`
}

export default function PricingCards({
  mainPlans,
  proPlan,
}: {
  mainPlans: Plan[]
  proPlan: Plan | undefined
}) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>(
    'annual'
  )

  const getDisplayPrice = (
    plan: Plan
  ): { price: string; period: string; subtext?: string } => {
    if (plan.priceMonthly === 0) {
      return { price: '무료', period: '' }
    }

    if (billingPeriod === 'annual' && plan.priceYearly > 0) {
      return {
        price: formatMonthlyFromYearly(plan.priceYearly),
        period: '/월',
        subtext: `연 ${formatPrice(plan.priceYearly)} (2개월 무료)`,
      }
    }

    return {
      price: formatPrice(plan.priceMonthly),
      period: '/월',
    }
  }

  return (
    <>
      {/* Billing Toggle */}
      <div className="mb-12 flex justify-center">
        <div className="inline-flex border-2 border-brutal-black bg-brutal-white p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 text-sm font-bold transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-brutal-black text-brutal-white'
                : 'text-brutal-black/60 hover:text-brutal-black'
            }`}
          >
            월간 결제
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-6 py-2 text-sm font-bold transition-colors ${
              billingPeriod === 'annual'
                ? 'bg-brutal-black text-brutal-white'
                : 'text-brutal-black/60 hover:text-brutal-black'
            }`}
          >
            연간 결제{' '}
            <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700">
              2개월 무료
            </span>
          </button>
        </div>
      </div>

      {/* Main Plan Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {mainPlans.map((plan) => {
          const isPopular = plan.id === 'standard'
          const priceInfo = getDisplayPrice(plan)

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col ${
                isPopular
                  ? 'border-[3px] border-brutal-black bg-[#F8FAFC] shadow-brutal-lg md:-translate-y-4 md:scale-105'
                  : 'border-3 border-brutal-black bg-brutal-white shadow-brutal'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-brutal-black bg-brutal-yellow px-4 py-1 text-sm font-bold">
                  사장님들이 가장 많이 선택
                </div>
              )}

              <div className="border-b-2 border-brutal-black p-6">
                <p className="text-xs font-medium text-brutal-black/50">
                  {plan.description}
                </p>
                <h3 className="mt-1 text-xl font-bold text-brutal-black">
                  {plan.nameKo}
                </h3>

                <div className="mt-4">
                  <span className="text-3xl font-bold text-brutal-black">
                    {priceInfo.price}
                  </span>
                  {priceInfo.period && (
                    <span className="text-brutal-black/70">
                      {priceInfo.period}
                    </span>
                  )}
                </div>

                {priceInfo.subtext && (
                  <p className="mt-1 text-sm text-green-600">
                    {priceInfo.subtext}
                  </p>
                )}

                {/* ROI Message for paid plans */}
                {plan.id === 'basic' && (
                  <p className="mt-2 text-xs text-brutal-black/50">
                    하루 커피값으로 매장 관리 자동화
                  </p>
                )}
                {plan.id === 'standard' && (
                  <p className="mt-2 text-xs text-brutal-black/50">
                    원가 1%만 잡아도 월 30만 원 절감
                  </p>
                )}
              </div>

              <div className="flex-1 p-6">
                <p className="mb-3 text-sm font-bold text-brutal-black">
                  포함된 기능:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                    <span>
                      매장{' '}
                      {plan.maxStores === -1 ? '무제한' : `${plan.maxStores}개`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                    <span>
                      사용자{' '}
                      {plan.maxUsers === -1 ? '무제한' : `${plan.maxUsers}명`}
                    </span>
                  </li>
                  {plan.features.slice(0, 5).map((feature) => (
                    <li
                      key={feature.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                  {plan.features.length > 5 && (
                    <li className="pl-6 text-sm text-brutal-black/50">
                      +{plan.features.length - 5}개 더...
                    </li>
                  )}
                </ul>
              </div>

              <div className="p-6 pt-0">
                <Link
                  href="/signup"
                  className={`block w-full border-2 border-brutal-black px-4 py-3 text-center text-sm font-bold shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg ${
                    isPopular
                      ? 'bg-brutal-yellow text-brutal-black'
                      : 'bg-brutal-white text-brutal-black'
                  }`}
                >
                  {plan.id === 'free'
                    ? '무료로 시작하기'
                    : isPopular
                      ? '무료로 시작하기'
                      : '14일 무료 체험'}
                </Link>
                <p className="mt-2 text-center text-xs text-brutal-black/50">
                  14일 무료 · 언제든 해지
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pro Plan - Separate Card with Contact Button */}
      {proPlan && (
        <div className="mt-8 border-3 border-brutal-black bg-brutal-white p-8 shadow-brutal">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex-1">
              <p className="text-xs font-medium text-brutal-black/50">
                {proPlan.description}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-brutal-black">
                {proPlan.nameKo}
              </h3>
              <p className="mt-2 text-brutal-black/70">
                매장 10개 이상, 사용자 무제한, API 연동, 맞춤 리포트, 웹훅 지원
              </p>
              <ul className="mt-4 flex flex-wrap gap-4 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  매장 10개
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  사용자 무제한
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  API 연동
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  맞춤 리포트
                </li>
              </ul>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-center">
                <span className="text-3xl font-bold text-brutal-black">
                  {formatPrice(proPlan.priceMonthly)}
                </span>
                <span className="text-brutal-black/70">/월</span>
                {billingPeriod === 'annual' && proPlan.priceYearly > 0 && (
                  <p className="mt-1 text-sm text-green-600">
                    연간 결제 시 {formatMonthlyFromYearly(proPlan.priceYearly)}
                    /월
                  </p>
                )}
              </div>
              <Link
                href="mailto:sales@nasungchicken.com?subject=프로 플랜 문의"
                className="mt-2 border-2 border-brutal-black bg-brutal-yellow px-8 py-3 text-base font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
              >
                맞춤 견적 문의
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
