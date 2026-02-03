import Link from 'next/link'
import { getAllPlans, FEATURES, type FeatureKey } from '@/lib/features'
import { Check, X } from 'lucide-react'
import PublicHeader from '@/components/public-header'

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

function formatPrice(price: number): string {
  if (price === 0) return '무료'
  if (price === -1) return '문의'
  return `₩${price.toLocaleString('ko-KR')}`
}

export default function PricingPage() {
  const plans = getAllPlans()

  // Filter out enterprise for main display (show separately)
  const mainPlans = plans.filter((p) => p.id !== 'enterprise')
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

      {/* Pricing Cards */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {mainPlans.map((plan, index) => {
              const isPopular = plan.id === 'growth'
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col border-3 border-brutal-black bg-brutal-white ${
                    isPopular
                      ? '-translate-y-2 shadow-brutal-lg'
                      : 'shadow-brutal'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 border-2 border-brutal-black bg-brutal-yellow px-4 py-1 text-sm font-bold">
                      인기
                    </div>
                  )}

                  <div className="border-b-2 border-brutal-black p-6">
                    <h3 className="text-xl font-bold text-brutal-black">
                      {plan.nameKo}
                    </h3>
                    <p className="mt-1 text-sm text-brutal-black/70">
                      {plan.description}
                    </p>

                    <div className="mt-4">
                      <span className="text-3xl font-bold text-brutal-black">
                        {formatPrice(plan.priceMonthly)}
                      </span>
                      {plan.priceMonthly > 0 && (
                        <span className="text-brutal-black/70">/월</span>
                      )}
                    </div>

                    {plan.priceYearly > 0 && (
                      <p className="mt-1 text-sm text-brutal-black/50">
                        연간 결제 시 {formatPrice(plan.priceYearly)}/년
                        <span className="ml-1 font-bold text-green-600">
                          (
                          {Math.round(
                            (1 - plan.priceYearly / (plan.priceMonthly * 12)) *
                              100
                          )}
                          % 할인)
                        </span>
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
                          {plan.maxStores === -1
                            ? '무제한'
                            : `${plan.maxStores}개`}
                        </span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                        <span>
                          사용자{' '}
                          {plan.maxUsers === -1
                            ? '무제한'
                            : `${plan.maxUsers}명`}
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
                        : '14일 무료 체험'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Enterprise */}
          {enterprisePlan && (
            <div className="mt-12 border-3 border-brutal-black bg-brutal-black p-8 text-brutal-white">
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
                  {mainPlans.map((plan) => (
                    <th
                      key={plan.id}
                      className="border-r-2 border-brutal-white/20 p-4 text-center font-bold last:border-r-0"
                    >
                      {plan.nameKo}
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
                      {mainPlans.map((plan) => {
                        const hasFeature = plan.features.some(
                          (f) => f.key === featureKey
                        )
                        return (
                          <td
                            key={plan.id}
                            className="border-r-2 border-brutal-black p-4 text-center last:border-r-0"
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
                a: '네, 연간 결제 시 최대 20% 할인된 가격으로 이용할 수 있습니다.',
              },
              {
                q: '결제 방법은 무엇인가요?',
                a: '신용카드(Visa, Mastercard, American Express)로 결제할 수 있습니다. 엔터프라이즈 플랜은 계좌이체도 가능합니다.',
              },
              {
                q: '환불 정책은 어떻게 되나요?',
                a: '결제 후 7일 이내에 환불 요청 시 전액 환불됩니다. 그 이후에는 남은 기간에 대해 일할 계산하여 환불해드립니다.',
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
          <p>© 2024 매장 관리 시스템. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
