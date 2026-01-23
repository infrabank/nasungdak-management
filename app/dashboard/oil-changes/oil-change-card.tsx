'use client'

import { useState } from 'react'
import { updateOilChange, deleteOilChange } from './actions'
import { formatDate } from '@/lib/utils/format'
import type { OilChangeHistory } from '@/lib/db/schema'

interface OilChangeCardProps {
  oilChange: OilChangeHistory
}

export default function OilChangeCard({ oilChange }: OilChangeCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    changeDate: oilChange.changeDate,
    fryerType: oilChange.fryerType,
    notes: oilChange.notes || '',
  })

  const fryerTypeColor =
    oilChange.fryerType === '초벌'
      ? 'bg-brutal-blue text-brutal-black'
      : 'bg-brutal-green text-brutal-black'

  const fryerEmoji = oilChange.fryerType === '초벌' ? '🔵' : '🟢'

  const handleDelete = async () => {
    if (isDeleting) return

    if (!confirm('이 기름 교체 이력을 삭제하시겠습니까?')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteOilChange(oilChange.id)
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
      formData.append('changeDate', editData.changeDate)
      formData.append('fryerType', editData.fryerType)
      formData.append('notes', editData.notes)

      const result = await updateOilChange(oilChange.id, formData)
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
      changeDate: oilChange.changeDate,
      fryerType: oilChange.fryerType,
      notes: oilChange.notes || '',
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
          <p className="font-black text-brutal-black">기름 교체 이력 수정</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">
              교체일
            </label>
            <input
              type="date"
              value={editData.changeDate}
              onChange={(e) =>
                setEditData({ ...editData, changeDate: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">
              튀김기 종류
            </label>
            <select
              value={editData.fryerType}
              onChange={(e) =>
                setEditData({ ...editData, fryerType: e.target.value })
              }
              className={selectClass}
            >
              <option value="초벌">🔵 초벌</option>
              <option value="재벌">🟢 재벌</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">
              비고
            </label>
            <input
              type="text"
              value={editData.notes}
              onChange={(e) =>
                setEditData({ ...editData, notes: e.target.value })
              }
              placeholder="특이사항을 입력하세요"
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
      <div className="flex items-center justify-between p-4 bg-brutal-yellow border-b-3 border-brutal-black">
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <span className="font-bold text-brutal-black">
            {formatDate(new Date(oilChange.changeDate), 'yyyy-MM-dd')}
          </span>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-bold border-2 border-brutal-black ${fryerTypeColor}`}
        >
          {fryerEmoji} {oilChange.fryerType}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Usage Days */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-xs font-bold text-brutal-black/70 uppercase tracking-wide">
              사용 기간
            </p>
            <p className="text-2xl font-black text-brutal-black">
              {oilChange.usageDays ? `${oilChange.usageDays}일` : '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-brutal-black/70 uppercase tracking-wide">
              기름 종류
            </p>
            <p className="text-base font-bold text-brutal-black">
              {oilChange.oilType || '해바라기씨유'}
            </p>
          </div>
        </div>

        {/* Notes */}
        {oilChange.notes && (
          <div className="py-3 border-t-2 border-brutal-black">
            <p className="text-xs font-bold text-brutal-black/70 uppercase tracking-wide mb-1">
              비고
            </p>
            <p className="text-sm text-brutal-black">{oilChange.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t-2 border-brutal-black">
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
  )
}
