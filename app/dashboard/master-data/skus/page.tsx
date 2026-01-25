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
      <div className="mt-6 md:hidden space-y-4">
        {skus.length === 0 ? (
          <div className="text-center py-10 font-medium text-brutal-black/70 bg-brutal-white border-3 border-dashed border-brutal-black">
            등록된 SKU가 없습니다
          </div>
        ) : (
          skus.map((sku) => <SkuCard key={sku.id} sku={sku} />)
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
             <table className="min-w-full divide-y divide-brutal-black border-2 border-brutal-black">
              <thead>
                <tr>
                   <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brutal-black sm:pl-0">
                     SKU명
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black">
                     메뉴
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-brutal-black">
                     판매 단가
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black">
                     설명
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-brutal-black">
                     활성
                   </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
               <tbody className="divide-y divide-brutal-black">
                {skus.length === 0 ? (
                  <tr>
                     <td colSpan={6} className="py-10 text-center text-sm text-brutal-black/70">
                       등록된 SKU가 없습니다
                     </td>
                  </tr>
                ) : (
                  skus.map((sku) => (
                    <tr key={sku.id}>
                       <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-0">
                         {sku.skuName}
                       </td>
                       <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                         {sku.menuName}
                       </td>
                       <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right">
                         {formatCurrency(Number(sku.unitPrice))}
                       </td>
                       <td className="px-3 py-4 text-sm text-brutal-black">
                         {sku.description}
                       </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <span
                          className={`inline-flex px-2 text-xs font-semibold leading-5 border-2 ${
                             sku.isActive
                               ? 'bg-brutal-green border-brutal-green text-brutal-black'
                               : 'bg-brutal-white border-brutal-black text-brutal-black'
                           }`}
                        >
                          {sku.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
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
    </div>
  )
}
