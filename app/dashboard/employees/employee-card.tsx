'use client'

import { useState } from 'react'
import { deleteEmployee, updateEmployee } from './actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { Employee } from '@/lib/db/schema'

interface EmployeeCardProps {
  employee: Employee
}

export default function EmployeeCard({ employee }: EmployeeCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    employeeName: employee.employeeName,
    hourlyRate: employee.hourlyRate,
    phone: employee.phone || '',
    hireDate: employee.hireDate?.toString() || '',
    isActive: employee.isActive,
  })

  const handleDelete = async () => {
    if (!confirm('이 직원을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteEmployee(employee.id)

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
      formData.append('employeeName', editData.employeeName)
      formData.append('hourlyRate', editData.hourlyRate)
      formData.append('phone', editData.phone)
      formData.append('hireDate', editData.hireDate)
      formData.append('isActive', editData.isActive ? 'true' : 'false')

      const result = await updateEmployee(employee.id, formData)
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
      employeeName: employee.employeeName,
      hourlyRate: employee.hourlyRate,
      phone: employee.phone || '',
      hireDate: employee.hireDate?.toString() || '',
      isActive: employee.isActive,
    })
    setIsEditing(false)
  }

  const inputClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'

  if (isEditing) {
    return (
      <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-3 border-brutal-black bg-brutal-blue p-4">
          <p className="font-black text-brutal-black">직원 정보 수정</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              직원명
            </label>
            <input
              type="text"
              value={editData.employeeName}
              onChange={(e) =>
                setEditData({ ...editData, employeeName: e.target.value })
              }
              className={inputClass}
              maxLength={100}
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
              연락처
            </label>
            <input
              type="tel"
              value={editData.phone}
              onChange={(e) =>
                setEditData({ ...editData, phone: e.target.value })
              }
              className={inputClass}
              maxLength={20}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              입사일
            </label>
            <input
              type="date"
              value={editData.hireDate}
              onChange={(e) =>
                setEditData({ ...editData, hireDate: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              checked={editData.isActive}
              onChange={(e) =>
                setEditData({ ...editData, isActive: e.target.checked })
              }
              className="h-5 w-5 border-2 border-brutal-black accent-brutal-yellow"
            />
            <span className="text-sm font-bold text-brutal-black">재직 중</span>
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
      } ${!employee.isActive ? 'opacity-70' : ''}`}
    >
      {/* Card Header */}
      <div
        className={`flex items-center justify-between border-b-3 border-brutal-black p-4 ${
          employee.isActive ? 'bg-brutal-yellow' : 'bg-brutal-pink'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">👤</span>
          <span className="font-bold text-brutal-black">
            {employee.employeeName}
          </span>
          {!employee.isActive && (
            <span className="text-xs text-brutal-black/60">(퇴직)</span>
          )}
        </div>
        <span
          className={`inline-flex items-center border-2 border-brutal-black px-2 py-1 text-xs font-bold ${
            employee.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-white text-brutal-black'
          }`}
        >
          {employee.isActive ? '재직' : '퇴직'}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Hourly Rate */}
        <div className="mb-3 border-2 border-brutal-black bg-brutal-blue p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brutal-black">
            시급
          </p>
          <p className="text-2xl font-black text-brutal-black">
            {formatCurrency(Number(employee.hourlyRate))}
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              연락처
            </p>
            <p className="font-medium text-brutal-black">
              {employee.phone || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              입사일
            </p>
            <p className="font-medium text-brutal-black">
              {employee.hireDate
                ? formatDate(new Date(employee.hireDate), 'yyyy-MM-dd')
                : '-'}
            </p>
          </div>
        </div>

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
