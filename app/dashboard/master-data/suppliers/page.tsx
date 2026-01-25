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
        <div className="hidden md:block">
          <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
            <table className="min-w-full">
              <thead className="bg-brutal-yellow border-b-3 border-brutal-black">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black">
                    공급업체명
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                    담당자
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                    연락처
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                    사업자번호
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-sm font-black text-brutal-black">
                    활성
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm font-medium text-brutal-black">
                      등록된 공급업체가 없습니다
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-brutal-black">
                        {supplier.supplierName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                        {supplier.contactName || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                        {supplier.phone || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
                        {supplier.businessNumber || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-bold border-2 ${
                            supplier.isActive
                              ? 'bg-brutal-green border-brutal-black text-brutal-black'
                              : 'bg-brutal-white border-brutal-black text-brutal-black'
                          }`}
                        >
                          {supplier.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
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
