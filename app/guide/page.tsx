import Link from 'next/link'
import Image from 'next/image'
import {
  UserPlus,
  LogIn,
  Building2,
  Palette,
  Store,
  Users,
  UtensilsCrossed,
  Package,
  Tag,
  Truck,
  Link2,
  ShoppingCart,
  Receipt,
  BarChart3,
  CheckCircle2,
  Circle,
  HelpCircle,
  ArrowLeft,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react'
import { getUserContext } from '@/lib/auth-context'

export const metadata = {
  title: '설정 가이드 - 매장 관리 시스템',
  description: '매장 관리 시스템 신규 사용자를 위한 단계별 설정 가이드입니다.',
}

const STEPS = [
  {
    number: 1,
    title: '회원가입',
    icon: UserPlus,
    required: true,
    description:
      '웹사이트 접속 후 회원가입 페이지에서 계정을 생성합니다. 이메일 주소, 이름, 비밀번호(8자 이상)를 입력하고 가입을 완료합니다.',
  },
  {
    number: 2,
    title: '로그인',
    icon: LogIn,
    required: true,
    description:
      '가입한 이메일과 비밀번호로 로그인합니다. 로그인에 성공하면 대시보드로 이동합니다.',
  },
  {
    number: 3,
    title: '조직 생성 또는 초대 수락',
    icon: Building2,
    required: true,
    description:
      '조직(Organization)은 데이터를 구분하는 최상위 단위입니다. 직접 조직을 생성하거나, 기존 조직의 관리자로부터 초대를 받아 가입합니다.',
  },
  {
    number: 4,
    title: '조직 브랜딩 설정',
    icon: Palette,
    required: false,
    description:
      '[설정]에서 조직 로고를 업로드할 수 있습니다. PNG, JPG, GIF, SVG, WebP 형식을 지원하며 최대 2MB까지 가능합니다.',
  },
  {
    number: 5,
    title: '매장 생성',
    icon: Store,
    required: true,
    description:
      '[매장 관리]에서 매장을 추가합니다. 매장명은 필수이며, 매입/판매 데이터가 저장되는 단위이므로 최소 1개 이상 생성해야 합니다.',
  },
  {
    number: 6,
    title: '매장 권한 할당',
    icon: Users,
    required: true,
    description:
      '관리자가 사용자에게 매장 접근 권한을 부여해야 합니다. [설정] - [팀 멤버]에서 멤버를 초대하고 권한을 관리합니다.',
  },
  {
    number: 7,
    title: '메뉴 카테고리 등록',
    icon: UtensilsCrossed,
    required: true,
    description:
      '[기초데이터] - [메뉴]에서 메뉴 카테고리를 등록합니다. 예: "치킨", "사이드", "음료" 등. CSV 일괄 업로드도 가능합니다.',
  },
  {
    number: 8,
    title: '재료 등록',
    icon: Package,
    required: true,
    description:
      '[기초데이터] - [재료]에서 원재료를 등록합니다. 재료명과 단위(kg, L, 개 등)를 입력합니다.',
  },
  {
    number: 9,
    title: 'SKU 등록',
    icon: Tag,
    required: true,
    description:
      '[기초데이터] - [SKU]에서 실제 판매 상품을 등록합니다. SKU명, 연결할 메뉴, 판매 단가를 입력합니다.',
  },
  {
    number: 10,
    title: '공급업체 등록',
    icon: Truck,
    required: false,
    description:
      '[기초데이터] - [공급업체]에서 매입처 정보를 등록합니다. 업체명, 연락처, 주요 품목 등을 기록합니다.',
  },
  {
    number: 11,
    title: '메뉴-재료 매핑',
    icon: Link2,
    required: false,
    description:
      '[기초데이터] - [메뉴-재료]에서 메뉴와 재료의 연결 관계를 설정합니다. 매입 등록 시 조합 검증에 활용됩니다.',
  },
  {
    number: 12,
    title: '매입 등록 시작',
    icon: ShoppingCart,
    required: true,
    description:
      '[매입 관리]에서 일일 원재료 매입 내역을 기록합니다. 날짜, 메뉴, 재료, 수량, 단가를 입력합니다.',
  },
  {
    number: 13,
    title: '판매 등록 시작',
    icon: Receipt,
    required: true,
    description:
      '[판매 관리]에서 일일 판매 내역을 기록합니다. 날짜, SKU, 판매 수량을 입력하면 금액이 자동 계산됩니다.',
  },
  {
    number: 14,
    title: '대시보드 확인',
    icon: BarChart3,
    required: true,
    description:
      '모든 설정이 완료되면 대시보드에서 매출 현황, 매입 대비 수익률, 주요 지표를 확인할 수 있습니다.',
  },
]

const FAQ = [
  {
    q: '기초 데이터가 보이지 않습니다',
    a: '조직(Organization)에 소속되지 않은 경우입니다. 관리자에게 조직 초대를 요청한 후 로그아웃하고 다시 로그인하세요.',
  },
  {
    q: '매입/판매 데이터가 보이지 않습니다',
    a: '매장 권한이 할당되지 않은 경우입니다. 관리자에게 매장 접근 권한을 요청한 후 로그아웃하고 다시 로그인하세요.',
  },
  {
    q: '새로 등록한 데이터가 목록에 표시되지 않습니다',
    a: '브라우저 캐시 문제일 수 있습니다. 페이지를 새로고침(F5)하거나 강력 새로고침(Ctrl+Shift+R)을 시도하세요.',
  },
  {
    q: '로그인이 되지 않습니다',
    a: '비밀번호를 여러 번 틀리면 일시적으로 차단됩니다. 5분 후 다시 시도하거나 관리자에게 비밀번호 초기화를 요청하세요.',
  },
]

export default async function GuidePage() {
  const userContext = await getUserContext()
  const isLoggedIn = userContext.isAuthenticated

  return (
    <div className="min-h-screen bg-brutal-white">
      {/* Header */}
      <header className="border-b-3 border-brutal-black bg-brutal-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="border-2 border-brutal-black bg-brutal-yellow p-2 shadow-brutal-sm">
                <Image
                  src="/images/logo.png"
                  alt="logo"
                  width={32}
                  height={32}
                  className="h-auto w-auto"
                />
              </div>
              <span className="text-lg font-bold text-brutal-black">
                매장 관리
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  대시보드
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-bold text-brutal-black hover:underline"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
                  >
                    시작하기
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b-3 border-brutal-black bg-brutal-yellow/20 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="border-2 border-brutal-black bg-brutal-yellow p-3">
              <BookOpen className="h-8 w-8 text-brutal-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-brutal-black sm:text-4xl">
                신규 사용자 설정 가이드
              </h1>
              <p className="mt-2 text-brutal-black/70">
                아래 단계를 순서대로 진행하면 시스템을 정상적으로 사용할 수
                있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Legend */}
      <section className="border-b-2 border-brutal-black/20 bg-brutal-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium text-brutal-black">필수</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="h-5 w-5 text-brutal-black/40" />
            <span className="font-medium text-brutal-black/70">선택</span>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-4">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className={`border-2 border-brutal-black bg-brutal-white p-5 transition-all hover:shadow-brutal ${
                    step.required ? '' : 'border-dashed'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-brutal-black ${
                        step.required ? 'bg-brutal-yellow' : 'bg-gray-100'
                      }`}
                    >
                      <Icon className="h-6 w-6 text-brutal-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-brutal-black/50">
                          STEP {step.number}
                        </span>
                        {step.required ? (
                          <span className="border border-green-600 bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
                            필수
                          </span>
                        ) : (
                          <span className="border border-brutal-black/30 bg-gray-50 px-2 py-0.5 text-xs font-bold text-brutal-black/50">
                            선택
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-lg font-bold text-brutal-black">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-brutal-black/70">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Data Structure */}
      <section className="border-y-3 border-brutal-black bg-brutal-black px-4 py-12 text-brutal-white">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold">데이터 구조</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border-2 border-brutal-white/30 bg-brutal-white/10 p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-brutal-yellow">
                <Building2 className="h-5 w-5" />
                조직 (Organization)
              </h3>
              <div className="space-y-3 text-sm">
                <div className="border-l-2 border-brutal-yellow/50 pl-4">
                  <p className="font-medium text-brutal-white">
                    기초 데이터 (조직 단위로 공유)
                  </p>
                  <ul className="mt-2 space-y-1 text-brutal-white/70">
                    <li>- 메뉴 카테고리</li>
                    <li>- 재료</li>
                    <li>- SKU</li>
                    <li>- 공급업체</li>
                    <li>- 메뉴-재료 매핑</li>
                  </ul>
                </div>
                <div className="border-l-2 border-brutal-yellow/50 pl-4">
                  <p className="font-medium text-brutal-white">
                    매장 (Store) - 거래 데이터
                  </p>
                  <ul className="mt-2 space-y-1 text-brutal-white/70">
                    <li>- 매입 내역</li>
                    <li>- 판매 내역</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border-2 border-brutal-white/30 bg-brutal-white/10 p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-brutal-yellow">
                <Users className="h-5 w-5" />
                사용자 (User)
              </h3>
              <div className="space-y-3 text-sm">
                <div className="border-l-2 border-brutal-yellow/50 pl-4">
                  <p className="font-medium text-brutal-white">조직 멤버십</p>
                  <p className="mt-1 text-brutal-white/70">
                    기초 데이터 접근 권한
                  </p>
                </div>
                <div className="border-l-2 border-brutal-yellow/50 pl-4">
                  <p className="font-medium text-brutal-white">매장 할당</p>
                  <p className="mt-1 text-brutal-white/70">
                    거래 데이터 접근 권한
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-brutal-black">
            <HelpCircle className="h-7 w-7" />
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            {FAQ.map((faq, index) => (
              <div
                key={index}
                className="border-2 border-brutal-black bg-brutal-white p-5"
              >
                <h3 className="font-bold text-brutal-black">{faq.q}</h3>
                <p className="mt-2 text-sm text-brutal-black/70">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-3 border-brutal-black bg-brutal-yellow px-4 py-12">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-brutal-black">
            준비되셨나요?
          </h2>
          <p className="mt-2 text-brutal-black/70">
            지금 바로 회원가입하고 매장 관리를 시작하세요.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="border-2 border-brutal-black bg-brutal-black px-8 py-3 font-bold text-brutal-white transition-colors hover:bg-brutal-black/90"
            >
              회원가입
            </Link>
            <Link
              href="/login"
              className="border-2 border-brutal-black bg-brutal-white px-8 py-3 font-bold text-brutal-black transition-all hover:shadow-brutal"
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-brutal-black bg-brutal-white px-4 py-6">
        <div className="mx-auto max-w-5xl text-center text-sm text-brutal-black/70">
          <p>2024 매장 관리 시스템. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
