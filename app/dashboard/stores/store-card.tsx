import type { Store } from '@/lib/db/schema'
import StoreForm from './store-form'

interface StoreCardProps {
  store: Store
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏪</span>
          <span className="font-semibold text-gray-900">{store.storeName}</span>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            store.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {store.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Store Code */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>🔖</span>
            <span>매장 코드</span>
          </div>
          <span className="font-mono text-sm font-medium text-gray-900">
            {store.storeCode}
          </span>
        </div>

        {/* Address */}
        <div className="flex gap-2">
          <span className="text-sm shrink-0">📍</span>
          <p className="text-sm text-gray-900 line-clamp-2">
            {store.address || '-'}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-2" />

        {/* Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <span>📞</span> 매장
            </p>
            {store.phone ? (
              <a
                href={`tel:${store.phone}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {store.phone}
              </a>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <span>👤</span> 관리자
            </p>
            {store.managerPhone ? (
              <a
                href={`tel:${store.managerPhone}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {store.managerPhone}
              </a>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
        <StoreForm store={store} />
      </div>
    </div>
  )
}
