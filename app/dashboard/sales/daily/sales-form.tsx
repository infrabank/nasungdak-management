'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveSKUs, createDailySales } from '../actions'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'

interface SKU {
  id: string
  skuName: string | null
  menuName: string | null
  unitPrice: string
}

export default function SalesForm() {
  const router = useRouter()
  const [saleDate, setSaleDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [skus, setSKUs] = useState<SKU[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getActiveSKUs().then((data) => {
      setSKUs(data)
      setIsLoading(false)
    })
  }, [])

  const handleQuantityChange = (skuId: string, value: string) => {
    // Only allow positive integers or empty string
    if (value === '' || /^\d+$/.test(value)) {
      setQuantities(prev => ({
        ...prev,
        [skuId]: value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!saleDate) {
      alert('날짜를 선택해주세요')
      return
    }

    // Prepare sales data
    const salesData = Object.entries(quantities)
      .filter(([_, qty]) => qty && Number(qty) > 0)
      .map(([skuId, quantitySold]) => ({
        skuId,
        quantitySold,
      }))

    if (salesData.length === 0) {
      alert('최소 1개 이상의 SKU에 판매량을 입력해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createDailySales(saleDate, salesData)

      if (result.success) {
        if (result.failedCount && result.failedCount > 0) {
          alert(
            `완료: ${result.successCount}건 등록, ${result.failedCount}건 실패\n\n오류:\n${result.errors?.join('\n')}`
          )
        } else {
          alert(`${result.successCount}건의 판매 기록이 등록되었습니다`)
        }
        router.push('/dashboard/sales')
      } else {
        alert(`등록 실패: ${result.error}`)
      }
    } catch (error) {
      alert(`오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTotalRevenue = () => {
    return skus.reduce((total, sku) => {
      const qty = Number(quantities[sku.id] || 0)
      return total + qty * Number(sku.unitPrice)
    }, 0)
  }

  const getEnteredCount = () => {
    return Object.values(quantities).filter(q => q && Number(q) > 0).length
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <label htmlFor="saleDate" className="block text-sm font-medium text-gray-700 mb-2">
          판매 날짜
        </label>
        <input
          type="date"
          id="saleDate"
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
          required
          className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
        />
      </div>

      {/* SKU list */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            SKU별 판매량 입력
            {getEnteredCount() > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({getEnteredCount()}개 입력됨)
              </span>
            )}
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {skus.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              등록된 SKU가 없습니다. 먼저 기초 데이터에서 SKU를 등록해주세요.
            </div>
          ) : (
            skus.map((sku) => {
              const quantity = Number(quantities[sku.id] || 0)
              const revenue = quantity * Number(sku.unitPrice)

              return (
                <div
                  key={sku.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {sku.skuName}
                        </h3>
                        <span className="text-xs text-gray-500">
                          ({sku.menuName})
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        단가: {formatCurrency(Number(sku.unitPrice))}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={quantities[sku.id] || ''}
                          onChange={(e) => handleQuantityChange(sku.id, e.target.value)}
                          placeholder="0"
                          className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-right"
                        />
                        <span className="text-sm text-gray-500">개</span>
                      </div>

                      {quantity > 0 && (
                        <div className="text-right min-w-[100px]">
                          <div className="text-sm font-medium text-blue-600">
                            {formatCurrency(revenue)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Total */}
        {getEnteredCount() > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900">
                총 매출액
              </div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(getTotalRevenue())}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/dashboard/sales')}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || getEnteredCount() === 0}
        >
          {isSubmitting ? '등록 중...' : '판매 등록'}
        </Button>
      </div>
    </form>
  )
}
