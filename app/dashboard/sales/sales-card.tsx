'use client'

import { useState } from 'react'
import { deleteSalesRecord } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface SalesRecord {
  id: string
  saleDate: string
  skuName: string | null
  menuName: string | null
  quantitySold: string
  unitPrice: string | null
  totalRevenue: string | null
}

interface SalesCardProps {
  sale: SalesRecord
  isSelected: boolean
  onToggleSelect: () => void
}

export default function SalesCard({
  sale,
  isSelected,
  onToggleSelect,
}: SalesCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('이 판매 기록을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteSalesRecord(sale.id)

    if (!result.success) {
      alert(`삭제 실패: ${result.error}`)
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm ring-1 overflow-hidden transition-all ${
        isSelected ? 'ring-blue-500 ring-2' : 'ring-gray-900/5'
      } ${isDeleting ? 'opacity-50' : ''}`}
    >
      {/* Card Header */}
      <div
        className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100 cursor-pointer"
        onClick={onToggleSelect}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
          />
          <div>
            <p className="text-sm text-gray-500">
              📅 {formatDate(sale.saleDate, 'yyyy-MM-dd')}
            </p>
          </div>
        </div>
        <span className="text-lg font-bold text-green-600">
          {formatCurrency(Number(sale.totalRevenue))}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Menu & SKU */}
        <div className="mb-3">
          <p className="text-lg font-semibold text-gray-900">
            {sale.menuName || '-'}
          </p>
          <p className="text-sm text-gray-500">{sale.skuName || '-'}</p>
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              판매량
            </p>
            <p className="text-base font-medium text-gray-900">
              {sale.quantitySold}개
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              단가
            </p>
            <p className="text-base font-medium text-gray-900">
              {formatCurrency(Number(sale.unitPrice))}
            </p>
          </div>
        </div>

        {/* Delete Action */}
        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
