'use client'

import { useState } from 'react'
import { deleteFixedCost, updateFixedCost } from './actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { FixedCost } from '@/lib/db/schema'

interface FixedCostCardProps {
  cost: FixedCost
}

const COST_TYPES = ['인건비', '임대료', '관리비', '기타'] as const

export default function FixedCostCard({ cost }: FixedCostCardProps) {
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

  const getCostTypeStyle = (type: string) => {
    switch (type) {
      case '인건비':
        return { bg: 'bg-brutal-blue border-2 border-brutal-black text-brutal-black', emoji: '👷' }
      case '임대료':
        return { bg: 'bg-brutal-purple border-2 border-brutal-black text-brutal-black', emoji: '🏠' }
      case '관리비':
        return { bg: 'bg-brutal-green border-2 border-brutal-black text-brutal-black', emoji: '🔧' }
      case '기타':
        return { bg: 'bg-brutal-white border-2 border-brutal-black text-brutal-black', emoji: '📋' }
      default:
        return { bg: 'bg-brutal-white border-2 border-brutal-black text-brutal-black', emoji: '📋' }
    }
  }

  const typeStyle = getCostTypeStyle(cost.costType)

  const inputClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'
  const selectClass =
    'block w-full border-2 border-brutal-black py-2 px-3 text-sm font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all'

  if (isEditing) {
    return (
      <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden">
        <div className="p-4 bg-brutal-blue border-b-3 border-brutal-black">
          <p className="font-black text-brutal-black">고정비 수정</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">날짜</label>
            <input
              type="date"
              value={editData.costDate}
              onChange={(e) => setEditData({ ...editData, costDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">비용 유형</label>
            <select
              value={editData.costType}
              onChange={(e) => setEditData({ ...editData, costType: e.target.value })}
              className={selectClass}
            >
              {COST_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">비용 항목명</label>
            <input
              type="text"
              value={editData.costName}
              onChange={(e) => setEditData({ ...editData, costName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">금액</label>
            <input
              type="number"
              min="1"
              step="1"
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brutal-black mb-1">비고</label>
            <input
              type="text"
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50"
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
      className={`bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden ${
        isDeleting ? 'opacity-50' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-brutal-yellow border-b-3 border-brutal-black">
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <span className="font-bold text-brutal-black">
            {formatDate(new Date(cost.costDate), 'yyyy-MM-dd')}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-bold ${typeStyle.bg}`}
        >
          {typeStyle.emoji} {cost.costType}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Cost Name */}
        <p className="text-lg font-black text-brutal-black mb-3">
          {cost.costName}
        </p>

        {/* Amount */}
        <div className="bg-brutal-pink border-2 border-brutal-black p-3 mb-3">
          <p className="text-xs font-bold text-brutal-black uppercase tracking-wide">금액</p>
          <p className="text-2xl font-black text-brutal-black">
            {formatCurrency(Number(cost.amount))}
          </p>
        </div>

        {/* Notes */}
        {cost.notes && (
          <div className="py-2 border-t-2 border-brutal-black">
            <p className="text-xs font-bold text-brutal-black/70 uppercase tracking-wide mb-1">
              비고
            </p>
            <p className="text-sm text-brutal-black">{cost.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t-2 border-brutal-black">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-blue border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-pink border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
