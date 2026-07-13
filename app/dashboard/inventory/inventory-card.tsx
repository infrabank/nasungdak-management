'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { updateInventory, deleteInventory, recordBagUsage } from './actions'

interface InventoryItem {
  id: string
  storeId: string
  ingredientId: string
  currentQuantity: string
  unit: string | null
  lastUpdated: string | null
  ingredientName: string
  storeName: string
  managementLevel?: string | null
}

const inputClass =
  'w-full py-2 px-3 text-base text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none font-medium'

const actionBtn =
  'flex-1 border-2 border-brutal-black px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50'

export default function InventoryCard({ item }: { item: InventoryItem }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUsing, setIsUsing] = useState(false)
  const [editData, setEditData] = useState({
    currentQuantity: String(item.currentQuantity),
    unit: item.unit || '',
  })

  const isBag = item.managementLevel === 'bag'
  const rawQty = Number(item.currentQuantity)
  // 표시는 0 이하로 내려가지 않게 클램프, 저재고 판정은 알림(evaluateBagLowStock)과 동일하게 원값 <= 0
  const bagCount = Math.max(0, Math.floor(rawQty))
  const bagEmpty = isBag && rawQty <= 0

  const handleUseBag = async () => {
    if (isUsing || bagEmpty) return
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

  return (
    <div
      className={`overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal ${isDeleting ? 'opacity-50' : ''}`}
    >
      {/* Card Header */}
      <div
        className={`flex items-center justify-between border-b-3 border-brutal-black p-4 ${bagEmpty ? 'bg-brutal-pink' : 'bg-brutal-yellow'}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-brutal-black">
            📦 {item.ingredientName}
          </span>
          {bagEmpty && (
            <span className="border-2 border-brutal-black bg-brutal-white px-1.5 py-0.5 text-xs font-bold">
              ⚠️ 재고 없음
            </span>
          )}
        </div>
        <span className="inline-flex items-center border-2 border-brutal-black bg-brutal-blue px-2 py-1 text-xs font-bold text-brutal-black">
          {item.unit || '-'}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Store Info */}
        <div className="mb-4 flex items-center text-sm font-bold text-brutal-black/70">
          <span className="mr-2">🏪</span>
          {item.storeName}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                현재 재고
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={editData.currentQuantity}
                onChange={(e) =>
                  setEditData({ ...editData, currentQuantity: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                단위
              </label>
              <input
                type="text"
                value={editData.unit}
                onChange={(e) =>
                  setEditData({ ...editData, unit: e.target.value })
                }
                placeholder="kg, 개"
                className={inputClass}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setEditData({
                    currentQuantity: String(item.currentQuantity),
                    unit: item.unit || '',
                  })
                  setIsEditing(false)
                }}
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
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quantity & Date */}
            <div className="grid grid-cols-2 gap-4 border-t-2 border-brutal-black pt-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                  📊 현재 재고
                </p>
                <p className="text-xl font-black text-brutal-black">
                  {isBag ? `${bagCount}봉` : Number(item.currentQuantity).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                  📅 마지막 갱신
                </p>
                <p className="text-sm font-bold text-brutal-black">
                  {item.lastUpdated
                    ? format(new Date(item.lastUpdated), 'yyyy-MM-dd')
                    : '-'}
                </p>
              </div>
            </div>

            {/* 봉 사용 기록 (봉 단위 관리 재료 전용) */}
            {isBag && (
              <button
                onClick={handleUseBag}
                disabled={isDeleting || isUsing || bagEmpty}
                className="mt-4 w-full border-3 border-brutal-black bg-brutal-yellow py-3 text-base font-black text-brutal-black shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm disabled:opacity-50"
              >
                {isUsing
                  ? '기록 중...'
                  : bagEmpty
                    ? '재고 없음 (매입 필요)'
                    : '🍯 1봉 사용 (뜯었어요)'}
              </button>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2 border-t-2 border-brutal-black pt-4">
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
          </>
        )}
      </div>
    </div>
  )
}
