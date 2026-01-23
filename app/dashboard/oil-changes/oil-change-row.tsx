'use client'

import { useState } from 'react'
import { updateOilChange, deleteOilChange } from './actions'
import { formatDate } from '@/lib/utils/format'
import type { OilChangeHistory } from '@/lib/db/schema'

interface OilChangeRowProps {
  oilChange: OilChangeHistory
}

export default function OilChangeRow({ oilChange }: OilChangeRowProps) {
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
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800'

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
    'w-full rounded border-0 py-1 px-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'w-full rounded border-0 py-1 px-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="whitespace-nowrap py-2 pl-4 pr-2 text-sm sm:pl-6">
          <input
            type="date"
            value={editData.changeDate}
            onChange={(e) =>
              setEditData({ ...editData, changeDate: e.target.value })
            }
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <select
            value={editData.fryerType}
            onChange={(e) =>
              setEditData({ ...editData, fryerType: e.target.value })
            }
            className={selectClass}
          >
            <option value="초벌">초벌</option>
            <option value="재벌">재벌</option>
          </select>
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">-</td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="text"
            value={editData.notes}
            onChange={(e) =>
              setEditData({ ...editData, notes: e.target.value })
            }
            placeholder="비고"
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-right">
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-2 py-1 text-xs font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-2 py-1 text-xs font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
            >
              {isSaving ? '...' : '저장'}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`hover:bg-gray-50 ${isDeleting ? 'opacity-50' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(new Date(oilChange.changeDate), 'yyyy-MM-dd')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${fryerTypeColor}`}
        >
          {oilChange.fryerType}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {oilChange.usageDays ? `${oilChange.usageDays}일` : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="max-w-xs truncate">{oilChange.notes || '-'}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
