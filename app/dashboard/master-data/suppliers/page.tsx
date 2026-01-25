import { getSuppliers } from './actions'
import SupplierForm from './supplier-form'
import SupplierCard from './supplier-card'

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
           <h1 className="text-3xl font-bold text-brutal-black">공급업체 관리</h1>
           <p className="mt-2 text-sm text-brutal-black/70">
             거래처 정보 등록 및 관리
           </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <SupplierForm />
        </div>
      </div>

      <div className="mt-8 flow-root">
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4">
          {suppliers.length === 0 ? (
            <div className="text-center py-10 bg-brutal-white border-3 border-dashed border-brutal-black">
              <p className="font-medium text-brutal-black/70">등록된 공급업체가 없습니다</p>
            </div>
          ) : (
            suppliers.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block -mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
             <table className="min-w-full divide-y divide-brutal-black border-2 border-brutal-black">
              <thead>
                <tr>
                   <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brutal-black sm:pl-0">
                     공급업체명
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black">
                     담당자
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black">
                     연락처
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black">
                     사업자번호
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
                {suppliers.length === 0 ? (
                  <tr>
                     <td colSpan={6} className="py-10 text-center text-sm text-brutal-black/70">
                       등록된 공급업체가 없습니다
                     </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                       <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-0">
                         {supplier.supplierName}
                       </td>
                       <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                         {supplier.contactName || '-'}
                       </td>
                       <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                         {supplier.phone || '-'}
                       </td>
                       <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                         {supplier.businessNumber || '-'}
                       </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <span
                          className={`inline-flex px-2 text-xs font-semibold leading-5 border-2 ${
                             supplier.isActive
                               ? 'bg-brutal-green border-brutal-green text-brutal-black'
                               : 'bg-brutal-white border-brutal-black text-brutal-black'
                           }`}
                        >
                          {supplier.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <SupplierForm supplier={supplier} />
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
