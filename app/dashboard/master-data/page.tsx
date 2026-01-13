import Link from 'next/link'

export default function MasterDataPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">기초 데이터 관리</h1>
        <p className="mt-2 text-sm text-gray-800">
          메뉴, 재료, SKU 등 기초 데이터 설정
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Menu Categories Card */}
        <Link
          href="/dashboard/master-data/menus"
          className="block bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">메뉴 카테고리</h3>
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-900">
            메뉴 카테고리 등록 및 관리
          </p>
        </Link>

        {/* Ingredients Card */}
        <Link
          href="/dashboard/master-data/ingredients"
          className="block bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">재료</h3>
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-900">
            재료 등록 및 관리
          </p>
        </Link>

        {/* SKUs Card */}
        <Link
          href="/dashboard/master-data/skus"
          className="block bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">SKU</h3>
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-900">
            SKU(판매 단위) 등록 및 관리
          </p>
        </Link>

        {/* Menu Ingredients Card */}
        <Link
          href="/dashboard/master-data/menu-ingredients"
          className="block bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">메뉴-재료 매핑</h3>
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-900">
            메뉴별 필요 재료 및 수량 설정
          </p>
        </Link>

        {/* Cost Distribution Rules Card */}
        <Link
          href="/dashboard/master-data/cost-rules"
          className="block bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">원가 배분 규칙</h3>
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-900">
            재료별 원가 배분 비율 설정
          </p>
        </Link>

        {/* Suppliers Card */}
        <Link
          href="/dashboard/master-data/suppliers"
          className="block bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">공급업체</h3>
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-900">
            거래처 정보 등록 및 관리
          </p>
        </Link>
      </div>
    </div>
  )
}
