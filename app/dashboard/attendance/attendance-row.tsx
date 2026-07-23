'use client'

import { useState, useEffect } from 'react'
import { deleteAttendance, updateAttendance } from './actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABELS,
  type AttendanceStatus,
} from '@/lib/utils/validation'

interface AttendanceRecord {
  id: string
  storeId: string | null
  employeeId: string
  workDate: string
  status: string
  workHours: string
  hourlyRate: string
  totalPay: string
  fixedCostId: string | null
  notes: string | null
  createdAt: Date
  employeeName: string | null
  employeeDeleted: boolean
}

interface AttendanceRowProps {
  record: AttendanceRecord
}

// 공휴일/결근 배지
function StatusBadge({ status }: { status: string }) {
  if (status === 'work') return null
  const color = status === 'holiday' ? 'bg-brutal-blue' : 'bg-brutal-red'
  return (
    <span
      className={`ml-2 inline-block border-2 border-brutal-black ${color} px-2 py-0.5 text-xs font-bold text-brutal-black`}
    >
      {ATTENDANCE_STATUS_LABELS[status as AttendanceStatus] ?? status}
    </span>
  )
}

export default function AttendanceRow({ record }: AttendanceRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    workDate: record.workDate,
    status: (record.status as AttendanceStatus) || 'work',
    workHours: record.workHours,
    hourlyRate: record.hourlyRate,
    totalPay: record.totalPay,
    notes: record.notes || '',
  })

  const editIsWork = editData.status === 'work'

  // Auto-calculate totalPay when workHours or hourlyRate changes
  useEffect(() => {
    if (isEditing && editIsWork) {
      const hours = Number(editData.workHours)
      const rate = Number(editData.hourlyRate)
      if (hours > 0 && rate > 0) {
        const calculated = Math.round(hours * rate)
        setEditData((prev) => ({ ...prev, totalPay: String(calculated) }))
      }
    }
  }, [editData.workHours, editData.hourlyRate, isEditing, editIsWork])

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
      formData.append('status', editData.status)
      formData.append('workHours', editIsWork ? editData.workHours : '0')
      formData.append('hourlyRate', editData.hourlyRate || '0')
      formData.append('totalPay', editIsWork ? editData.totalPay : '0')
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
      status: (record.status as AttendanceStatus) || 'work',
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
    'w-full py-1 px-2 text-sm text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all font-medium'

  if (isEditing) {
    return (
      <tr className="bg-brutal-yellow/30">
        <td className="whitespace-nowrap py-2 pl-4 pr-2 text-sm sm:pl-6">
          <input
            type="date"
            value={editData.workDate}
            onChange={(e) =>
              setEditData({ ...editData, workDate: e.target.value })
            }
            className={inputClass}
          />
          <select
            value={editData.status}
            onChange={(e) =>
              setEditData({
                ...editData,
                status: e.target.value as AttendanceStatus,
              })
            }
            className={`${inputClass} mt-1`}
          >
            {ATTENDANCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ATTENDANCE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm font-medium text-brutal-black">
          {displayName}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          {editIsWork ? (
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={editData.workHours}
              onChange={(e) =>
                setEditData({ ...editData, workHours: e.target.value })
              }
              className={`${inputClass} w-20 text-right`}
            />
          ) : (
            <span className="block text-right text-brutal-black/50">-</span>
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          {editIsWork ? (
            <input
              type="number"
              min="0"
              step="10"
              value={editData.hourlyRate}
              onChange={(e) =>
                setEditData({ ...editData, hourlyRate: e.target.value })
              }
              className={`${inputClass} w-24 text-right`}
            />
          ) : (
            <span className="block text-right text-brutal-black/50">-</span>
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          {editIsWork ? (
            <input
              type="number"
              min="0"
              step="1"
              value={editData.totalPay}
              onChange={(e) =>
                setEditData({ ...editData, totalPay: e.target.value })
              }
              className={`${inputClass} w-28 text-right`}
            />
          ) : (
            <span className="block text-right text-brutal-black/50">₩0</span>
          )}
        </td>
        <td className="px-2 py-2 text-sm">
          <input
            type="text"
            value={editData.notes}
            onChange={(e) =>
              setEditData({ ...editData, notes: e.target.value })
            }
            className={inputClass}
            placeholder="비고"
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
    <tr
      className={`${isDeleting ? 'opacity-50' : ''} ${record.employeeDeleted ? 'bg-brutal-black/5' : ''}`}
    >
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-6">
        {formatDate(new Date(record.workDate), 'yy-MM-dd(EEE)')}
        <StatusBadge status={record.status} />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black">
        {displayName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
        {record.status === 'work' ? (
          `${Number(record.workHours)}시간`
        ) : (
          <span className="text-brutal-black/50">-</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
        {record.status === 'work' ? (
          formatCurrency(Number(record.hourlyRate))
        ) : (
          <span className="text-brutal-black/50">-</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
        {formatCurrency(Number(record.totalPay))}
      </td>
      <td className="max-w-xs truncate px-3 py-4 text-sm text-brutal-black/70">
        {record.notes || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="border-2 border-brutal-black bg-brutal-blue px-3 py-1 text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="border-2 border-brutal-black bg-brutal-pink px-3 py-1 text-xs font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
