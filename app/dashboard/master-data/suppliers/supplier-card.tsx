'use client'

import { useState } from 'react'
import { deleteSupplier, updateSupplier } from './actions'
import type { Supplier } from '@/lib/db/schema'

interface SupplierCardProps {
  supplier: Supplier
}

export default function SupplierCard({ supplier }: SupplierCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    supplierName: supplier.supplierName,
    contactName: supplier.contactName || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    businessNumber: supplier.businessNumber || '',
    address: supplier.address || '',
    notes: supplier.notes || '',
    isActive: supplier.isActive,
  })

  const handleDelete = async () => {
    if (!confirm('이 공급업체를 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteSupplier(supplier.id)

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
      formData.append('supplierName', editData.supplierName)
      formData.append('contactName', editData.contactName)
      formData.append('phone', editData.phone)
      formData.append('email', editData.email)
      formData.append('businessNumber', editData.businessNumber)
      formData.append('address', editData.address)
      formData.append('notes', editData.notes)
      formData.append('isActive', editData.isActive ? 'true' : 'false')

      const result = await updateSupplier(supplier.id, formData)
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
      supplierName: supplier.supplierName,
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      businessNumber: supplier.businessNumber || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
      isActive: supplier.isActive,
    })
    setIsEditing(false)
  }

  const inputClass =
    'block w-full rounded-lg border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-blue-500 ring-2 overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="font-medium text-blue-900">공급업체 수정</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">공급업체명 *</label>
            <input
              type="text"
              value={editData.supplierName}
              onChange={(e) => setEditData({ ...editData, supplierName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">담당자명</label>
            <input
              type="text"
              value={editData.contactName}
              onChange={(e) => setEditData({ ...editData, contactName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">연락처</label>
            <input
              type="tel"
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">이메일</label>
            <input
              type="email"
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">사업자등록번호</label>
            <input
              type="text"
              value={editData.businessNumber}
              onChange={(e) => setEditData({ ...editData, businessNumber: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">주소</label>
            <input
              type="text"
              value={editData.address}
              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비고</label>
            <input
              type="text"
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editData.isActive}
              onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label className="text-sm text-gray-700">활성화</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
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
      className={`bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden ${
        isDeleting ? 'opacity-50' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
        <p className="font-semibold text-gray-900">{supplier.supplierName}</p>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            supplier.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {supplier.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2">
        {supplier.contactName && (
          <p className="text-sm text-gray-600">
            <span className="text-gray-500">담당자:</span> {supplier.contactName}
          </p>
        )}
        {supplier.phone && (
          <p className="text-sm text-gray-600">
            <span className="text-gray-500">연락처:</span> {supplier.phone}
          </p>
        )}
        {supplier.email && (
          <p className="text-sm text-gray-600">
            <span className="text-gray-500">이메일:</span> {supplier.email}
          </p>
        )}
        {supplier.businessNumber && (
          <p className="text-sm text-gray-600">
            <span className="text-gray-500">사업자번호:</span> {supplier.businessNumber}
          </p>
        )}
        {supplier.address && (
          <p className="text-sm text-gray-600">
            <span className="text-gray-500">주소:</span> {supplier.address}
          </p>
        )}
        {supplier.notes && (
          <p className="text-sm text-gray-500 pt-2 border-t border-gray-100">
            {supplier.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
