'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface Store {
  id: string
  storeName: string
  storeCode: string
}

interface StoreSelectorProps {
  stores: Store[]
}

export default function StoreSelector({ stores }: StoreSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const currentStoreId = searchParams.get('storeId') || ''
  const [selectedStore, setSelectedStore] = useState(currentStoreId)

  useEffect(() => {
    setSelectedStore(searchParams.get('storeId') || '')
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const storeId = e.target.value
    setSelectedStore(storeId)

    // Update URL with new storeId
    const params = new URLSearchParams(searchParams.toString())
    if (storeId) {
      params.set('storeId', storeId)
    } else {
      params.delete('storeId')
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)
  }

  if (stores.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="storeSelector" className="text-sm font-medium text-gray-700">
        매장:
      </label>
      <select
        id="storeSelector"
        value={selectedStore}
        onChange={handleChange}
        className="rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
      >
        <option value="">전체 매장</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.storeName} ({store.storeCode})
          </option>
        ))}
      </select>
    </div>
  )
}
