import Link from 'next/link'
import { redirect } from 'next/navigation'
import ClosingForm from './closing-form'
import { getActiveStores } from '../stores/actions'
import { Store } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SearchParams {
  storeId?: string
}

export default async function ClosingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const urlStoreId = params.storeId

  const stores = await getActiveStores()

  if (stores.length === 0) {
    return (
      <div>
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

  let storeId = urlStoreId
  if (!storeId && stores.length === 1) {
    storeId = stores[0].id
  }

  if (!storeId && stores.length > 1) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">일일 마감</h1>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal">
          <h2 className="mb-4 text-lg font-bold text-brutal-black">
            마감할 매장을 선택해주세요
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/dashboard/closing?storeId=${store.id}`}
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

  const selectedStore = stores.find((s) => s.id === storeId)
  if (!selectedStore && storeId) {
    redirect('/dashboard/closing')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">일일 마감</h1>
        <p className="mt-1 text-sm text-brutal-black/70">
          영업 종료 후 오늘 매출과 판매량을 확정합니다
          {selectedStore && stores.length > 1 && (
            <>
              {' · '}
              {selectedStore.storeName}{' '}
              <Link
                href="/dashboard/closing"
                className="text-blue-600 hover:underline"
              >
                (매장 변경)
              </Link>
            </>
          )}
        </p>
      </div>

      <ClosingForm storeId={storeId!} />
    </div>
  )
}
