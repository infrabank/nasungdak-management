import Link from 'next/link'
import { redirect } from 'next/navigation'
import SalesForm from './sales-form'
import { getActiveStores } from '../../stores/actions'
import { Store } from 'lucide-react'

interface SearchParams {
  storeId?: string
}

export default async function DailySalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const urlStoreId = params.storeId

  // 사용자의 권한 있는 매장 목록 조회
  const stores = await getActiveStores()

  // 매장이 없으면 안내 메시지 표시
  if (stores.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/dashboard/sales"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-yellow p-8 text-center shadow-brutal">
          <Store className="mx-auto h-12 w-12 text-brutal-black" />
          <h2 className="mt-4 text-xl font-bold text-brutal-black">
            등록된 매장이 없습니다
          </h2>
          <p className="mt-2 text-sm text-brutal-black/70">
            먼저 매장을 등록해주세요
          </p>
          <Link
            href="/dashboard/stores/new"
            className="mt-4 inline-block border-2 border-brutal-black bg-brutal-white px-6 py-2 font-bold text-brutal-black shadow-brutal transition-all hover:shadow-brutal-lg"
          >
            매장 등록하기
          </Link>
        </div>
      </div>
    )
  }

  // 매장이 1개면 자동 선택
  let storeId = urlStoreId
  if (!storeId && stores.length === 1) {
    storeId = stores[0].id
  }

  // 매장이 여러 개인데 선택되지 않았으면 선택 화면 표시
  if (!storeId && stores.length > 1) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/dashboard/sales"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>

        <div className="mb-6 md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">일일 판매 입력</h1>
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-brutal-black bg-brutal-yellow">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brutal-black">
                매장을 선택해주세요
              </h2>
              <p className="text-sm text-brutal-black/70">
                판매 기록을 입력할 매장을 선택합니다
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/dashboard/sales/daily?storeId=${store.id}`}
                className="flex items-center gap-3 border-2 border-brutal-black bg-brutal-white p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-brutal-yellow/10 hover:shadow-brutal-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center border-2 border-brutal-black bg-brutal-pink/30 text-lg font-bold">
                  {store.storeName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-brutal-black">
                    {store.storeName}
                  </div>
                  <div className="text-xs text-brutal-black/50">
                    {store.storeCode}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // storeId가 유효한지 확인
  const selectedStore = stores.find((s) => s.id === storeId)
  if (!selectedStore && storeId) {
    // URL의 storeId가 유효하지 않으면 선택 화면으로 리다이렉트
    redirect('/dashboard/sales/daily')
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={
            storeId ? `/dashboard/sales?storeId=${storeId}` : '/dashboard/sales'
          }
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          ← 목록으로 돌아가기
        </Link>
      </div>

      <div className="mb-6 md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">일일 판매 입력</h1>
          {selectedStore && (
            <p className="mt-1 text-sm text-brutal-black/70">
              📍 {selectedStore.storeName}
              {stores.length > 1 && (
                <Link
                  href="/dashboard/sales/daily"
                  className="ml-2 text-blue-600 hover:underline"
                >
                  (매장 변경)
                </Link>
              )}
            </p>
          )}
        </div>
      </div>

      <SalesForm storeId={storeId!} />
    </div>
  )
}
