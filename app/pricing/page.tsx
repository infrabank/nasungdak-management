import Image from 'next/image'
import Link from 'next/link'
import { getAllPlans, FEATURES, type FeatureKey } from '@/lib/features'
import { Check, X, Minus } from 'lucide-react'

export const metadata = {
  title: '요금제 - 나성닭강정 관리 시스템',
  description: '나성닭강정 관리 시스템의 요금제를 확인하세요.',
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
      <header className="border-b-3 border-brutal-black bg-brutal-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="border-2 border-brutal-black shadow-brutal-sm p-2 bg-brutal-yellow">
                <Image
                  src="/images/logo.png"
                  alt="나성닭강정 로고"
                  width={40}
                  height={40}
                  className="h-auto w-auto"
                />
              </div>
              <span className="text-xl font-bold text-brutal-black">
                나성닭강정
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-bold text-brutal-black hover:underline"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              >
                무료로 시작하기
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-brutal-black">
          심플한 요금제
        </h1>
        <p className="mt-4 text-lg text-brutal-black/70 max-w-2xl mx-auto">
          매장 규모와 필요에 맞는 플랜을 선택하세요.
          <br />
          모든 플랜은 <strong>14일 무료 체험</strong>이 가능합니다.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainPlans.map((plan, index) => {
              const isPopular = plan.id === 'standard'
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col border-3 border-brutal-black bg-brutal-white ${
                    isPopular ? 'shadow-brutal-lg -translate-y-2' : 'shadow-brutal'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brutal-yellow border-2 border-brutal-black text-sm font-bold">
                      인기
                    </div>
                  )}

                  <div className="p-6 border-b-2 border-brutal-black">
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
                        <span className="ml-1 text-green-600 font-bold">
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

                  <div className="p-6 flex-1">
                    <p className="text-sm font-bold text-brutal-black mb-3">
                      포함된 기능:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>
                          매장{' '}
                          {plan.maxStores === -1 ? '무제한' : `${plan.maxStores}개`}
                        </span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
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
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>{feature.name}</span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="text-sm text-brutal-black/50 pl-6">
                          +{plan.features.length - 5}개 더...
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="p-6 pt-0">
                    <Link
                      href="/signup"
                      className={`block w-full text-center px-4 py-3 text-sm font-bold border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all ${
                        isPopular
                          ? 'bg-brutal-yellow text-brutal-black'
                          : 'bg-brutal-white text-brutal-black'
                      }`}
                    >
                      {plan.id === 'free' ? '무료로 시작하기' : '14일 무료 체험'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Enterprise */}
          {enterprisePlan && (
            <div className="mt-12 border-3 border-brutal-black bg-brutal-black text-brutal-white p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold">{enterprisePlan.nameKo}</h3>
                  <p className="mt-2 text-brutal-white/80">
                    {enterprisePlan.description}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-4 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-brutal-yellow" />
                      무제한 매장 및 사용자
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-brutal-yellow" />
                      SSO 및 화이트 라벨
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-brutal-yellow" />
                      전담 기술 지원
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-brutal-yellow" />
                      맞춤 개발
                    </li>
                  </ul>
                </div>
                <Link
                  href="mailto:enterprise@nasungchicken.com"
                  className="px-8 py-3 text-base font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-yellow hover:bg-brutal-white transition-colors flex-shrink-0"
                >
                  영업팀 문의
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4 bg-brutal-white border-t-3 border-brutal-black">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-brutal-black text-center mb-12">
            기능 비교
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-3 border-brutal-black">
              <thead>
                <tr className="bg-brutal-black text-brutal-white">
                  <th className="p-4 text-left font-bold border-r-2 border-brutal-white/20">
                    기능
                  </th>
                  {mainPlans.map((plan) => (
                    <th
                      key={plan.id}
                      className="p-4 text-center font-bold border-r-2 border-brutal-white/20 last:border-r-0"
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
                      <td className="p-4 border-r-2 border-brutal-black font-medium">
                        {feature.name}
                        <p className="text-xs text-brutal-black/50 mt-1">
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
                            className="p-4 text-center border-r-2 border-brutal-black last:border-r-0"
                          >
                            {hasFeature ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-brutal-black/30 mx-auto" />
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
      <section className="py-16 px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-brutal-black text-center mb-12">
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
                a: '네, 연간 결제 시 약 16% 할인된 가격으로 이용할 수 있습니다.',
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
                className="border-2 border-brutal-black p-6 bg-brutal-white"
              >
                <h3 className="font-bold text-brutal-black">{faq.q}</h3>
                <p className="mt-2 text-brutal-black/70">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-brutal-yellow border-t-3 border-brutal-black">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-brutal-black">
            지금 바로 시작하세요
          </h2>
          <p className="mt-4 text-lg text-brutal-black/80">
            14일 무료 체험으로 나성닭강정 관리 시스템의 모든 기능을 경험해보세요.
          </p>
          <Link
            href="/signup"
            className="inline-block mt-8 px-8 py-4 text-lg font-bold text-brutal-white bg-brutal-black border-2 border-brutal-black hover:bg-brutal-black/90 transition-colors"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t-3 border-brutal-black bg-brutal-white">
        <div className="mx-auto max-w-7xl text-center text-sm text-brutal-black/70">
          <p>© 2024 나성닭강정. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
