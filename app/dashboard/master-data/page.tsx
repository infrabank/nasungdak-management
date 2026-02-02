import Link from 'next/link'

export default function MasterDataPage() {
  const cardColors = [
    'bg-brutal-yellow',
    'bg-brutal-green',
    'bg-brutal-blue',
    'bg-brutal-pink',
    'bg-brutal-purple',
    'bg-brutal-white',
  ]

  const items = [
    {
      href: '/dashboard/master-data/menus',
      title: '메뉴 카테고리',
      desc: '메뉴 카테고리 등록 및 관리',
    },
    {
      href: '/dashboard/master-data/ingredients',
      title: '재료',
      desc: '재료 등록 및 관리',
    },
    {
      href: '/dashboard/master-data/skus',
      title: 'SKU',
      desc: 'SKU(판매 단위) 등록 및 관리',
    },
    {
      href: '/dashboard/master-data/menu-ingredients',
      title: '메뉴-재료 매핑',
      desc: '메뉴별 필요 재료 및 수량 설정',
    },
    {
      href: '/dashboard/master-data/cost-rules',
      title: '원가 배분 규칙',
      desc: '재료별 원가 배분 비율 설정',
    },
    {
      href: '/dashboard/master-data/suppliers',
      title: '공급업체',
      desc: '거래처 정보 등록 및 관리',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-brutal-black">
          기초 데이터 관리
        </h1>
        <p className="mt-2 text-sm font-medium text-brutal-black">
          메뉴, 재료, SKU 등 기초 데이터 설정
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block ${cardColors[index]} border-3 border-brutal-black p-6 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-brutal-black">
                {item.title}
              </h3>
              <svg
                className="h-6 w-6 text-brutal-black"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-brutal-black">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
