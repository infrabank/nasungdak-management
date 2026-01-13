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

export default function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const [isValid, setIsValid] = useState(purchase.isValid)
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Edit form state
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
    'block w-full rounded-lg border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'block w-full rounded-lg border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-blue-500 ring-2 overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="font-medium text-blue-900">매입 수정</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">날짜</label>
            <input
              type="date"
              value={editData.transactionDate}
              onChange={(e) => setEditData({ ...editData, transactionDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">메뉴</label>
            <select
              value={editData.menuId}
              onChange={(e) => setEditData({ ...editData, menuId: e.target.value })}
              className={selectClass}
            >
              <option value="">선택하세요</option>
              {menus.filter(m => m.isActive).map((menu) => (
                <option key={menu.id} value={menu.id}>{menu.menuName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">재료</label>
            <select
              value={editData.ingredientId}
              onChange={(e) => setEditData({ ...editData, ingredientId: e.target.value })}
              className={selectClass}
            >
              <option value="">선택하세요</option>
              {ingredients.filter(i => i.isActive).map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.ingredientName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">공급업체</label>
            <input
              type="text"
              value={editData.supplierName}
              onChange={(e) => setEditData({ ...editData, supplierName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">수량</label>
              <input
                type="number"
                step="0.01"
                value={editData.quantity}
                onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">단가</label>
              <input
                type="number"
                step="1"
                value={editData.unitPrice}
                onChange={(e) => setEditData({ ...editData, unitPrice: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비고</label>
            <input
              type="text"
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    )
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
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              수정
            </button>
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
    </div>
  )
}
