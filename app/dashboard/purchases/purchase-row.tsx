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

export default function PurchaseRow({ purchase }: { purchase: Purchase }) {
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
    } catch (error) {
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
      if (result.success) {
        // Page will refresh due to revalidatePath
      } else {
        alert(result.error || '삭제 실패')
        setIsDeleting(false)
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다')
      setIsDeleting(false)
    }
  }

  return (
    <tr className={isDeleting ? 'opacity-50' : ''}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
        {formatDate(new Date(purchase.transactionDate), 'yyyy-MM-dd')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
        {purchase.menuName || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
        {purchase.ingredientName || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
        {purchase.supplierName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 text-right">
        {Number(purchase.quantity).toFixed(2)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 text-right">
        {formatCurrency(Number(purchase.unitPrice))}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-medium">
        {formatCurrency(Number(purchase.totalAmount))}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 transition-colors ${
            isValid
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isToggling ? '...' : isValid ? '유효' : '무효'}
        </button>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? '삭제 중...' : '삭제'}
        </button>
      </td>
    </tr>
  )
}
