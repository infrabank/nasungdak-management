'use client'

import { useState } from 'react'
import { deleteFixedCost } from './actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { FixedCost } from '@/lib/db/schema'

interface FixedCostRowProps {
  cost: FixedCost
}

export default function FixedCostRow({ cost }: FixedCostRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('이 고정비 기록을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteFixedCost(cost.id)

    if (!result.success) {
      alert(result.error || '삭제에 실패했습니다')
      setIsDeleting(false)
    }
  }

  const getCostTypeBadgeColor = (type: string) => {
    switch (type) {
      case '인건비':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20'
      case '임대료':
        return 'bg-purple-50 text-purple-700 ring-purple-600/20'
      case '관리비':
        return 'bg-green-50 text-green-700 ring-green-600/20'
      case '기타':
        return 'bg-gray-50 text-gray-700 ring-gray-600/20'
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-600/20'
    }
  }

  return (
    <tr>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
        {formatDate(new Date(cost.costDate), 'yyyy-MM-dd')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getCostTypeBadgeColor(cost.costType)}`}
        >
          {cost.costType}
        </span>
      </td>
      <td className="px-3 py-4 text-sm text-gray-900">
        {cost.costName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-semibold">
        {formatCurrency(Number(cost.amount))}
      </td>
      <td className="px-3 py-4 text-sm text-gray-900 max-w-xs truncate">
        {cost.notes || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-900 disabled:opacity-50"
        >
          {isDeleting ? '삭제 중...' : '삭제'}
        </button>
      </td>
    </tr>
  )
}
