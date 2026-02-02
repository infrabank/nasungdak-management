import type { Store } from '@/lib/db/schema'
import StoreForm from './store-form'

interface StoreCardProps {
  store: Store
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
      {/* Header */}
      <div className="flex items-center justify-between border-b-3 border-brutal-black bg-brutal-yellow p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏪</span>
          <span className="font-black text-brutal-black">
            {store.storeName}
          </span>
        </div>
        <span
          className={`inline-flex border-2 border-brutal-black px-2.5 py-0.5 text-xs font-bold ${
            store.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-white text-brutal-black'
          }`}
        >
          {store.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        {/* Store Code */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-brutal-black/70">
            <span>🔖</span>
            <span>매장 코드</span>
          </div>
          <span className="font-mono text-sm font-bold text-brutal-black">
            {store.storeCode}
          </span>
        </div>

        {/* Address */}
        <div className="flex gap-2">
          <span className="shrink-0 text-sm">📍</span>
          <p className="line-clamp-2 text-sm font-medium text-brutal-black">
            {store.address || '-'}
          </p>
        </div>

        {/* Divider */}
        <div className="my-2 border-t-2 border-brutal-black" />

        {/* Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-bold text-brutal-black/70">
              <span>📞</span> 매장
            </p>
            {store.phone ? (
              <a
                href={`tel:${store.phone}`}
                className="text-sm font-bold text-brutal-black underline"
              >
                {store.phone}
              </a>
            ) : (
              <span className="text-sm text-brutal-black/50">-</span>
            )}
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-bold text-brutal-black/70">
              <span>👤</span> 관리자
            </p>
            {store.managerPhone ? (
              <a
                href={`tel:${store.managerPhone}`}
                className="text-sm font-bold text-brutal-black underline"
              >
                {store.managerPhone}
              </a>
            ) : (
              <span className="text-sm text-brutal-black/50">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end border-t-3 border-brutal-black bg-brutal-white px-4 py-3">
        <StoreForm store={store} />
      </div>
    </div>
  )
}
