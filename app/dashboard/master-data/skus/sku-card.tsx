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
    <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-brutal-black bg-brutal-blue/30 p-4">
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
      <div className="space-y-3 p-4">
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
            <div className="my-2 border-t-2 border-brutal-black/20" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
                <span>📝</span>
                <span>설명</span>
              </div>
              <p className="pl-6 text-sm font-medium text-brutal-black">
                {sku.description}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end border-t-2 border-brutal-black bg-brutal-yellow/30 px-4 py-3">
        <SkuForm sku={sku} />
      </div>
    </div>
  )
}
