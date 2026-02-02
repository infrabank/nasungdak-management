'use client'

import { useState, useEffect } from 'react'
import { deleteSalesRecord, updateSalesRecord, getActiveSKUs } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'

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
  const confirm = useConfirm()
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
    if (
      !(await confirm({
        title: '확인',
        description: '이 판매 기록을 삭제하시겠습니까?',
        variant: 'danger',
      }))
    )
      return

    setIsDeleting(true)
    const result = await deleteSalesRecord(sale.id)

    if (!result.success) {
      toast.error(`삭제 실패: ${result.error}`)
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
      saleDate: sale.saleDate,
      skuId: sale.skuId || '',
      quantitySold: sale.quantitySold,
    })
    setIsEditing(false)
  }

  const inputClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const selectClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'

  if (isEditing) {
    return (
      <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-3 border-brutal-black bg-brutal-blue p-4">
          <p className="font-bold text-brutal-black">판매 수정</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              날짜
            </label>
            <input
              type="date"
              value={editData.saleDate}
              onChange={(e) =>
                setEditData({ ...editData, saleDate: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              SKU
            </label>
            <select
              value={editData.skuId}
              onChange={(e) =>
                setEditData({ ...editData, skuId: e.target.value })
              }
              className={selectClass}
            >
              <option value="">선택하세요</option>
              {skuList.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.menuName} - {sku.skuName} (
                  {formatCurrency(Number(sku.unitPrice))})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-brutal-black">
              판매량
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={editData.quantitySold}
              onChange={(e) =>
                setEditData({ ...editData, quantitySold: e.target.value })
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
      className={`overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal transition-all ${
        isSelected ? 'border-brutal-blue' : ''
      } ${isDeleting ? 'opacity-50' : ''}`}
    >
      {/* Card Header */}
      <div
        className="flex cursor-pointer items-center justify-between border-b-2 border-brutal-black bg-brutal-yellow/30 p-4"
        onClick={onToggleSelect}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 cursor-pointer border-2 border-brutal-black text-brutal-black focus:ring-brutal-black"
          />
          <div>
            <p className="text-sm font-bold text-brutal-black">
              📅 {formatDate(sale.saleDate, 'yyyy-MM-dd')}
            </p>
          </div>
        </div>
        <span className="text-lg font-black text-brutal-black">
          {formatCurrency(Number(sale.totalRevenue))}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Menu & SKU */}
        <div className="mb-3">
          <p className="text-lg font-bold text-brutal-black">
            {sale.menuName || '-'}
          </p>
          <p className="text-sm font-medium text-brutal-black/70">
            {sale.skuName || '-'}
          </p>
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-2 gap-3 border-t-2 border-brutal-black/20 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              판매량
            </p>
            <p className="text-base font-bold text-brutal-black">
              {sale.quantitySold}개
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              단가
            </p>
            <p className="text-base font-bold text-brutal-black">
              {formatCurrency(Number(sale.unitPrice))}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t-2 border-brutal-black/20 pt-3">
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
