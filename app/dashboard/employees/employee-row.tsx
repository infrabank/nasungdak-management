'use client'

import { useState } from 'react'
import { deleteEmployee, updateEmployee } from './actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { Employee } from '@/lib/db/schema'

interface EmployeeRowProps {
  employee: Employee
}

export default function EmployeeRow({ employee }: EmployeeRowProps) {
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
    'w-full py-1 px-2 text-sm text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all font-medium'

  if (isEditing) {
    return (
      <tr className="bg-brutal-yellow/30">
        <td className="whitespace-nowrap py-2 pl-4 pr-2 text-sm sm:pl-6">
          <input
            type="text"
            value={editData.employeeName}
            onChange={(e) => setEditData({ ...editData, employeeName: e.target.value })}
            className={inputClass}
            maxLength={100}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="number"
            min="0"
            step="10"
            value={editData.hourlyRate}
            onChange={(e) => setEditData({ ...editData, hourlyRate: e.target.value })}
            className={`${inputClass} text-right w-28`}
          />
        </td>
        <td className="px-2 py-2 text-sm">
          <input
            type="tel"
            value={editData.phone}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            className={inputClass}
            maxLength={20}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="date"
            value={editData.hireDate}
            onChange={(e) => setEditData({ ...editData, hireDate: e.target.value })}
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-center">
          <input
            type="checkbox"
            checked={editData.isActive}
            onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
            className="w-4 h-4 border-2 border-brutal-black accent-brutal-yellow"
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
    <tr className={`${isDeleting ? 'opacity-50' : ''} ${!employee.isActive ? 'bg-brutal-black/5' : ''}`}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-6">
        {employee.employeeName}
        {!employee.isActive && (
          <span className="ml-2 text-xs text-brutal-black/50">(퇴직)</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right font-bold">
        {formatCurrency(Number(employee.hourlyRate))}
      </td>
      <td className="px-3 py-4 text-sm text-brutal-black">
        {employee.phone || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
        {employee.hireDate ? formatDate(new Date(employee.hireDate), 'yyyy-MM-dd') : '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
        <span
          className={`inline-flex items-center px-2 py-1 text-xs font-bold border-2 border-brutal-black ${
            employee.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-pink text-brutal-black'
          }`}
        >
          {employee.isActive ? '재직' : '퇴직'}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="px-3 py-1 text-xs font-bold text-brutal-black bg-brutal-blue border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1 text-xs font-bold text-brutal-black bg-brutal-pink border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
