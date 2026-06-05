'use client'

import { useState } from 'react'
import { updateAlertRule, deleteAlertRule } from './actions'

export interface AlertRuleItem {
  id: string
  storeId: string | null
  ingredientId: string
  alertThresholdDays: number
  predictionPeriodDays: number
  isActive: boolean
  ingredientName: string
}

export interface StoreNameOption {
  id: string
  storeName: string
}

interface AlertRuleRowProps {
  rule: AlertRuleItem
  stores: StoreNameOption[]
}

const inputClass =
  'w-full py-1 px-2 text-sm text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none font-medium'

const actionBtn =
  'border-2 border-brutal-black px-3 py-1 text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none'

export function storeLabel(
  storeId: string | null,
  stores: StoreNameOption[]
): string {
  if (!storeId) return '전체 매장'
  return stores.find((s) => s.id === storeId)?.storeName ?? '전체 매장'
}

export default function AlertRuleRow({ rule, stores }: AlertRuleRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState({
    storeId: rule.storeId || '',
    alertThresholdDays: String(rule.alertThresholdDays),
    predictionPeriodDays: String(rule.predictionPeriodDays),
    isActive: rule.isActive,
  })

  const handleDelete = async () => {
    if (!confirm(`${rule.ingredientName} 알림 규칙을 삭제하시겠습니까?`)) return
    setIsDeleting(true)
    const result = await deleteAlertRule(rule.id)
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
      formData.append('storeId', editData.storeId)
      formData.append('ingredientId', rule.ingredientId)
      formData.append('alertThresholdDays', editData.alertThresholdDays)
      formData.append('predictionPeriodDays', editData.predictionPeriodDays)
      formData.append('isActive', editData.isActive ? 'true' : 'false')

      const result = await updateAlertRule(rule.id, formData)
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
      storeId: rule.storeId || '',
      alertThresholdDays: String(rule.alertThresholdDays),
      predictionPeriodDays: String(rule.predictionPeriodDays),
      isActive: rule.isActive,
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <tr className="bg-brutal-yellow/30">
        <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-6">
          {rule.ingredientName}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-sm">
          <select
            value={editData.storeId}
            onChange={(e) =>
              setEditData({ ...editData, storeId: e.target.value })
            }
            className={inputClass}
          >
            <option value="">전체 매장</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.storeName}
              </option>
            ))}
          </select>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={editData.alertThresholdDays}
            onChange={(e) =>
              setEditData({ ...editData, alertThresholdDays: e.target.value })
            }
            className={`${inputClass} w-16 text-right`}
          />
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
          <input
            type="number"
            inputMode="numeric"
            min="7"
            max="90"
            value={editData.predictionPeriodDays}
            onChange={(e) =>
              setEditData({
                ...editData,
                predictionPeriodDays: e.target.value,
              })
            }
            className={`${inputClass} w-16 text-right`}
          />
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-center text-sm">
          <input
            type="checkbox"
            checked={editData.isActive}
            onChange={(e) =>
              setEditData({ ...editData, isActive: e.target.checked })
            }
            className="h-4 w-4 border-2 border-brutal-black text-green-600"
          />
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
    <tr className={isDeleting ? 'opacity-50' : ''}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-6">
        {rule.ingredientName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
        {storeLabel(rule.storeId, stores)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
        {rule.alertThresholdDays}일
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
        {rule.predictionPeriodDays}일
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
        <span
          className={`inline-flex items-center border-2 border-brutal-black px-2 py-1 text-xs font-bold ${
            rule.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-white text-brutal-black/50'
          }`}
        >
          {rule.isActive ? '활성' : '비활성'}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
        <div className="flex justify-end gap-2">
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
