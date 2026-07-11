'use client'

import { useState } from 'react'
import { updateInventory, deleteInventory, recordBagUsage } from './actions'

export interface InventoryRowItem {
  id: string
  storeId: string
  ingredientId: string
  currentQuantity: string
  unit: string | null
  lastUpdated: string | Date | null
  ingredientName: string
  storeName: string
  managementLevel?: string | null
}

const inputClass =
  'w-full py-1 px-2 text-sm text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all font-medium'

const actionBtn =
  'border-2 border-brutal-black px-3 py-1 text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none'

export default function InventoryRow({ item }: { item: InventoryRowItem }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUsing, setIsUsing] = useState(false)
  const [editData, setEditData] = useState({
    currentQuantity: String(item.currentQuantity),
    unit: item.unit || '',
  })

  const isBag = item.managementLevel === 'bag'
  const bagCount = Math.floor(Number(item.currentQuantity))
  const bagLow = isBag && bagCount <= 1

  const handleUseBag = async () => {
    if (isUsing) return
    if (bagCount <= 0 && !confirm('재고가 0봉입니다. 그래도 사용을 기록할까요?'))
      return
    setIsUsing(true)
    try {
      const result = await recordBagUsage(item.id)
      if (!result.success) {
        alert(result.error || '봉 사용 기록에 실패했습니다')
      }
    } finally {
      setIsUsing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`${item.ingredientName} 재고 기록을 삭제하시겠습니까?`)) return
    setIsDeleting(true)
    const result = await deleteInventory(item.id)
    if (!result.success) {
      alert(result.error || '삭제에 실패했습니다')
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('storeId', item.storeId)
      formData.append('ingredientId', item.ingredientId)
      formData.append('currentQuantity', editData.currentQuantity)
      formData.append('unit', editData.unit)

      const result = await updateInventory(item.id, formData)
      if (result.success) {
        setIsEditing(false)
      } else {
        alert(result.error || '수정에 실패했습니다')
      }
    } catch {
      alert('수정 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData({
      currentQuantity: String(item.currentQuantity),
      unit: item.unit || '',
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <tr className="bg-brutal-yellow/30">
        <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-6">
          {item.ingredientName}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-sm text-brutal-black/70">
          {item.storeName}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={editData.currentQuantity}
            onChange={(e) =>
              setEditData({ ...editData, currentQuantity: e.target.value })
            }
            className={`${inputClass} w-24 text-right`}
          />
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-sm">
          <input
            type="text"
            value={editData.unit}
            onChange={(e) =>
              setEditData({ ...editData, unit: e.target.value })
            }
            placeholder="kg, 개"
            className={`${inputClass} w-20`}
          />
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-sm text-brutal-black/50">
          -
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
          <div className="flex justify-end gap-1">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className={`${actionBtn} bg-brutal-white`}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`${actionBtn} bg-brutal-yellow`}
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
      className={`${isDeleting ? 'opacity-50' : ''} ${bagLow ? 'bg-brutal-pink/20' : ''}`}
    >
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-6">
        {item.ingredientName}
        {isBag && (
          <span className="ml-2 border-2 border-brutal-black bg-brutal-yellow px-1.5 py-0.5 text-xs font-bold">
            봉
          </span>
        )}
        {bagLow && (
          <span className="ml-1 border-2 border-brutal-black bg-brutal-pink px-1.5 py-0.5 text-xs font-bold">
            ⚠️ {bagCount}봉 남음
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
        {item.storeName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
        {isBag ? bagCount : Number(item.currentQuantity).toFixed(2)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
        {item.unit || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
        {item.lastUpdated
          ? new Date(item.lastUpdated).toLocaleDateString('ko-KR')
          : '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
        <div className="flex justify-end gap-2">
          {isBag && (
            <button
              onClick={handleUseBag}
              disabled={isDeleting || isUsing}
              className={`${actionBtn} bg-brutal-yellow`}
            >
              {isUsing ? '기록 중...' : '1봉 사용'}
            </button>
          )}
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className={`${actionBtn} bg-brutal-blue`}
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`${actionBtn} bg-brutal-pink`}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
