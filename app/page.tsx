import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ShoppingCart,
  TrendingUp,
  Store,
  Users,
  FileSpreadsheet,
  BarChart3,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
} from 'lucide-react'
import { getUserContext } from '@/lib/auth-context'
import PublicHeader from '@/components/public-header'

const features = [
  {
    icon: ShoppingCart,
    title: '매입 관리',
    description: '원재료 매입을 간편하게 기록하고 공급업체별로 관리하세요.',
  },
  {
    icon: TrendingUp,
    title: '판매 관리',
    description: '일일 판매량을 기록하고 매출을 자동으로 계산합니다.',
  },
  {
    icon: BarChart3,
    title: '원가 분석',
    description: '실시간으로 원가율을 파악하고 수익성을 분석하세요.',
  },
  {
    icon: Store,
    title: '다매장 관리',
    description: '여러 매장을 하나의 계정으로 통합 관리할 수 있습니다.',
  },
  {
    icon: Users,
    title: '직원 관리',
    description: '직원 정보와 출퇴근 기록을 체계적으로 관리하세요.',
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV 업로드',
    description: '기존 엑셀 데이터를 한 번에 일괄 업로드할 수 있습니다.',
  },
]

const benefits = [
  {
    icon: Clock,
    title: '월말 정산 80% 단축',
    description: '복잡한 엑셀 작업 없이 클릭 몇 번으로 정산 완료',
  },
  {
    icon: Zap,
    title: '5분 만에 설정 완료',
    description: '복잡한 설치 없이 회원가입 후 바로 시작',
  },
  {
    icon: Shield,
    title: '안전한 클라우드 저장',
    description: '데이터 유실 걱정 없이 언제 어디서나 접근',
  },
]

const steps = [
  {
    step: '01',
    title: '회원가입',
    description: '이메일로 간편하게 가입하세요',
  },
  {
    step: '02',
    title: '매장 설정',
    description: '매장 정보와 메뉴를 등록하세요',
  },
  {
    step: '03',
    title: '데이터 입력',
    description: '매입/판매 내역을 기록하세요',
  },
  {
    step: '04',
    title: '분석 확인',
    description: '자동 생성된 리포트를 확인하세요',
  },
]

const testimonials = [
  {
    name: '김사장님',
    business: '치킨 프랜차이즈 3개점',
    content:
      '매달 엑셀로 정산하느라 이틀씩 걸렸는데, 이제 2시간이면 끝나요. 진작 쓸 걸 그랬어요.',
    rating: 5,
  },
  {
    name: '이대표님',
    business: '분식점 운영',
    content:
      '원가율을 제대로 모르고 장사했는데, 이제 어떤 메뉴가 남는지 바로 보여요.',
    rating: 5,
  },
  {
    name: '박점장님',
    business: '카페 2개점',
    content:
      '직원들 출퇴근 관리까지 되니까 정말 편해요. 무료 플랜으로도 충분합니다.',
    rating: 5,
  },
]

const stats = [
  { value: '500+', label: '사용 매장' },
  { value: '80%', label: '정산 시간 단축' },
  { value: '5분', label: '설정 완료' },
  { value: '24/7', label: '언제나 접근' },
]

