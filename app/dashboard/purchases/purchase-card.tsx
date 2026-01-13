'use client'

import { useState } from 'react'
import { togglePurchaseValidation, deletePurchase } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface Purchase {
  id: string
  transactionDate: string
  menuName: string | null
  ingredientName: string | null
  supplierName: string
  quantity: string
  unitPrice: string
  totalAmount: string | null
  isValid: boolean
  notes: string | null
}

export default function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const [isValid, setIsValid] = useState(purchase.isValid)
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggle = async () => {
    if (isToggling) return

    setIsToggling(true)
    try {
      const result = await togglePurchaseValidation(purchase.id)
      if (result.success) {
        setIsValid(!isValid)
      } else {
        alert(result.error || '검증 상태 변경 실패')
      }
    } catch {
      alert('검증 상태 변경 중 오류가 발생했습니다')
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return

    if (!confirm('이 매입 기록을 삭제하시겠습니까?')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deletePurchase(purchase.id)
      if (!result.success) {
        alert(result.error || '삭제 실패')
        setIsDeleting(false)
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다')
      setIsDeleting(false)
    }
  }

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
            {formatDate(new Date(purchase.transactionDate), 'yyyy-MM-dd')}
          </span>
        </div>
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-5 transition-colors ${
            isValid
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isToggling ? '...' : isValid ? '✓ 유효' : '✗ 무효'}
        </button>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Menu & Ingredient */}
        <div className="mb-3">
          <p className="text-lg font-semibold text-gray-900">
            {purchase.menuName || '-'}{' '}
            <span className="text-gray-400">→</span>{' '}
            {purchase.ingredientName || '-'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            🏢 {purchase.supplierName}
          </p>
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">수량</p>
            <p className="text-base font-medium text-gray-900">
              {Number(purchase.quantity).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">단가</p>
            <p className="text-base font-medium text-gray-900">
              {formatCurrency(Number(purchase.unitPrice))}
            </p>
          </div>
        </div>

        {/* Notes */}
        {purchase.notes && (
          <p className="text-sm text-gray-500 py-2 border-t border-gray-100">
            📝 {purchase.notes}
          </p>
        )}

        {/* Total & Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">합계</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(Number(purchase.totalAmount))}
            </p>
          </div>
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
