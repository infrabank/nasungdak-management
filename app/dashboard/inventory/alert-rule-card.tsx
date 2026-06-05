'use client'

import { useState } from 'react'
import { updateAlertRule, deleteAlertRule } from './actions'
import {
  storeLabel,
  type AlertRuleItem,
  type StoreNameOption,
} from './alert-rule-row'

interface AlertRuleCardProps {
  rule: AlertRuleItem
  stores: StoreNameOption[]
}

const inputClass =
  'w-full py-2 px-3 text-base text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none font-medium'

const actionBtn =
  'flex-1 border-2 border-brutal-black px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50'

export default function AlertRuleCard({ rule, stores }: AlertRuleCardProps) {
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

  return (
    <div
      className={`overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal ${isDeleting ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between border-b-3 border-brutal-black bg-brutal-green p-4">
        <span className="text-base font-black text-brutal-black">
          🔔 {rule.ingredientName}
        </span>
        <span
          className={`inline-flex items-center border-2 border-brutal-black px-2 py-1 text-xs font-bold ${
            rule.isActive
              ? 'bg-brutal-white text-brutal-black'
              : 'bg-brutal-black/10 text-brutal-black/50'
          }`}
        >
          {rule.isActive ? '활성' : '비활성'}
        </span>
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center text-sm font-bold text-brutal-black/70">
          <span className="mr-2">🏪</span>
          {storeLabel(rule.storeId, stores)}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                적용 매장
              </label>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                  임계값(일)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={editData.alertThresholdDays}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      alertThresholdDays: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                  예측기간(일)
                </label>
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
                  className={inputClass}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-brutal-black">
              <input
                type="checkbox"
                checked={editData.isActive}
                onChange={(e) =>
                  setEditData({ ...editData, isActive: e.target.checked })
                }
                className="h-4 w-4 border-2 border-brutal-black text-green-600"
              />
              활성
            </label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setEditData({
                    storeId: rule.storeId || '',
                    alertThresholdDays: String(rule.alertThresholdDays),
                    predictionPeriodDays: String(rule.predictionPeriodDays),
                    isActive: rule.isActive,
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
            <div className="grid grid-cols-2 gap-4 border-t-2 border-brutal-black pt-3">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                  임계값
                </p>
                <p className="text-base font-black text-brutal-black">
                  {rule.alertThresholdDays}일
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brutal-black/70">
                  예측 기간
                </p>
                <p className="text-base font-black text-brutal-black">
                  {rule.predictionPeriodDays}일
                </p>
              </div>
            </div>
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
