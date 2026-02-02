'use client'

import { useState } from 'react'
import { deleteSupplier, updateSupplier } from './actions'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
import type { Supplier } from '@/lib/db/schema'

interface SupplierCardProps {
  supplier: Supplier
}

export default function SupplierCard({ supplier }: SupplierCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const confirm = useConfirm()

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
    if (
      !(await confirm({
        title: '확인',
        description: '이 공급업체를 삭제하시겠습니까?',
        variant: 'danger',
      }))
    )
      return

    setIsDeleting(true)
    const result = await deleteSupplier(supplier.id)

    if (!result.success) {
      toast.error(result.error || '삭제에 실패했습니다')
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
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'

  if (isEditing) {
    return (
      <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-3 border-brutal-black bg-brutal-blue p-4">
          <p className="font-black text-brutal-black">공급업체 수정</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              공급업체명 *
            </label>
            <input
              type="text"
              value={editData.supplierName}
              onChange={(e) =>
                setEditData({ ...editData, supplierName: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              담당자명
            </label>
            <input
              type="text"
              value={editData.contactName}
              onChange={(e) =>
                setEditData({ ...editData, contactName: e.target.value })
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
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              이메일
            </label>
            <input
              type="email"
              value={editData.email}
              onChange={(e) =>
                setEditData({ ...editData, email: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              사업자등록번호
            </label>
            <input
              type="text"
              value={editData.businessNumber}
              onChange={(e) =>
                setEditData({ ...editData, businessNumber: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              주소
            </label>
            <input
              type="text"
              value={editData.address}
              onChange={(e) =>
                setEditData({ ...editData, address: e.target.value })
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editData.isActive}
              onChange={(e) =>
                setEditData({ ...editData, isActive: e.target.checked })
              }
              className="h-4 w-4 border-2 border-brutal-black text-brutal-black"
            />
            <label className="text-sm font-bold text-brutal-black">
              활성화
            </label>
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
        <p className="font-black text-brutal-black">{supplier.supplierName}</p>
        <span
          className={`inline-flex border-2 border-brutal-black px-2.5 py-0.5 text-xs font-bold ${
            supplier.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-white text-brutal-black'
          }`}
        >
          {supplier.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Card Body */}
      <div className="space-y-2 p-4">
        {supplier.contactName && (
          <p className="text-sm text-brutal-black">
            <span className="font-bold">담당자:</span> {supplier.contactName}
          </p>
        )}
        {supplier.phone && (
          <p className="text-sm text-brutal-black">
            <span className="font-bold">연락처:</span> {supplier.phone}
          </p>
        )}
        {supplier.email && (
          <p className="text-sm text-brutal-black">
            <span className="font-bold">이메일:</span> {supplier.email}
          </p>
        )}
        {supplier.businessNumber && (
          <p className="text-sm text-brutal-black">
            <span className="font-bold">사업자번호:</span>{' '}
            {supplier.businessNumber}
          </p>
        )}
        {supplier.address && (
          <p className="text-sm text-brutal-black">
            <span className="font-bold">주소:</span> {supplier.address}
          </p>
        )}
        {supplier.notes && (
          <p className="border-t-2 border-brutal-black pt-2 text-sm text-brutal-black/70">
            {supplier.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t-2 border-brutal-black pt-3">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="border-2 border-brutal-black bg-brutal-blue px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:opacity-50"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="border-2 border-brutal-black bg-brutal-pink px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
