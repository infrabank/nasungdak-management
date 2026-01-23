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
    <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-brutal-yellow border-b-3 border-brutal-black">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏪</span>
          <span className="font-bold text-brutal-black">{mapping.storeName}</span>
        </div>
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-bold border-2 border-brutal-black ${
            mapping.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-white text-brutal-black'
          }`}
        >
          {mapping.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Toss Item Code */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-brutal-black/70">
            <span>🔗</span>
            <span>코드</span>
          </div>
          <code className="bg-brutal-black/10 px-2 py-1 text-sm font-mono font-bold text-brutal-black border border-brutal-black">
            {mapping.tossItemCode}
          </code>
        </div>

        {/* Toss Item Name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-brutal-black/70">
            <span>📝</span>
            <span>품목명</span>
          </div>
          <span className="text-sm font-bold text-brutal-black">
            {mapping.tossItemName || '-'}
          </span>
        </div>

        {/* SKU */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-brutal-black/70">
            <span>📦</span>
            <span>SKU</span>
          </div>
          <span className="text-sm">
            {mapping.skuName ? (
              <span className="font-bold text-brutal-black">{mapping.skuName}</span>
            ) : (
              <span className="font-bold text-brutal-black bg-brutal-pink px-2 py-0.5 border border-brutal-black">미매핑</span>
            )}
          </span>
        </div>

        {/* Action */}
        <div className="pt-3 border-t-2 border-brutal-black flex justify-end">
          <TossMappingForm mapping={mapping} stores={stores} skus={skus} />
        </div>
      </div>
    </div>
  )
}
