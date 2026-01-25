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

interface SalesRowProps {
  sale: SalesRecord
  isSelected: boolean
  onToggleSelect: () => void
}

export default function SalesRow({ sale, isSelected, onToggleSelect }: SalesRowProps) {
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
    if (!(await confirm({ title: '확인', description: '이 판매 기록을 삭제하시겠습니까?', variant: 'danger' }))) return

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
    'w-full border-2 border-brutal-black py-1 px-2 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal transition-all'
  const selectClass =
    'w-full border-2 border-brutal-black py-1 px-2 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal transition-all'

  if (isEditing) {
    return (
      <tr className="bg-brutal-blue/30">
        <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm sm:pl-6">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            disabled
            className="h-4 w-4 border-2 border-brutal-black text-brutal-black opacity-50"
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="date"
            value={editData.saleDate}
            onChange={(e) => setEditData({ ...editData, saleDate: e.target.value })}
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-brutal-black/50">
          -
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <select
            value={editData.skuId}
            onChange={(e) => setEditData({ ...editData, skuId: e.target.value })}
            className={selectClass}
          >
            <option value="">선택</option>
            {skuList.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.menuName} - {sku.skuName}
              </option>
            ))}
          </select>
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="number"
            min="1"
            step="1"
            value={editData.quantitySold}
            onChange={(e) => setEditData({ ...editData, quantitySold: e.target.value })}
            className={`${inputClass} text-right w-20`}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-brutal-black/50 text-right">
          -
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-brutal-black/50 text-right">
          -
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm text-right">
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-2 py-1 text-xs font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal transition-all disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-2 py-1 text-xs font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal transition-all disabled:opacity-50"
            >
              {isSaving ? '...' : '저장'}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`hover:bg-brutal-yellow/20 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 border-2 border-brutal-black text-brutal-black focus:ring-brutal-black cursor-pointer"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-brutal-black">
        {formatDate(sale.saleDate, 'yyyy-MM-dd')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black">
        {sale.menuName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black">
        {sale.skuName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black text-right">
        {sale.quantitySold}개
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brutal-black text-right">
        {formatCurrency(Number(sale.unitPrice))}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right font-bold">
        {formatCurrency(Number(sale.totalRevenue))}
      </td>
      <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm sm:pr-6">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="font-bold text-brutal-black underline underline-offset-2 hover:bg-brutal-blue px-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="font-bold text-brutal-black underline underline-offset-2 hover:bg-brutal-pink px-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}
