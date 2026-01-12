import Link from 'next/link'
import SalesForm from './sales-form'

interface SearchParams {
  storeId?: string
}

export default async function DailySalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  return (
    <div>
      <div className="mb-6">
        <Link
          href={storeId ? `/dashboard/sales?storeId=${storeId}` : '/dashboard/sales'}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          ← 목록으로 돌아가기
        </Link>
      </div>

      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">일일 판매 입력</h1>
        </div>
      </div>

      <SalesForm storeId={storeId} />
    </div>
  )
}
