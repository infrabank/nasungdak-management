import Link from 'next/link'
import { getAllPlans, FEATURES, type FeatureKey } from '@/lib/features'
import { Check, X } from 'lucide-react'
import PublicHeader from '@/components/public-header'
import PricingCards from './pricing-cards'

export const metadata = {
  title: '요금제 - 매장 관리 시스템',
  description: '매장 관리 시스템의 요금제를 확인하세요.',
}

// Features to highlight in pricing table
const HIGHLIGHT_FEATURES: FeatureKey[] = [
  'purchases',
  'sales',
  'master-data',
  'inventory',
  'analytics',
  'alerts',
  'csv-import',
  'csv-export',
  'multi-store',
  'api-access',
  'custom-reports',
]

export default function PricingPage() {
  const plans = getAllPlans()

  // Filter out enterprise for main display (show separately)
  // Also filter out pro for main cards, show it separately
  const mainPlans = plans.filter((p) => p.id !== 'enterprise' && p.id !== 'pro')
  const proPlan = plans.find((p) => p.id === 'pro')
  const enterprisePlan = plans.find((p) => p.id === 'enterprise')

  return (
    <div className="min-h-screen bg-brutal-white">
      {/* Header */}
      <PublicHeader />

      {/* Hero */}
      <section className="px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-brutal-black sm:text-5xl">
          심플한 요금제
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-brutal-black/70">
          매장 규모와 필요에 맞는 플랜을 선택하세요.
          <br />
          모든 플랜은 <strong>14일 무료 체험</strong>이 가능합니다.
        </p>
      </section>

      {/* Pricing Cards with Toggle */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-5xl">
          <PricingCards mainPlans={mainPlans} proPlan={proPlan} />

          {/* Enterprise */}
          {enterprisePlan && (
            <div className="mt-8 border-3 border-brutal-black bg-brutal-black p-8 text-brutal-white">
              <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                <div>
                  <h3 className="text-2xl font-bold">
                    {enterprisePlan.nameKo}
                  </h3>
                  <p className="mt-2 text-brutal-white/80">
                    {enterprisePlan.description}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-4 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brutal-yellow" />
                      무제한 매장 및 사용자
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brutal-yellow" />
                      SSO 및 화이트 라벨
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brutal-yellow" />
                      전담 기술 지원
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brutal-yellow" />
                      맞춤 개발
                    </li>
                  </ul>
                </div>
                <Link
                  href="mailto:enterprise@nasungchicken.com"
                  className="flex-shrink-0 border-2 border-brutal-yellow bg-brutal-yellow px-8 py-3 text-base font-bold text-brutal-black transition-colors hover:bg-brutal-white"
                >
                  영업팀 문의
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="border-t-3 border-brutal-black bg-brutal-white px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-brutal-black">
            기능 비교
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-3 border-brutal-black">
              <thead>
                <tr className="bg-brutal-black text-brutal-white">
                  <th className="border-r-2 border-brutal-white/20 p-4 text-left font-bold">
                    기능
                  </th>
                  {plans
                    .filter((p) => p.id !== 'enterprise')
                    .map((plan) => (
                      <th
                        key={plan.id}
                        className={`border-r-2 border-brutal-white/20 p-4 text-center font-bold last:border-r-0 ${
                          plan.id === 'standard' ? 'bg-brutal-yellow/20' : ''
                        }`}
                      >
                        {plan.nameKo}
                        {plan.id === 'standard' && (
                          <span className="ml-1 text-xs text-brutal-yellow">
                            ★
                          </span>
                        )}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {HIGHLIGHT_FEATURES.map((featureKey, index) => {
                  const feature = FEATURES[featureKey]
                  return (
                    <tr
                      key={featureKey}
                      className={
                        index % 2 === 0 ? 'bg-brutal-white' : 'bg-gray-50'
                      }
                    >
                      <td className="border-r-2 border-brutal-black p-4 font-medium">
                        {feature.name}
                        <p className="mt-1 text-xs text-brutal-black/50">
                          {feature.description}
                        </p>
                      </td>
                      {plans
                        .filter((p) => p.id !== 'enterprise')
                        .map((plan) => {
                          const hasFeature = plan.features.some(
                            (f) => f.key === featureKey
                          )
                          return (
                            <td
                              key={plan.id}
                              className={`border-r-2 border-brutal-black p-4 text-center last:border-r-0 ${
                                plan.id === 'standard' ? 'bg-[#F8FAFC]/50' : ''
                              }`}
                            >
                              {hasFeature ? (
                                <Check className="mx-auto h-5 w-5 text-green-600" />
                              ) : (
                                <X className="mx-auto h-5 w-5 text-brutal-black/30" />
                              )}
                            </td>
                          )
                        })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-brutal-black">
            자주 묻는 질문
          </h2>

          <div className="space-y-4">
            {[
              {
                q: '무료 체험은 어떻게 시작하나요?',
                a: '회원가입 후 바로 14일 무료 체험이 시작됩니다. 신용카드 등록 없이 모든 기능을 사용할 수 있습니다.',
              },
              {
                q: '플랜을 변경할 수 있나요?',
                a: '네, 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드 시 즉시 적용되며, 다운그레이드는 다음 결제일부터 적용됩니다.',
              },
              {
                q: '연간 결제 시 할인이 있나요?',
                a: '네, 연간 결제 시 2개월 무료 혜택을 제공합니다. 10개월 가격으로 12개월 이용 가능합니다.',
              },
              {
                q: '베이직과 스탠다드의 차이는 무엇인가요?',
                a: '베이직은 혼자 운영하는 가게(1매장, 3사용자)를 위한 플랜이고, 스탠다드는 직원이 있는 가게(3매장, 10사용자)를 위한 플랜으로 재고 관리, 직원 관리, 고정비용 관리, 카카오 알림 기능이 추가됩니다.',
              },
              {
                q: '결제 방법은 무엇인가요?',
                a: '신용카드(Visa, Mastercard, American Express)로 결제할 수 있습니다. 프로/엔터프라이즈 플랜은 계좌이체도 가능합니다.',
              },
              {
                q: '환불 정책은 어떻게 되나요?',
                a: '결제 후 7일 이내 환불 요청 시 100% 전액 환불됩니다. 그 이후에는 남은 기간에 대해 일할 계산하여 환불해드립니다.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="border-2 border-brutal-black bg-brutal-white p-6"
              >
                <h3 className="font-bold text-brutal-black">{faq.q}</h3>
                <p className="mt-2 text-brutal-black/70">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-3 border-brutal-black bg-brutal-yellow px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-brutal-black">
            지금 바로 시작하세요
          </h2>
          <p className="mt-4 text-lg text-brutal-black/80">
            14일 무료 체험으로 매장 관리 시스템의 모든 기능을 경험해보세요.
            <br />
            <span className="font-medium">
              7일 이내 100% 환불 · 언제든 해지 가능
            </span>
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block border-2 border-brutal-black bg-brutal-black px-8 py-4 text-lg font-bold text-brutal-white transition-colors hover:bg-brutal-black/90"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-brutal-black bg-brutal-white px-4 py-8">
        <div className="mx-auto max-w-7xl text-center text-sm text-brutal-black/70">
          <p>© 2026 매장 관리 시스템. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
