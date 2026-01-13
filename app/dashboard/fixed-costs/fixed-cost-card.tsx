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
        return { bg: 'bg-blue-100 text-blue-800', emoji: '👷' }
      case '임대료':
        return { bg: 'bg-purple-100 text-purple-800', emoji: '🏠' }
      case '관리비':
        return { bg: 'bg-green-100 text-green-800', emoji: '🔧' }
      case '기타':
        return { bg: 'bg-gray-100 text-gray-800', emoji: '📋' }
      default:
        return { bg: 'bg-gray-100 text-gray-800', emoji: '📋' }
    }
  }

  const typeStyle = getCostTypeStyle(cost.costType)

  const inputClass =
    'block w-full rounded-lg border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'block w-full rounded-lg border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-blue-500 ring-2 overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="font-medium text-blue-900">고정비 수정</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">날짜</label>
            <input
              type="date"
              value={editData.costDate}
              onChange={(e) => setEditData({ ...editData, costDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비용 유형</label>
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
            <label className="block text-xs font-medium text-gray-500 mb-1">비용 항목명</label>
            <input
              type="text"
              value={editData.costName}
              onChange={(e) => setEditData({ ...editData, costName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">금액</label>
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
            <label className="block text-xs font-medium text-gray-500 mb-1">비고</label>
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">📅</span>
          <span className="font-medium text-gray-900">
            {formatDate(new Date(cost.costDate), 'yyyy-MM-dd')}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${typeStyle.bg}`}
        >
          {typeStyle.emoji} {cost.costType}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Cost Name */}
        <p className="text-lg font-semibold text-gray-900 mb-3">
          {cost.costName}
        </p>

        {/* Amount */}
        <div className="bg-red-50 rounded-lg p-3 mb-3">
          <p className="text-xs text-red-600 uppercase tracking-wide">금액</p>
          <p className="text-2xl font-bold text-red-700">
            {formatCurrency(Number(cost.amount))}
          </p>
        </div>

        {/* Notes */}
        {cost.notes && (
          <div className="py-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              비고
            </p>
            <p className="text-sm text-gray-700">{cost.notes}</p>
          </div>
        )}

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
