import { formatCurrency } from '@/lib/utils/format'
import SkuForm from './sku-form'

interface SkuCardProps {
  sku: {
    id: string
    skuName: string
    menuId: string
    menuName: string | null
    unitPrice: string
    description: string | null
    isActive: boolean
  }
}

export default function SkuCard({ sku }: SkuCardProps) {
  return (
    <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-brutal-blue/30 border-b-2 border-brutal-black">
        <div className="flex items-center gap-2">
          <span className="text-xl">📦</span>
          <span className="font-bold text-brutal-black">{sku.skuName}</span>
        </div>
        <span
          className={`inline-flex border-2 border-brutal-black px-2.5 py-0.5 text-xs font-bold ${
            sku.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-white text-brutal-black'
          }`}
        >
          {sku.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
            <span>🍗</span>
            <span>메뉴</span>
          </div>
          <span className="font-bold text-brutal-black">
            {sku.menuName || '-'}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
            <span>💰</span>
            <span>판매 단가</span>
          </div>
          <span className="font-bold text-brutal-black">
            {formatCurrency(Number(sku.unitPrice))}
          </span>
        </div>

        {/* Description */}
        {sku.description && (
          <>
            <div className="border-t-2 border-brutal-black/20 my-2" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
                <span>📝</span>
                <span>설명</span>
              </div>
              <p className="text-sm font-medium text-brutal-black pl-6">
                {sku.description}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-brutal-yellow/30 border-t-2 border-brutal-black flex justify-end">
        <SkuForm sku={sku} />
      </div>
    </div>
  )
}
