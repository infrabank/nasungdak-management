'use client'

import { useState } from 'react'
import { deleteFixedCost, updateFixedCost } from './actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { FixedCost } from '@/lib/db/schema'

interface FixedCostRowProps {
  cost: FixedCost
}

const COST_TYPES = ['인건비', '임대료', '관리비', '기타'] as const

export default function FixedCostRow({ cost }: FixedCostRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editData, setEditData] = useState({
    costDate: cost.costDate.toString(),
    costType: cost.costType,
    costName: cost.costName,
    amount: cost.amount,
    notes: cost.notes || '',
  })

  const handleDelete = async () => {
    if (!confirm('이 고정비 기록을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteFixedCost(cost.id)

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
      formData.append('costDate', editData.costDate)
      formData.append('costType', editData.costType)
      formData.append('costName', editData.costName)
      formData.append('amount', editData.amount)
      formData.append('notes', editData.notes)

      const result = await updateFixedCost(cost.id, formData)
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
      costDate: cost.costDate.toString(),
      costType: cost.costType,
      costName: cost.costName,
      amount: cost.amount,
      notes: cost.notes || '',
    })
    setIsEditing(false)
  }

  const getCostTypeBadgeColor = (type: string) => {
    switch (type) {
      case '인건비':
        return 'bg-brutal-blue border-2 border-brutal-black text-brutal-black'
      case '임대료':
        return 'bg-brutal-purple border-2 border-brutal-black text-brutal-black'
      case '관리비':
        return 'bg-brutal-green border-2 border-brutal-black text-brutal-black'
      case '기타':
        return 'bg-brutal-white border-2 border-brutal-black text-brutal-black'
      default:
        return 'bg-brutal-white border-2 border-brutal-black text-brutal-black'
    }
  }

  const inputClass =
    'w-full py-1 px-2 text-sm text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all font-medium'
  const selectClass =
    'w-full py-1 px-2 text-sm text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all font-medium'

  if (isEditing) {
    return (
      <tr className="bg-brutal-yellow/30">
        <td className="whitespace-nowrap py-2 pl-4 pr-2 text-sm sm:pl-6">
          <input
            type="date"
            value={editData.costDate}
            onChange={(e) => setEditData({ ...editData, costDate: e.target.value })}
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <select
            value={editData.costType}
            onChange={(e) => setEditData({ ...editData, costType: e.target.value })}
            className={selectClass}
          >
            {COST_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-2 text-sm">
          <input
            type="text"
            value={editData.costName}
            onChange={(e) => setEditData({ ...editData, costName: e.target.value })}
            className={inputClass}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-sm">
          <input
            type="number"
            min="1"
            step="1"
            value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
            className={`${inputClass} text-right w-28`}
          />
        </td>
        <td className="px-2 py-2 text-sm">
          <input
            type="text"
            value={editData.notes}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            className={inputClass}
            placeholder="비고"
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
    <tr className={isDeleting ? 'opacity-50' : ''}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-6">
        {formatDate(new Date(cost.costDate), 'yyyy-MM-dd')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <span
          className={`inline-flex items-center px-2 py-1 text-xs font-bold ${getCostTypeBadgeColor(cost.costType)}`}
        >
          {cost.costType}
        </span>
      </td>
      <td className="px-3 py-4 text-sm font-medium text-brutal-black">
        {cost.costName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black text-right font-bold">
        {formatCurrency(Number(cost.amount))}
      </td>
      <td className="px-3 py-4 text-sm text-brutal-black/70 max-w-xs truncate">
        {cost.notes || '-'}
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
