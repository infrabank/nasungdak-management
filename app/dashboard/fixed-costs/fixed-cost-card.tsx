'use client'

import { useState } from 'react'
import { deleteFixedCost } from './actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { FixedCost } from '@/lib/db/schema'

interface FixedCostCardProps {
  cost: FixedCost
}

export default function FixedCostCard({ cost }: FixedCostCardProps) {
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

  const getCostTypeStyle = (type: string) => {
    switch (type) {
      case '인건비':
        return { bg: 'bg-blue-100 text-blue-800', emoji: '👷' }
      case '임대료':
        return { bg: 'bg-purple-100 text-purple-800', emoji: '🏠' }
      case '관리비':
        return { bg: 'bg-green-100 text-green-800', emoji: '🔧' }
      case '기타':
        return { bg: 'bg-gray-100 text-gray-800', emoji: '📋' }
      default:
        return { bg: 'bg-gray-100 text-gray-800', emoji: '📋' }
    }
  }

  const typeStyle = getCostTypeStyle(cost.costType)

  return (
    <div
      className={`bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden ${
        isDeleting ? 'opacity-50' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">📅</span>
          <span className="font-medium text-gray-900">
            {formatDate(new Date(cost.costDate), 'yyyy-MM-dd')}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${typeStyle.bg}`}
        >
          {typeStyle.emoji} {cost.costType}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Cost Name */}
        <p className="text-lg font-semibold text-gray-900 mb-3">
          {cost.costName}
        </p>

        {/* Amount */}
        <div className="bg-red-50 rounded-lg p-3 mb-3">
          <p className="text-xs text-red-600 uppercase tracking-wide">금액</p>
          <p className="text-2xl font-bold text-red-700">
            {formatCurrency(Number(cost.amount))}
          </p>
        </div>

        {/* Notes */}
        {cost.notes && (
          <div className="py-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              비고
            </p>
            <p className="text-sm text-gray-700">{cost.notes}</p>
          </div>
        )}

        {/* Actions */}
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
