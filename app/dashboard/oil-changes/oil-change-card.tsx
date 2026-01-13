'use client'

import { formatDate } from '@/lib/utils/format'
import type { OilChangeHistory } from '@/lib/db/schema'

interface OilChangeCardProps {
  oilChange: OilChangeHistory
}

export default function OilChangeCard({ oilChange }: OilChangeCardProps) {
  const fryerTypeColor =
    oilChange.fryerType === '초벌'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800'

  const fryerEmoji = oilChange.fryerType === '초벌' ? '🔵' : '🟢'

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">📅</span>
          <span className="font-medium text-gray-900">
            {formatDate(new Date(oilChange.changeDate), 'yyyy-MM-dd')}
          </span>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${fryerTypeColor}`}
        >
          {fryerEmoji} {oilChange.fryerType}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Usage Days */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              사용 기간
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {oilChange.usageDays ? `${oilChange.usageDays}일` : '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              기름 종류
            </p>
            <p className="text-base font-medium text-gray-900">
              {oilChange.oilType || '해바라기씨유'}
            </p>
          </div>
        </div>

        {/* Notes */}
        {oilChange.notes && (
          <div className="py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              비고
            </p>
            <p className="text-sm text-gray-700">{oilChange.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            onClick={() => {
              console.log('Edit oil change:', oilChange.id)
            }}
          >
            수정
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            onClick={() => {
              console.log('Delete oil change:', oilChange.id)
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
