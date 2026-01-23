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
      <label htmlFor="storeSelector" className="text-sm font-bold text-brutal-black">
        매장:
      </label>
      <select
        id="storeSelector"
        value={selectedStore}
        onChange={handleChange}
        className="py-1.5 pl-3 pr-8 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 focus:outline-none transition-all duration-150 sm:text-sm font-medium cursor-pointer"
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
