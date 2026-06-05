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

export default function PurchaseCard({ purchase }: { purchase: Purchase }) {
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
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const selectClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'

  if (isEditing) {
    return (
      <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-3 border-brutal-black bg-brutal-blue p-4">
          <p className="font-bold text-brutal-black">매입 수정</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              날짜
            </label>
            <input
              type="date"
              value={editData.transactionDate}
              onChange={(e) =>
                setEditData({ ...editData, transactionDate: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              재료
            </label>
            <select
              value={editData.ingredientId}
              onChange={(e) =>
                setEditData({ ...editData, ingredientId: e.target.value })
              }
              className={selectClass}
            >
              <option value="">선택하세요</option>
              {ingredients
                .filter((i) => i.isActive)
                .map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.ingredientName}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              공급업체
            </label>
            <input
              type="text"
              value={editData.supplierName}
              onChange={(e) =>
                setEditData({ ...editData, supplierName: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-brutal-black">
                수량
              </label>
              <input
                type="number"
                step="0.01"
                value={editData.quantity}
                onChange={(e) =>
                  setEditData({ ...editData, quantity: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-brutal-black">
                단가
              </label>
              <input
                type="number"
                step="1"
                value={editData.unitPrice}
                onChange={(e) =>
                  setEditData({ ...editData, unitPrice: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              비고
            </label>
            <input
              type="text"
              value={editData.notes}
              onChange={(e) =>
                setEditData({ ...editData, notes: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:opacity-50"
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
      className={`overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal ${
        isDeleting ? 'opacity-50' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b-2 border-brutal-black bg-brutal-yellow/30 p-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-brutal-black">
            {formatDate(new Date(purchase.transactionDate), 'yy-MM-dd(EEE)')}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <div className="mb-3">
          <p className="text-lg font-bold text-brutal-black">
            {purchase.ingredientName || '-'}
          </p>
          <p className="mt-1 text-sm font-medium text-brutal-black/70">
            {purchase.supplierName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t-2 border-brutal-black/20 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              수량
            </p>
            <p className="text-base font-bold text-brutal-black">
              {Number(purchase.quantity).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              단가
            </p>
            <p className="text-base font-bold text-brutal-black">
              {formatCurrency(Number(purchase.unitPrice))}
            </p>
          </div>
        </div>

        {purchase.notes && (
          <p className="border-t-2 border-brutal-black/20 py-2 text-sm font-medium text-brutal-black/70">
            {purchase.notes}
          </p>
        )}

        <div className="flex items-center justify-between border-t-2 border-brutal-black/20 pt-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              합계
            </p>
            <p className="text-xl font-black text-brutal-black">
              {formatCurrency(Number(purchase.totalAmount))}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              disabled={isDeleting}
              className="border-2 border-brutal-black bg-brutal-blue px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:cursor-not-allowed disabled:opacity-50"
            >
              수정
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="border-2 border-brutal-black bg-brutal-pink px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
