'use client'

import TossMappingForm from './toss-mapping-form'

interface TossMappingData {
  id: string
  storeId: string
  storeName: string
  tossItemCode: string
  tossItemName: string | null
  skuId: string | null
  skuName: string | null
  isActive: boolean
}

interface TossMappingCardProps {
  mapping: TossMappingData
  stores: { id: string; storeName: string; storeCode: string }[]
  skus: { id: string; skuName: string }[]
}

export default function TossMappingCard({
  mapping,
  stores,
  skus,
}: TossMappingCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏪</span>
          <span className="font-medium text-gray-900">{mapping.storeName}</span>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            mapping.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {mapping.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Toss Item Code */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>🔗</span>
            <span>코드</span>
          </div>
          <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-700 font-mono">
            {mapping.tossItemCode}
          </code>
        </div>

        {/* Toss Item Name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>📝</span>
            <span>품목명</span>
          </div>
          <span className="text-sm text-gray-900 font-medium">
            {mapping.tossItemName || '-'}
          </span>
        </div>

        {/* SKU */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>📦</span>
            <span>SKU</span>
          </div>
          <span className="text-sm">
            {mapping.skuName || (
              <span className="text-amber-600 font-medium">미매핑</span>
            )}
          </span>
        </div>

        {/* Action */}
        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <TossMappingForm mapping={mapping} stores={stores} skus={skus} />
        </div>
      </div>
    </div>
  )
}
