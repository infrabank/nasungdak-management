'use client'

import { useState } from 'react'
import { updateMaintenanceLog, deleteMaintenanceLog } from './actions'
import { formatDate } from '@/lib/utils/format'
import { MAINTENANCE_TASK_TYPES } from '@/lib/utils/validation'
import { taskMeta, TASK_META } from './task-meta'
import type { MaintenanceLog } from '@/lib/db/schema'

interface MaintenanceRowProps {
  log: MaintenanceLog
}

export default function MaintenanceRow({ log }: MaintenanceRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    performedDate: log.performedDate,
    taskType: log.taskType,
    notes: log.notes || '',
  })

  const meta = taskMeta(log.taskType)

  const daysSince = Math.floor(
    (new Date().getTime() - new Date(log.performedDate).getTime()) /
      (1000 * 60 * 60 * 24)
  )

  const handleDelete = async () => {
    if (isDeleting) return
    if (!confirm('이 정비·청소 기록을 삭제하시겠습니까?')) {
      return
    }
    setIsDeleting(true)
    try {
      const result = await deleteMaintenanceLog(log.id)
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
      formData.append('performedDate', editData.performedDate)
      formData.append('taskType', editData.taskType)
      formData.append('notes', editData.notes)

      const result = await updateMaintenanceLog(log.id, formData)
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
      performedDate: log.performedDate,
      taskType: log.taskType,
      notes: log.notes || '',
    })
    setIsEditing(false)
  }

  const inputClass =
    'w-full py-1 px-2 text-sm text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all font-medium'
  const selectClass = inputClass

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="whitespace-nowrap py-2 pl-4 pr-2 text-sm sm:pl-6">
          <input
            type="date"
            value={editData.performedDate}
            onChange={(e) =>
              setEditData({ ...editData, performedDate: e.target.value })
            }
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <select
            value={editData.taskType}
            onChange={(e) =>
              setEditData({ ...editData, taskType: e.target.value })
            }
            className={selectClass}
          >
            {MAINTENANCE_TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_META[t]?.emoji ?? '🧽'} {t}
              </option>
            ))}
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
        <td className="whitespace-nowrap px-2 py-2 text-right text-sm">
          <div className="flex justify-end gap-1">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="border-2 border-brutal-black bg-brutal-white px-2 py-1 text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="border-2 border-brutal-black bg-brutal-yellow px-2 py-1 text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
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
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        {formatDate(new Date(log.performedDate), 'yy-MM-dd(EEE)')}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <span
          className={`inline-flex border-2 border-brutal-black px-2 py-1 text-xs font-bold ${meta.color}`}
        >
          {meta.emoji} {log.taskType}
        </span>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        {daysSince <= 0 ? '오늘' : `${daysSince}일 전`}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        <div className="max-w-xs truncate">{log.notes || '-'}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="font-medium text-blue-600 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
