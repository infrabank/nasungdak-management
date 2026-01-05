'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSalesRecord } from '../actions'
import { getSkus } from '../../master-data/skus/actions'
import { Button } from '@/components/ui/button'

export default function SalesForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [skus, setSkus] = useState<any[]>([])

  useEffect(() => {
    getSkus().then(setSkus)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createSalesRecord(formData)

      if (result.success) {
        alert('판매가 등록되었습니다.')
        router.push('/dashboard/sales')
      } else {
        alert(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label htmlFor="saleDate" className="block text-sm font-medium text-gray-900">
                판매 날짜 *
              </label>
              <div className="mt-2">
                <input
                  type="date"
                  name="saleDate"
                  id="saleDate"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="skuId" className="block text-sm font-medium text-gray-900">
                SKU *
              </label>
              <div className="mt-2">
                <select
                  id="skuId"
                  name="skuId"
                  required
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                >
                  <option value="">선택하세요</option>
                  {skus.filter(s => s.isActive).map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {sku.skuName} - {sku.menuName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="quantitySold" className="block text-sm font-medium text-gray-900">
                판매량 *
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  name="quantitySold"
                  id="quantitySold"
                  required
                  step="1"
                  min="1"
                  placeholder="0"
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </form>
  )
}
