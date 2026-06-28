'use client'

import { useState } from 'react'
import { updateMaintenanceLog, deleteMaintenanceLog } from './actions'
import { formatDate } from '@/lib/utils/format'
import { MAINTENANCE_TASK_TYPES } from '@/lib/utils/validation'
import { taskMeta, TASK_META } from './task-meta'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
import type { MaintenanceLog } from '@/lib/db/schema'

interface MaintenanceCardProps {
  log: MaintenanceLog
}

export default function MaintenanceCard({ log }: MaintenanceCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const confirm = useConfirm()

  const [editData, setEditData] = useState({
    performedDate: log.performedDate,
    taskType: log.taskType,
    notes: log.notes || '',
  })

  const meta = taskMeta(log.taskType)

  // 경과일 계산
  const daysSince = Math.floor(
    (new Date().getTime() - new Date(log.performedDate).getTime()) /
      (1000 * 60 * 60 * 24)
  )

  const handleDelete = async () => {
    if (isDeleting) return
    if (
      !(await confirm({
        title: '확인',
        description: '이 정비·청소 기록을 삭제하시겠습니까?',
        variant: 'danger',
      }))
    ) {
      return
    }
    setIsDeleting(true)
    try {
      const result = await deleteMaintenanceLog(log.id)
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
      formData.append('performedDate', editData.performedDate)
      formData.append('taskType', editData.taskType)
      formData.append('notes', editData.notes)

      const result = await updateMaintenanceLog(log.id, formData)
      if (result.success) {
        setIsEditing(false)
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
      performedDate: log.performedDate,
      taskType: log.taskType,
      notes: log.notes || '',
    })
    setIsEditing(false)
  }

  const inputClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const selectClass = inputClass

  if (isEditing) {
    return (
      <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-3 border-brutal-black bg-brutal-blue p-4">
          <p className="font-black text-brutal-black">정비·청소 기록 수정</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              항목
            </label>
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
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              수행일
            </label>
            <input
              type="date"
              value={editData.performedDate}
              onChange={(e) =>
                setEditData({ ...editData, performedDate: e.target.value })
              }
              className={inputClass}
            />
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
              placeholder="특이사항을 입력하세요"
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
      <div className="flex items-center justify-between border-b-3 border-brutal-black bg-brutal-yellow p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <span className="font-bold text-brutal-black">
            {formatDate(new Date(log.performedDate), 'yy-MM-dd(EEE)')}
          </span>
        </div>
        <span
          className={`inline-flex border-2 border-brutal-black px-3 py-1 text-sm font-bold ${meta.color}`}
        >
          {meta.emoji} {log.taskType}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              경과
            </p>
            <p className="text-2xl font-black text-brutal-black">
              {daysSince <= 0 ? '오늘' : `${daysSince}일 전`}
            </p>
          </div>
        </div>

        {/* Notes */}
        {log.notes && (
          <div className="border-t-2 border-brutal-black py-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              비고
            </p>
            <p className="text-sm text-brutal-black">{log.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t-2 border-brutal-black pt-3">
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
  )
}
