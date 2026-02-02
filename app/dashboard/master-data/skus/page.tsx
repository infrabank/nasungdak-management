import { getSkus } from './actions'
import SkuForm from './sku-form'
import SkuCard from './sku-card'
import CSVUpload from './csv-upload'
import { formatCurrency } from '@/lib/utils/format'

export default async function SkusPage() {
  const skus = await getSkus()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-brutal-black">SKU 관리</h1>
          <p className="mt-2 text-sm text-brutal-black/70">
            SKU(판매 단위) 등록 및 관리
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <SkuForm />
        </div>
      </div>

      {/* Mobile View */}
      <div className="mt-6 space-y-4 md:hidden">
        {skus.length === 0 ? (
          <div className="border-3 border-dashed border-brutal-black bg-brutal-white py-10 text-center font-medium text-brutal-black/70">
            등록된 SKU가 없습니다
          </div>
        ) : (
          skus.map((sku) => <SkuCard key={sku.id} sku={sku} />)
        )}
      </div>

      {/* Desktop View */}
      <div className="mt-8 hidden md:block">
        <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
          <table className="min-w-full">
            <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black"
                >
                  SKU명
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                >
                  메뉴
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                >
                  판매 단가
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                >
                  설명
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-center text-sm font-black text-brutal-black"
                >
                  활성
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-6">
                  <span className="sr-only">작업</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
              {skus.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm font-medium text-brutal-black"
                  >
                    등록된 SKU가 없습니다
                  </td>
                </tr>
              ) : (
                skus.map((sku) => (
                  <tr key={sku.id}>
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-brutal-black">
                      {sku.skuName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                      {sku.menuName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                      {formatCurrency(Number(sku.unitPrice))}
                    </td>
                    <td className="px-3 py-4 text-sm text-brutal-black/70">
                      {sku.description}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
                      <span
                        className={`inline-flex border-2 px-2 py-1 text-xs font-bold ${
                          sku.isActive
                            ? 'border-brutal-black bg-brutal-green text-brutal-black'
                            : 'border-brutal-black bg-brutal-white text-brutal-black'
                        }`}
                      >
                        {sku.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <SkuForm sku={sku} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
