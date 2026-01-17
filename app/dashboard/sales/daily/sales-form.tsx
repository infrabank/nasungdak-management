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

interface SalesFormProps {
  storeId?: string
}

export default function SalesForm({ storeId }: SalesFormProps) {
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
      setQuantities((prev) => ({
        ...prev,
        [skuId]: value,
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
      const result = await createDailySales(saleDate, salesData, storeId)

      if (result.success) {
        if (result.failedCount && result.failedCount > 0) {
          alert(
            `완료: ${result.successCount}건 등록, ${result.failedCount}건 실패\n\n오류:\n${result.errors?.join(
              '\n'
            )}`
          )
        } else {
          alert(`${result.successCount}건의 판매 기록이 등록되었습니다`)
        }
        router.push(
          storeId ? `/dashboard/sales?storeId=${storeId}` : '/dashboard/sales'
        )
      } else {
        alert(`등록 실패: ${result.error}`)
      }
    } catch (error) {
      alert(
        `오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      )
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
    return Object.values(quantities).filter((q) => q && Number(q) > 0).length
  }

  const inputClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="pb-32">
      {/* Date selection */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          판매 정보
        </h3>
        <div>
          <label htmlFor="saleDate" className={labelClass}>
            📅 판매 날짜
          </label>
          <input
            type="date"
            id="saleDate"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* SKU list */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            SKU별 판매량 입력
            {getEnteredCount() > 0 && (
              <span className="ml-2 text-blue-600 font-bold">
                ({getEnteredCount()}개 입력됨)
              </span>
            )}
          </h3>
        </div>

        <div className="space-y-3">
          {skus.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-8 text-center text-gray-500">
              등록된 SKU가 없습니다. 먼저 기초 데이터에서 SKU를 등록해주세요.
            </div>
          ) : (
            skus.map((sku) => {
              const quantity = Number(quantities[sku.id] || 0)
              const revenue = quantity * Number(sku.unitPrice)
              const hasQuantity = quantity > 0

              return (
                <div
                  key={sku.id}
                  className={`bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4 transition-colors ${
                    hasQuantity ? 'ring-blue-200 bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900 text-lg">
                          {sku.skuName}
                        </h4>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {sku.menuName}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        단가: {formatCurrency(Number(sku.unitPrice))}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={quantities[sku.id] || ''}
                          onChange={(e) =>
                            handleQuantityChange(sku.id, e.target.value)
                          }
                          placeholder="0"
                          className={`${inputClass} w-24 text-right font-bold text-lg`}
                        />
                        <span className="text-gray-500 font-medium">개</span>
                      </div>

                      <div className="text-right w-24 sm:w-32">
                        {hasQuantity ? (
                          <div className="font-bold text-blue-600 text-lg">
                            {formatCurrency(revenue)}
                          </div>
                        ) : (
                          <div className="text-gray-300">-</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Total - Sticky */}
      <div className="sticky bottom-24 z-10">
        <div className="bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 -mx-4 px-4">
          <div className="bg-red-50 rounded-xl p-4 text-center shadow-sm">
            <span className="text-sm text-red-600">총 매출액</span>
            <p className="text-2xl font-bold text-red-700">
              {formatCurrency(getTotalRevenue())}
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar - positioned above bottom nav on mobile */}
      <div className="fixed bottom-14 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4 z-20">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              router.push(
                storeId
                  ? `/dashboard/sales?storeId=${storeId}`
                  : '/dashboard/sales'
              )
            }
            disabled={isSubmitting}
            className="flex-1 py-3 text-base h-12"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || getEnteredCount() === 0}
            className="flex-1 py-3 text-base h-12"
          >
            {isSubmitting ? '저장 중...' : '판매 등록'}
          </Button>
        </div>
      </div>
    </form>
  )
}

