'use client'

import { useState } from 'react'
import SalesRow from './sales-row'
import { bulkDeleteSalesRecords } from './actions'

interface Sale {
  id: string
  saleDate: string
  skuName: string | null
  menuName: string | null
  quantitySold: string
  unitPrice: string | null
  totalRevenue: string | null
}

interface SalesListProps {
  sales: Sale[]
}

export default function SalesList({ sales }: SalesListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSelectAll = () => {
    if (selectedIds.size === sales.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sales.map(s => s.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert('삭제할 항목을 선택해주세요')
      return
    }

    if (!confirm(`선택한 ${selectedIds.size}건의 판매 기록을 삭제하시겠습니까?`)) {
      return
    }

    setIsDeleting(true)
    const result = await bulkDeleteSalesRecords(Array.from(selectedIds))

    if (result.success) {
      setSelectedIds(new Set())
      alert(`${result.deletedCount}건이 삭제되었습니다`)
    } else {
      alert(result.error || '삭제에 실패했습니다')
    }
    setIsDeleting(false)
  }

  const allSelected = sales.length > 0 && selectedIds.size === sales.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < sales.length

  return (
    <div className="mt-8 flow-root">
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedIds.size}개 항목 선택됨
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '선택 항목 삭제'}
          </button>
        </div>
      )}

      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = someSelected
                      }
                    }}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                  />
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  날짜
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  메뉴
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  SKU
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  판매량
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  단가
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  매출액
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-800">
                    판매 데이터가 없습니다. &ldquo;일일 판매 입력&rdquo; 버튼을 클릭하여 시작하세요.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <SalesRow
                    key={sale.id}
                    sale={sale}
                    isSelected={selectedIds.has(sale.id)}
                    onToggleSelect={() => handleSelectOne(sale.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
