'use client'

import { useState } from 'react'
import SalesRow from './sales-row'
import SalesCard from './sales-card'
import { bulkDeleteSalesRecords } from './actions'
import { formatCurrency } from '@/lib/utils/format'

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
  totalQuantity: number
  totalRevenue: number
}

export default function SalesList({
  sales,
  totalQuantity,
  totalRevenue,
}: SalesListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSelectAll = () => {
    if (selectedIds.size === sales.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sales.map((s) => s.id)))
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

    if (
      !confirm(`선택한 ${selectedIds.size}건의 판매 기록을 삭제하시겠습니까?`)
    ) {
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
    <div className="mt-6">
      {/* Summary - Sticky on Mobile */}
      {sales.length > 0 && (
        <div className="sticky top-0 z-10 mb-4 md:static">
          <div className="bg-green-50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">
                  총 {sales.length}건
                </p>
                <p className="text-xs text-green-500">
                  판매량 합계: {totalQuantity}개
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-600">총 매출액</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedIds.size}개 항목 선택됨
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '선택 삭제'}
          </button>
        </div>
      )}

      {/* Mobile: Card List */}
      <div className="md:hidden">
        {sales.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-8 text-center">
            <p className="text-gray-500">판매 데이터가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">
              일일 판매 입력 버튼을 클릭하여 시작하세요.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Select All */}
            <div className="flex items-center justify-between mb-3 px-1">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected
                    }
                  }}
                  onChange={handleSelectAll}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                전체 선택
              </label>
              <span className="text-sm text-gray-500">
                {selectedIds.size > 0 && `${selectedIds.size}개 선택`}
              </span>
            </div>

            <div className="space-y-3">
              {sales.map((sale) => (
                <SalesCard
                  key={sale.id}
                  sale={sale}
                  isSelected={selectedIds.has(sale.id)}
                  onToggleSelect={() => handleSelectOne(sale.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = someSelected
                          }
                        }}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      날짜
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      메뉴
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      SKU
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                    >
                      판매량
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                    >
                      단가
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                    >
                      매출액
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">삭제</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-sm text-gray-500"
                      >
                        판매 데이터가 없습니다. &ldquo;일일 판매 입력&rdquo;
                        버튼을 클릭하여 시작하세요.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {sales.map((sale) => (
                        <SalesRow
                          key={sale.id}
                          sale={sale}
                          isSelected={selectedIds.has(sale.id)}
                          onToggleSelect={() => handleSelectOne(sale.id)}
                        />
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="py-4 pl-4 pr-3 text-sm sm:pl-6"></td>
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-sm text-right text-gray-900"
                        >
                          합계
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                          {totalQuantity}개
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                          -
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                          {formatCurrency(totalRevenue)}
                        </td>
                        <td></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
