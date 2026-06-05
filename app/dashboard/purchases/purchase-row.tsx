'use client'

import { useState, useEffect } from 'react'
import { deletePurchase, updatePurchase } from './actions'
import { getIngredients } from '../master-data/ingredients/actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
import type { Ingredient } from '@/lib/db/schema'

interface Purchase {
  id: string
  transactionDate: string
  menuId?: string | null
  menuName: string | null
  ingredientId?: string
  ingredientName: string | null
  supplierName: string
  quantity: string
  unitPrice: string
  totalAmount: string | null
  notes: string | null
}

export default function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const confirm = useConfirm()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    transactionDate: purchase.transactionDate,
    ingredientId: purchase.ingredientId || '',
    supplierName: purchase.supplierName,
    quantity: purchase.quantity,
    unitPrice: purchase.unitPrice,
    notes: purchase.notes || '',
  })

  const [ingredients, setIngredients] = useState<Ingredient[]>([])

  useEffect(() => {
    if (isEditing && ingredients.length === 0) {
      getIngredients().then((i) => setIngredients(i))
    }
  }, [isEditing, ingredients.length])

  const handleDelete = async () => {
    if (isDeleting) return

    if (
      !(await confirm({
        title: '확인',
        description: '이 매입 기록을 삭제하시겠습니까?',
        variant: 'danger',
      }))
    ) {
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
            onChange={(e) =>
              setEditData({ ...editData, transactionDate: e.target.value })
            }
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <select
            value={editData.ingredientId}
            onChange={(e) =>
              setEditData({ ...editData, ingredientId: e.target.value })
            }
            className={selectClass}
          >
            <option value="">선택</option>
            {ingredients
              .filter((i) => i.isActive)
              .map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.ingredientName}
                </option>
              ))}
          </select>
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="text"
            value={editData.supplierName}
            onChange={(e) =>
              setEditData({ ...editData, supplierName: e.target.value })
            }
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="number"
            step="0.01"
            value={editData.quantity}
            onChange={(e) =>
              setEditData({ ...editData, quantity: e.target.value })
            }
            className={`${inputClass} w-20 text-right`}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="number"
            step="1"
            value={editData.unitPrice}
            onChange={(e) =>
              setEditData({ ...editData, unitPrice: e.target.value })
            }
            className={`${inputClass} w-24 text-right`}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right text-sm text-brutal-black/50">
          -
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right text-sm">
          <div className="flex justify-end gap-1">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="border-2 border-brutal-black bg-brutal-white px-2 py-1 text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:shadow-brutal disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="border-2 border-brutal-black bg-brutal-yellow px-2 py-1 text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:shadow-brutal disabled:opacity-50"
            >
              {isSaving ? '...' : '저장'}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr
      className={`transition-colors hover:bg-brutal-yellow/20 ${isDeleting ? 'opacity-50' : ''}`}
    >
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-brutal-black sm:pl-6">
        {formatDate(new Date(purchase.transactionDate), 'yy-MM-dd(EEE)')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black">
        {purchase.ingredientName || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black">
        {purchase.supplierName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-brutal-black">
        {Number(purchase.quantity).toFixed(2)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-brutal-black">
        {formatCurrency(Number(purchase.unitPrice))}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
        {formatCurrency(Number(purchase.totalAmount))}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="px-1 font-bold text-brutal-black underline underline-offset-2 transition-colors hover:bg-brutal-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-1 font-bold text-brutal-black underline underline-offset-2 transition-colors hover:bg-brutal-pink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