export default async function HomePage() {
  const userContext = await getUserContext()

  // 로그인된 사용자는 대시보드로 리다이렉트
  if (userContext.isAuthenticated) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-brutal-white">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b-3 border-brutal-black bg-brutal-yellow px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-4xl font-black leading-tight text-brutal-black sm:text-5xl lg:text-6xl">
              복잡한 엑셀은 그만,
              <br />
              <span className="relative">
                매입부터 원가까지
                <span className="absolute -bottom-2 left-0 h-3 w-full bg-brutal-pink/50" />
              </span>{' '}
              한 곳에서
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-brutal-black/80 sm:text-xl">
              자영업자를 위한 올인원 매장 관리 시스템.
              <br />
              5분 설정, 월말 정산 80% 시간 단축.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex items-center gap-2 border-3 border-brutal-black bg-brutal-black px-8 py-4 text-lg font-bold text-brutal-white shadow-brutal transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg"
              >
                무료로 시작하기
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/guide"
                className="flex items-center gap-2 border-3 border-brutal-black bg-brutal-white px-8 py-4 text-lg font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg"
              >
                가이드 보기
              </Link>
            </div>
            <p className="mt-6 text-sm font-medium text-brutal-black/60">
              신용카드 불필요 | 14일 무료 체험 | 언제든 취소 가능
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 h-64 w-64 border-3 border-brutal-black bg-brutal-pink opacity-20" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 border-3 border-brutal-black bg-brutal-blue opacity-20" />
      </section>

      {/* Stats Section */}
      <section className="border-b-3 border-brutal-black bg-brutal-white px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-black text-brutal-black sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm font-medium text-brutal-black/70">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b-3 border-brutal-black bg-brutal-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black text-brutal-black sm:text-4xl">
              매장 운영에 필요한 모든 기능
            </h2>
            <p className="mt-4 text-lg text-brutal-black/70">
              엑셀, 수기 장부, 여러 앱을 오갈 필요 없이 한 곳에서 관리하세요
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center border-2 border-brutal-black bg-brutal-yellow">
                  <feature.icon className="h-6 w-6 text-brutal-black" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-brutal-black">
                  {feature.title}
                </h3>
                <p className="mt-2 text-brutal-black/70">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-b-3 border-brutal-black bg-brutal-pink px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black text-brutal-black sm:text-4xl">
              왜 매장 관리 시스템인가요?
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center border-3 border-brutal-black bg-brutal-white shadow-brutal">
                  <benefit.icon className="h-8 w-8 text-brutal-black" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-brutal-black">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-brutal-black/80">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-b-3 border-brutal-black bg-brutal-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black text-brutal-black sm:text-4xl">
              시작하는 방법
            </h2>
            <p className="mt-4 text-lg text-brutal-black/70">
              복잡한 설정 없이 4단계로 바로 시작하세요
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal">
                  <div className="text-4xl font-black text-brutal-yellow">
                    {step.step}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-brutal-black">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-brutal-black/70">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block">
                    <ArrowRight className="h-6 w-6 text-brutal-black" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-b-3 border-brutal-black bg-brutal-blue px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black text-brutal-black sm:text-4xl">
              사장님들의 실제 후기
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal"
              >
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-brutal-yellow text-brutal-yellow"
                    />
                  ))}
                </div>
                <p className="mt-4 text-brutal-black/80">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="mt-4 border-t-2 border-brutal-black pt-4">
                  <div className="font-bold text-brutal-black">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-brutal-black/70">
                    {testimonial.business}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="border-b-3 border-brutal-black bg-brutal-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black text-brutal-black sm:text-4xl">
              심플한 요금제
            </h2>
            <p className="mt-4 text-lg text-brutal-black/70">
              필요한 만큼만 사용하세요. 무료 플랜으로 시작할 수 있습니다.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Free Plan */}
            <div className="border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal">
              <h3 className="text-xl font-bold text-brutal-black">무료</h3>
              <div className="mt-4">
                <span className="text-4xl font-black text-brutal-black">
                  0원
                </span>
                <span className="text-brutal-black/70">/월</span>
              </div>
              <ul className="mt-6 space-y-3">
                {[
                  '매장 1개',
                  '사용자 1명',
                  '매입/판매 관리',
                  '기본 리포트',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-brutal-black/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block border-2 border-brutal-black bg-brutal-white px-4 py-3 text-center font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
              >
                무료로 시작
              </Link>
            </div>

            {/* Growth Plan */}
            <div className="relative border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal-lg">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 border-2 border-brutal-black bg-brutal-yellow px-4 py-1 text-sm font-bold">
                인기
              </div>
              <h3 className="text-xl font-bold text-brutal-black">성장</h3>
              <div className="mt-4">
                <span className="text-4xl font-black text-brutal-black">
                  29,000원
                </span>
                <span className="text-brutal-black/70">/월</span>
              </div>
              <ul className="mt-6 space-y-3">
                {[
                  '매장 3개',
                  '사용자 5명',
                  '모든 기본 기능',
                  '재고 관리',
                  '고급 리포트',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-brutal-black/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-center font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
              >
                14일 무료 체험
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal">
              <h3 className="text-xl font-bold text-brutal-black">프로</h3>
              <div className="mt-4">
                <span className="text-4xl font-black text-brutal-black">
                  79,000원
                </span>
                <span className="text-brutal-black/70">/월</span>
              </div>
              <ul className="mt-6 space-y-3">
                {[
                  '매장 10개',
                  '사용자 무제한',
                  '모든 기능',
                  'API 연동',
                  '우선 지원',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-brutal-black/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block border-2 border-brutal-black bg-brutal-white px-4 py-3 text-center font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
              >
                14일 무료 체험
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/pricing"
              className="font-bold text-brutal-black underline underline-offset-4 hover:text-brutal-black/70"
            >
              전체 요금제 비교 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-brutal-black px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-brutal-white sm:text-4xl">
            지금 바로 시작하세요
          </h2>
          <p className="mt-4 text-lg text-brutal-white/80">
            더 이상 복잡한 엑셀과 씨름하지 마세요.
            <br />
            무료로 시작하고, 매장 운영에 집중하세요.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="flex items-center gap-2 border-3 border-brutal-yellow bg-brutal-yellow px-8 py-4 text-lg font-bold text-brutal-black transition-all hover:-translate-x-1 hover:-translate-y-1"
            >
              무료로 시작하기
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 text-lg font-bold text-brutal-white underline underline-offset-4 hover:text-brutal-yellow"
            >
              이미 계정이 있으신가요?
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-brutal-black bg-brutal-white px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-sm text-brutal-black/70">
              2026 매장 관리 시스템. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm">
              <Link
                href="/guide"
                className="text-brutal-black/70 hover:text-brutal-black"
              >
                가이드
              </Link>
              <Link
                href="/pricing"
                className="text-brutal-black/70 hover:text-brutal-black"
              >
                요금제
              </Link>
              <Link
                href="/login"
                className="text-brutal-black/70 hover:text-brutal-black"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
