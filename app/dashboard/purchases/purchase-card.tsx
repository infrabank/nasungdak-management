'use client'

import { useState, useEffect } from 'react'
import { togglePurchaseValidation, deletePurchase, updatePurchase } from './actions'
import { getMenus } from '../master-data/menus/actions'
import { getIngredients } from '../master-data/ingredients/actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
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
   const confirm = useConfirm()
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
         toast.error(result.error || '검증 상태 변경 실패')
       }
     } catch {
       toast.error('검증 상태 변경 중 오류가 발생했습니다')
     } finally {
       setIsToggling(false)
     }
   }

   const handleDelete = async () => {
     if (isDeleting) return

     if (!(await confirm({ title: '확인', description: '이 매입 기록을 삭제하시겠습니까?', variant: 'danger' }))) {
       return
     }

     setIsDeleting(true)
     try {
       const result = await deletePurchase(purchase.id)
       if (!result.success) {
         toast.error(result.error || '삭제 실패')
         setIsDeleting(false)
       }
     } catch {
       toast.error('삭제 중 오류가 발생했습니다')
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
         toast.success('수정되었습니다')
       } else {
         toast.error(result.error || '수정 실패')
       }
     } catch {
       toast.error('수정 중 오류가 발생했습니다')
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
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const selectClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'

  if (isEditing) {
    return (
      <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden">
        <div className="p-4 bg-brutal-blue border-b-3 border-brutal-black">
          <p className="font-bold text-brutal-black">매입 수정</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">날짜</label>
            <input
              type="date"
              value={editData.transactionDate}
              onChange={(e) => setEditData({ ...editData, transactionDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">메뉴</label>
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
            <label className="block text-xs font-bold text-brutal-black mb-1">재료</label>
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
            <label className="block text-xs font-bold text-brutal-black mb-1">공급업체</label>
            <input
              type="text"
              value={editData.supplierName}
              onChange={(e) => setEditData({ ...editData, supplierName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brutal-black mb-1">수량</label>
              <input
                type="number"
                step="0.01"
                value={editData.quantity}
                onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brutal-black mb-1">단가</label>
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
            <label className="block text-xs font-bold text-brutal-black mb-1">비고</label>
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
              className="flex-1 px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50"
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
      className={`bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden ${
        isDeleting ? 'opacity-50' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-brutal-yellow/30 border-b-2 border-brutal-black">
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <span className="font-bold text-brutal-black">
            {formatDate(new Date(purchase.transactionDate), 'yyyy-MM-dd')}
          </span>
        </div>
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`inline-flex border-2 border-brutal-black px-3 py-1 text-xs font-bold leading-5 transition-all ${
            isValid
              ? 'bg-brutal-green text-brutal-black hover:shadow-brutal-sm'
              : 'bg-brutal-pink text-brutal-black hover:shadow-brutal-sm'
          } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isToggling ? '...' : isValid ? '✓ 유효' : '✗ 무효'}
        </button>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Menu & Ingredient */}
        <div className="mb-3">
          <p className="text-lg font-bold text-brutal-black">
            {purchase.menuName || '-'}{' '}
            <span className="text-brutal-black/50">→</span>{' '}
            {purchase.ingredientName || '-'}
          </p>
          <p className="text-sm font-medium text-brutal-black/70 mt-1">
            🏢 {purchase.supplierName}
          </p>
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t-2 border-brutal-black/20">
          <div>
            <p className="text-xs font-bold text-brutal-black/70 uppercase tracking-wide">수량</p>
            <p className="text-base font-bold text-brutal-black">
              {Number(purchase.quantity).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-brutal-black/70 uppercase tracking-wide">단가</p>
            <p className="text-base font-bold text-brutal-black">
              {formatCurrency(Number(purchase.unitPrice))}
            </p>
          </div>
        </div>

        {/* Notes */}
        {purchase.notes && (
          <p className="text-sm font-medium text-brutal-black/70 py-2 border-t-2 border-brutal-black/20">
            📝 {purchase.notes}
          </p>
        )}

        {/* Total & Actions */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-brutal-black/20">
          <div>
            <p className="text-xs font-bold text-brutal-black/70 uppercase tracking-wide">합계</p>
            <p className="text-xl font-black text-brutal-black">
              {formatCurrency(Number(purchase.totalAmount))}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-blue border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              수정
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-pink border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
