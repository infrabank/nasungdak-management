'use client'

import { useState, useEffect } from 'react'
import { togglePurchaseValidation, deletePurchase, updatePurchase } from './actions'
import { getMenus } from '../master-data/menus/actions'
import { getIngredients } from '../master-data/ingredients/actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { MenuCategory, Ingredient } from '@/lib/db/schema'

interface Purchase {
  id: string
  transactionDate: string
  menuId?: string
  menuName: string | null
  ingredientId?: string
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
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    transactionDate: purchase.transactionDate,
    menuId: purchase.menuId || '',
    ingredientId: purchase.ingredientId || '',
    supplierName: purchase.supplierName,
    quantity: purchase.quantity,
    unitPrice: purchase.unitPrice,
    notes: purchase.notes || '',
  })

  const [menus, setMenus] = useState<MenuCategory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])

  useEffect(() => {
    if (isEditing && menus.length === 0) {
      Promise.all([getMenus(), getIngredients()]).then(([m, i]) => {
        setMenus(m)
        setIngredients(i)
      })
    }
  }, [isEditing, menus.length])

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

  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('transactionDate', editData.transactionDate)
      formData.append('menuId', editData.menuId)
      formData.append('ingredientId', editData.ingredientId)
      formData.append('supplierName', editData.supplierName)
      formData.append('quantity', editData.quantity)
      formData.append('unitPrice', editData.unitPrice)
      formData.append('notes', editData.notes)

      const result = await updatePurchase(purchase.id, formData)
      if (result.success) {
        setIsEditing(false)
      } else {
        alert(result.error || '수정 실패')
      }
    } catch {
      alert('수정 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData({
      transactionDate: purchase.transactionDate,
      menuId: purchase.menuId || '',
      ingredientId: purchase.ingredientId || '',
      supplierName: purchase.supplierName,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      notes: purchase.notes || '',
    })
    setIsEditing(false)
  }

  const inputClass =
    'w-full rounded border-0 py-1 px-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'w-full rounded border-0 py-1 px-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="whitespace-nowrap py-2 pl-4 pr-2 text-sm sm:pl-6">
          <input
            type="date"
            value={editData.transactionDate}
            onChange={(e) => setEditData({ ...editData, transactionDate: e.target.value })}
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <select
            value={editData.menuId}
            onChange={(e) => setEditData({ ...editData, menuId: e.target.value })}
            className={selectClass}
          >
            <option value="">선택</option>
            {menus.filter(m => m.isActive).map((menu) => (
              <option key={menu.id} value={menu.id}>{menu.menuName}</option>
            ))}
          </select>
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <select
            value={editData.ingredientId}
            onChange={(e) => setEditData({ ...editData, ingredientId: e.target.value })}
            className={selectClass}
          >
            <option value="">선택</option>
            {ingredients.filter(i => i.isActive).map((ing) => (
              <option key={ing.id} value={ing.id}>{ing.ingredientName}</option>
            ))}
          </select>
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="text"
            value={editData.supplierName}
            onChange={(e) => setEditData({ ...editData, supplierName: e.target.value })}
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="number"
            step="0.01"
            value={editData.quantity}
            onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
            className={`${inputClass} text-right w-20`}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="number"
            step="1"
            value={editData.unitPrice}
            onChange={(e) => setEditData({ ...editData, unitPrice: e.target.value })}
            className={`${inputClass} text-right w-24`}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500 text-right">
          -
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-center text-gray-500">
          -
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-right">
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 rounded ring-1 ring-gray-300 disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {isSaving ? '...' : '저장'}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={isDeleting ? 'opacity-50' : ''}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
        {formatDate(new Date(purchase.transactionDate), 'yyyy-MM-dd')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
        {purchase.menuName || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
        {purchase.ingredientName || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
        {purchase.supplierName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
        {Number(purchase.quantity).toFixed(2)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
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
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
