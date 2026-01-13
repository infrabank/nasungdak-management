'use client'

import { format } from 'date-fns'

interface InventoryItem {
  id: string
  storeId: string
  ingredientId: string
  currentQuantity: string
  unit: string | null
  lastUpdated: string | null
  ingredientName: string
  storeName: string
}

export default function InventoryCard({ item }: { item: InventoryItem }) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">
            📦 {item.ingredientName}
          </span>
        </div>
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          {item.unit || '-'}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Store Info */}
        <div className="mb-4 flex items-center text-sm text-gray-500">
          <span className="mr-2">🏪</span>
          {item.storeName}
        </div>

        {/* Quantity & Date */}
        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              📊 현재 재고
            </p>
            <p className="text-xl font-bold text-gray-900">
              {Number(item.currentQuantity).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              📅 마지막 갱신
            </p>
            <p className="text-sm font-medium text-gray-900">
              {item.lastUpdated
                ? format(new Date(item.lastUpdated), 'yyyy-MM-dd')
                : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
