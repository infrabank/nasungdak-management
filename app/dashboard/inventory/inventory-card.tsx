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
    <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b-3 border-brutal-black bg-brutal-yellow p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-brutal-black">
            📦 {item.ingredientName}
          </span>
        </div>
        <span className="inline-flex items-center border-2 border-brutal-black bg-brutal-blue px-2 py-1 text-xs font-bold text-brutal-black">
          {item.unit || '-'}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Store Info */}
        <div className="mb-4 flex items-center text-sm font-bold text-brutal-black/70">
          <span className="mr-2">🏪</span>
          {item.storeName}
        </div>

        {/* Quantity & Date */}
        <div className="grid grid-cols-2 gap-4 border-t-2 border-brutal-black pt-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              📊 현재 재고
            </p>
            <p className="text-xl font-black text-brutal-black">
              {Number(item.currentQuantity).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brutal-black/70">
              📅 마지막 갱신
            </p>
            <p className="text-sm font-bold text-brutal-black">
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
