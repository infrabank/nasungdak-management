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

interface SalesRowProps {
  sale: SalesRecord
  isSelected: boolean
  onToggleSelect: () => void
}

export default function SalesRow({ sale, isSelected, onToggleSelect }: SalesRowProps) {
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
    <tr className={isDeleting ? 'opacity-50' : ''}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
        {formatDate(sale.saleDate, 'yyyy-MM-dd')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
        {sale.menuName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
        {sale.skuName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
        {sale.quantitySold}개
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
        {formatCurrency(Number(sale.unitPrice))}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-medium">
        {formatCurrency(Number(sale.totalRevenue))}
      </td>
      <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm sm:pr-0">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isDeleting ? '삭제 중...' : '삭제'}
        </button>
      </td>
    </tr>
  )
}
