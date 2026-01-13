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
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">📦</span>
          <span className="font-semibold text-gray-900">{sku.skuName}</span>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            sku.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {sku.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>🍗</span>
            <span>메뉴</span>
          </div>
          <span className="font-medium text-gray-900">
            {sku.menuName || '-'}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>💰</span>
            <span>판매 단가</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatCurrency(Number(sku.unitPrice))}
          </span>
        </div>

        {/* Description */}
        {sku.description && (
          <>
            <div className="border-t border-gray-100 my-2" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>📝</span>
                <span>설명</span>
              </div>
              <p className="text-sm text-gray-600 pl-6">
                {sku.description}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
        <SkuForm sku={sku} />
      </div>
    </div>
  )
}
