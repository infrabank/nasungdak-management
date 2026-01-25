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

export default function PurchaseRow({ purchase }: { purchase: Purchase }) {
   const confirm = useConfirm()
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
    'w-full border-2 border-brutal-black py-1 px-2 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal transition-all'
  const selectClass =
    'w-full border-2 border-brutal-black py-1 px-2 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal transition-all'

  if (isEditing) {
    return (
      <tr className="bg-brutal-blue/30">
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
        <td className="whitespace-nowrap px-2 py-2 text-sm text-brutal-black/50 text-right">
          -
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-center text-brutal-black/50">
          -
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-right">
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-2 py-1 text-xs font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal transition-all disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-2 py-1 text-xs font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal transition-all disabled:opacity-50"
            >
              {isSaving ? '...' : '저장'}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`hover:bg-brutal-yellow/20 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-brutal-black sm:pl-6">
        {formatDate(new Date(purchase.transactionDate), 'yyyy-MM-dd')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black">
        {purchase.menuName || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black">
        {purchase.ingredientName || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black">
        {purchase.supplierName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black text-right">
        {Number(purchase.quantity).toFixed(2)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black text-right">
        {formatCurrency(Number(purchase.unitPrice))}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right font-bold">
        {formatCurrency(Number(purchase.totalAmount))}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`inline-flex border-2 border-brutal-black px-2 py-1 text-xs font-bold leading-5 transition-all ${
            isValid
              ? 'bg-brutal-green text-brutal-black hover:shadow-brutal-sm'
              : 'bg-brutal-pink text-brutal-black hover:shadow-brutal-sm'
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
            className="font-bold text-brutal-black underline underline-offset-2 hover:bg-brutal-blue px-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="font-bold text-brutal-black underline underline-offset-2 hover:bg-brutal-pink px-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
