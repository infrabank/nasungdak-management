'use client'

import { useState, useEffect } from 'react'
import { deleteSalesRecord, updateSalesRecord, getActiveSKUs } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface SalesRecord {
  id: string
  saleDate: string
  skuId?: string
  skuName: string | null
  menuName: string | null
  quantitySold: string
  unitPrice: string | null
  totalRevenue: string | null
}

interface SKU {
  id: string
  skuName: string
  menuName: string | null
  unitPrice: string
}

interface SalesCardProps {
  sale: SalesRecord
  isSelected: boolean
  onToggleSelect: () => void
}

export default function SalesCard({
  sale,
  isSelected,
  onToggleSelect,
}: SalesCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    saleDate: sale.saleDate,
    skuId: sale.skuId || '',
    quantitySold: sale.quantitySold,
  })

  const [skuList, setSkuList] = useState<SKU[]>([])

  useEffect(() => {
    if (isEditing && skuList.length === 0) {
      getActiveSKUs().then(setSkuList)
    }
  }, [isEditing, skuList.length])

  const handleDelete = async () => {
    if (!confirm('이 판매 기록을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteSalesRecord(sale.id)

    if (!result.success) {
      alert(`삭제 실패: ${result.error}`)
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('saleDate', editData.saleDate)
      formData.append('skuId', editData.skuId)
      formData.append('quantitySold', editData.quantitySold)

      const result = await updateSalesRecord(sale.id, formData)
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
      saleDate: sale.saleDate,
      skuId: sale.skuId || '',
      quantitySold: sale.quantitySold,
    })
    setIsEditing(false)
  }

  const inputClass =
    'block w-full rounded-lg border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'block w-full rounded-lg border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-blue-500 ring-2 overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="font-medium text-blue-900">판매 수정</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">날짜</label>
            <input
              type="date"
              value={editData.saleDate}
              onChange={(e) => setEditData({ ...editData, saleDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
            <select
              value={editData.skuId}
              onChange={(e) => setEditData({ ...editData, skuId: e.target.value })}
              className={selectClass}
            >
              <option value="">선택하세요</option>
              {skuList.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.menuName} - {sku.skuName} ({formatCurrency(Number(sku.unitPrice))})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">판매량</label>
            <input
              type="number"
              min="1"
              step="1"
              value={editData.quantitySold}
              onChange={(e) => setEditData({ ...editData, quantitySold: e.target.value })}
              className={inputClass}
            />
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
      className={`bg-white rounded-xl shadow-sm ring-1 overflow-hidden transition-all ${
        isSelected ? 'ring-blue-500 ring-2' : 'ring-gray-900/5'
      } ${isDeleting ? 'opacity-50' : ''}`}
    >
      {/* Card Header */}
      <div
        className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100 cursor-pointer"
        onClick={onToggleSelect}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
          />
          <div>
            <p className="text-sm text-gray-500">
              📅 {formatDate(sale.saleDate, 'yyyy-MM-dd')}
            </p>
          </div>
        </div>
        <span className="text-lg font-bold text-green-600">
          {formatCurrency(Number(sale.totalRevenue))}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Menu & SKU */}
        <div className="mb-3">
          <p className="text-lg font-semibold text-gray-900">
            {sale.menuName || '-'}
          </p>
          <p className="text-sm text-gray-500">{sale.skuName || '-'}</p>
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              판매량
            </p>
            <p className="text-base font-medium text-gray-900">
              {sale.quantitySold}개
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              단가
            </p>
            <p className="text-base font-medium text-gray-900">
              {formatCurrency(Number(sale.unitPrice))}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
