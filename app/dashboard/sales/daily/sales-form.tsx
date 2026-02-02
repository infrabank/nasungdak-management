'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveSKUs, createDailySales } from '../actions'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

  const handleQuantityChange = useCallback((skuId: string, value: string) => {
    // Only allow positive integers or empty string
    if (value === '' || /^\d+$/.test(value)) {
      setQuantities((prev) => ({
        ...prev,
        [skuId]: value,
      }))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!saleDate) {
      toast.error('날짜를 선택해주세요')
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
      toast.error('최소 1개 이상의 SKU에 판매량을 입력해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createDailySales(saleDate, salesData, storeId)

      if (result.success) {
        if (result.failedCount && result.failedCount > 0) {
          toast.warning(
            `완료: ${result.successCount}건 등록, ${result.failedCount}건 실패\n\n오류:\n${result.errors?.join(
              '\n'
            )}`
          )
        } else {
          toast.success(`${result.successCount}건의 판매 기록이 등록되었습니다`)
        }
        router.push(
          storeId ? `/dashboard/sales?storeId=${storeId}` : '/dashboard/sales'
        )
      } else {
        toast.error(`등록 실패: ${result.error}`)
      }
    } catch (error) {
      toast.error(
        `오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTotalRevenue = useMemo(() => {
    return skus.reduce((total, sku) => {
      const qty = Number(quantities[sku.id] || 0)
      return total + qty * Number(sku.unitPrice)
    }, 0)
  }, [skus, quantities])

  const getEnteredCount = useMemo(() => {
    return Object.values(quantities).filter((q) => q && Number(q) > 0).length
  }, [quantities])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="font-bold text-brutal-black">로딩 중...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="pb-32">
      {/* Date selection */}
      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-brutal-black">
          판매 정보
        </h3>
        <div>
          <Label htmlFor="saleDate">📅 판매 날짜</Label>
          <Input
            type="date"
            id="saleDate"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* SKU list */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-sm font-black uppercase tracking-wide text-brutal-black">
            SKU별 판매량 입력
            {getEnteredCount > 0 && (
              <span className="ml-2 font-black text-brutal-black">
                ({getEnteredCount}개 입력됨)
              </span>
            )}
          </h3>
        </div>

        <div className="space-y-3">
          {skus.length === 0 ? (
            <div className="border-3 border-brutal-black bg-brutal-white p-8 text-center font-medium text-brutal-black shadow-brutal">
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
                  className={`border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal transition-all ${
                    hasQuantity ? 'border-brutal-green bg-brutal-green/20' : ''
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h4 className="text-lg font-bold text-brutal-black">
                          {sku.skuName}
                        </h4>
                        <span className="border-2 border-brutal-black bg-brutal-yellow px-2 py-0.5 text-sm font-bold text-brutal-black">
                          {sku.menuName}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-brutal-black">
                        단가: {formatCurrency(Number(sku.unitPrice))}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={quantities[sku.id] || ''}
                          onChange={(e) =>
                            handleQuantityChange(sku.id, e.target.value)
                          }
                          placeholder="0"
                          className="w-24 text-right text-lg font-black"
                        />
                        <span className="font-bold text-brutal-black">개</span>
                      </div>

                      <div className="w-24 text-right sm:w-32">
                        {hasQuantity ? (
                          <div className="text-lg font-black text-brutal-black">
                            {formatCurrency(revenue)}
                          </div>
                        ) : (
                          <div className="text-brutal-black/30">-</div>
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
        <div className="-mx-4 px-4 pt-4">
          <div className="border-3 border-brutal-black bg-brutal-pink p-4 text-center shadow-brutal">
            <span className="text-sm font-bold text-brutal-black">
              총 매출액
            </span>
            <p className="text-2xl font-black text-brutal-black">
              {formatCurrency(getTotalRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar - positioned above bottom nav on mobile */}
      <div className="fixed bottom-14 left-0 right-0 z-20 border-t-3 border-brutal-black bg-brutal-yellow p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-4">
        <div className="mx-auto flex max-w-lg gap-3">
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
            className="h-12 flex-1 py-3 text-base"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || getEnteredCount === 0}
            className="h-12 flex-1 py-3 text-base"
          >
            {isSubmitting ? '저장 중...' : '판매 등록'}
          </Button>
        </div>
      </div>
    </form>
  )
}
