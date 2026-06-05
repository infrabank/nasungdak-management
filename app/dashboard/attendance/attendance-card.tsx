'use client'

import { useState, useEffect } from 'react'
import { deleteAttendance, updateAttendance } from './actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface AttendanceRecord {
  id: string
  storeId: string | null
  employeeId: string
  workDate: string
  workHours: string
  hourlyRate: string
  totalPay: string
  fixedCostId: string | null
  notes: string | null
  createdAt: Date
  employeeName: string | null
  employeeDeleted: boolean
}

interface AttendanceCardProps {
  record: AttendanceRecord
}

export default function AttendanceCard({ record }: AttendanceCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    workDate: record.workDate,
    workHours: record.workHours,
    hourlyRate: record.hourlyRate,
    totalPay: record.totalPay,
    notes: record.notes || '',
  })

  // Auto-calculate totalPay when workHours or hourlyRate changes
  useEffect(() => {
    if (isEditing) {
      const hours = Number(editData.workHours)
      const rate = Number(editData.hourlyRate)
      if (hours > 0 && rate > 0) {
        const calculated = Math.round(hours * rate)
        setEditData((prev) => ({ ...prev, totalPay: String(calculated) }))
      }
    }
  }, [editData.workHours, editData.hourlyRate, isEditing])

  const handleDelete = async () => {
    if (
      !confirm(
        '이 출퇴근 기록을 삭제하시겠습니까?\n(연결된 고정비 기록은 삭제되지 않습니다)'
      )
    )
      return

    setIsDeleting(true)
    const result = await deleteAttendance(record.id)

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
      formData.append('employeeId', record.employeeId) // Required but not changed
      formData.append('workDate', editData.workDate)
      formData.append('workHours', editData.workHours)
      formData.append('hourlyRate', editData.hourlyRate)
      formData.append('totalPay', editData.totalPay)
      formData.append('notes', editData.notes)

      const result = await updateAttendance(record.id, formData)
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
      workDate: record.workDate,
      workHours: record.workHours,
      hourlyRate: record.hourlyRate,
      totalPay: record.totalPay,
      notes: record.notes || '',
    })
    setIsEditing(false)
  }

  // Display employee name with deleted indicator
  const displayName = record.employeeName
    ? record.employeeDeleted
      ? `${record.employeeName} (삭제됨)`
      : record.employeeName
    : '알 수 없음'

  const inputClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'

  if (isEditing) {
    return (
      <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-3 border-brutal-black bg-brutal-blue p-4">
          <p className="font-black text-brutal-black">출퇴근 기록 수정</p>
          <p className="text-sm text-brutal-black/70">{displayName}</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              근무일
            </label>
            <input
              type="date"
              value={editData.workDate}
              onChange={(e) =>
                setEditData({ ...editData, workDate: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              근무시간
            </label>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={editData.workHours}
              onChange={(e) =>
                setEditData({ ...editData, workHours: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              시급 (원)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={editData.hourlyRate}
              onChange={(e) =>
                setEditData({ ...editData, hourlyRate: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              지급액 (원)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={editData.totalPay}
              onChange={(e) =>
                setEditData({ ...editData, totalPay: e.target.value })
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
      } ${record.employeeDeleted ? 'opacity-70' : ''}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b-3 border-brutal-black bg-brutal-yellow p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <span className="font-bold text-brutal-black">
            {formatDate(new Date(record.workDate), 'yy-MM-dd(EEE)')}
          </span>
        </div>
        <span className="font-bold text-brutal-black">👤 {displayName}</span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Total Pay */}
        <div className="mb-3 border-2 border-brutal-black bg-brutal-pink p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brutal-black">
            지급액
          </p>
          <p className="text-2xl font-black text-brutal-black">
            {formatCurrency(Number(record.totalPay))}
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              근무시간
            </p>
            <p className="font-medium text-brutal-black">
              {Number(record.workHours)}시간
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              시급
            </p>
            <p className="font-medium text-brutal-black">
              {formatCurrency(Number(record.hourlyRate))}
            </p>
          </div>
        </div>

        {/* Notes */}
        {record.notes && (
          <div className="mt-3 border-t-2 border-brutal-black py-2">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              비고
            </p>
            <p className="text-sm text-brutal-black">{record.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex justify-end gap-2 border-t-2 border-brutal-black pt-3">
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
