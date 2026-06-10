'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getClosingFormData,
  saveDailyClosing,
  type ClosingSkuRow,
} from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ClosingFormProps {
  storeId: string
}

function todayString() {
  return new Date().toISOString().split('T')[0]
}

export default function ClosingForm({ storeId }: ClosingFormProps) {
  const router = useRouter()
  const [closingDate, setClosingDate] = useState(todayString)
  const [cardSales, setCardSales] = useState('')
  const [cashSales, setCashSales] = useState('')
  const [deliverySales, setDeliverySales] = useState('')
  const [memo, setMemo] = useState('')
  const [skuRows, setSkuRows] = useState<ClosingSkuRow[]>([])
  const [lastSaleDate, setLastSaleDate] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    getClosingFormData(storeId, closingDate)
      .then((data) => {
        if (cancelled) return
        setSkuRows(data.skuRows)
        setLastSaleDate(data.lastSaleDate)
        // 기존 마감/판매 기록이 있으면 현재 값으로 채움
        setCardSales(data.closing ? String(Number(data.closing.cardSales)) : '')
        setCashSales(data.closing ? String(Number(data.closing.cashSales)) : '')
        setDeliverySales(
          data.closing ? String(Number(data.closing.deliverySales)) : ''
        )
        setMemo(data.closing?.memo ?? '')
        const initial: Record<string, string> = {}
        for (const row of data.skuRows) {
          if (row.currentQty > 0) initial[row.skuId] = String(row.currentQty)
        }
        setQuantities(initial)
        setIsLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(
          error instanceof Error ? error.message : '데이터 조회에 실패했습니다'
        )
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [storeId, closingDate])

  const handleQuantityChange = useCallback((skuId: string, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setQuantities((prev) => ({ ...prev, [skuId]: value }))
    }
  }, [])

  const handleMoneyChange = useCallback(
    (setter: (v: string) => void) => (value: string) => {
      if (value === '' || /^\d+$/.test(value)) {
        setter(value)
      }
    },
    []
  )

  const salesTotal = useMemo(
    () =>
      skuRows.reduce((total, row) => {
        const qty = Number(quantities[row.skuId] || 0)
        return total + qty * Number(row.unitPrice)
      }, 0),
    [skuRows, quantities]
  )

  const paymentTotal = useMemo(
    () =>
      Number(cardSales || 0) + Number(cashSales || 0) + Number(deliverySales || 0),
    [cardSales, cashSales, deliverySales]
  )

  const difference = paymentTotal - salesTotal
  const hasPayment = paymentTotal > 0
  const hasSales = salesTotal > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasPayment && !hasSales) {
      toast.error('매출 또는 판매량을 입력해주세요')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await saveDailyClosing({
        storeId,
        closingDate,
        cardSales: cardSales || '0',
        cashSales: cashSales || '0',
        deliverySales: deliverySales || '0',
        memo,
        quantities: Object.entries(quantities).map(([skuId, quantitySold]) => ({
          skuId,
          quantitySold,
        })),
      })

      if (result.success) {
        toast.success(
          `마감 완료 · 매출 ${formatCurrency(result.paymentTotal ?? 0)}`
        )
        router.push('/dashboard')
      } else {
        toast.error(`마감 실패: ${result.error}`)
      }
    } catch (error) {
      toast.error(
        `오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="pb-32">
      {/* 날짜 */}
      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <Label htmlFor="closingDate">마감 날짜</Label>
        <Input
          type="date"
          id="closingDate"
          value={closingDate}
          onChange={(e) => setClosingDate(e.target.value)}
          required
        />
      </div>

      {/* 결제수단별 매출 */}
      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-brutal-black">
          결제수단별 매출
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="cardSales">카드</Label>
            <Input
              type="text"
              inputMode="numeric"
              id="cardSales"
              value={cardSales}
              onChange={(e) => handleMoneyChange(setCardSales)(e.target.value)}
              placeholder="0"
              className="text-right text-lg font-black"
            />
          </div>
          <div>
            <Label htmlFor="cashSales">현금</Label>
            <Input
              type="text"
              inputMode="numeric"
              id="cashSales"
              value={cashSales}
              onChange={(e) => handleMoneyChange(setCashSales)(e.target.value)}
              placeholder="0"
              className="text-right text-lg font-black"
            />
          </div>
          <div>
            <Label htmlFor="deliverySales">배달앱</Label>
            <Input
              type="text"
              inputMode="numeric"
              id="deliverySales"
              value={deliverySales}
              onChange={(e) =>
                handleMoneyChange(setDeliverySales)(e.target.value)
              }
              placeholder="0"
              className="text-right text-lg font-black"
            />
          </div>
        </div>
        <div className="mt-3 border-t-2 border-brutal-black/20 pt-3 text-right">
          <span className="text-sm font-bold text-brutal-black">합계 </span>
          <span className="text-xl font-black text-brutal-black">
            {formatCurrency(paymentTotal)}
          </span>
        </div>
      </div>

      {/* 메뉴별 판매량 */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-sm font-black uppercase tracking-wide text-brutal-black">
            메뉴별 판매량
          </h3>
          {lastSaleDate && (
            <span className="text-xs font-medium text-brutal-black/60">
              지난 영업일: {formatDate(new Date(lastSaleDate), 'yy-MM-dd(EEE)')}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="border-3 border-brutal-black bg-brutal-white p-8 text-center font-bold text-brutal-black shadow-brutal">
            로딩 중...
          </div>
        ) : skuRows.length === 0 ? (
          <div className="border-3 border-brutal-black bg-brutal-white p-8 text-center font-medium text-brutal-black shadow-brutal">
            등록된 SKU가 없습니다. 먼저 기초 데이터에서 SKU를 등록해주세요.
          </div>
        ) : (
          <div className="space-y-2">
            {skuRows.map((row) => {
              const quantity = Number(quantities[row.skuId] || 0)
              const hasQuantity = quantity > 0

              return (
                <div
                  key={row.skuId}
                  className={`border-3 border-brutal-black bg-brutal-white p-3 shadow-brutal transition-all ${
                    hasQuantity ? 'bg-brutal-green/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-brutal-black">
                        {row.skuName}
                      </div>
                      <div className="text-xs font-medium text-brutal-black/60">
                        {formatCurrency(Number(row.unitPrice))}
                        {row.lastQty > 0 && ` · 지난 영업일 ${row.lastQty}개`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {row.lastQty > 0 && !hasQuantity && (
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(row.skuId, String(row.lastQty))
                          }
                          className="border-2 border-brutal-black bg-brutal-yellow px-2 py-1 text-xs font-bold text-brutal-black"
                        >
                          ={row.lastQty}
                        </button>
                      )}
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={quantities[row.skuId] || ''}
                        onChange={(e) =>
                          handleQuantityChange(row.skuId, e.target.value)
                        }
                        placeholder="0"
                        className="w-20 text-right text-lg font-black"
                      />
                      <span className="text-sm font-bold text-brutal-black">
                        개
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 메모 */}
      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <Label htmlFor="memo">메모 (폐기, 서비스, 특이사항)</Label>
        <textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="mt-1 w-full border-2 border-brutal-black p-2 text-sm font-medium text-brutal-black focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
          placeholder="예: 닭강정 소 2개 폐기"
        />
      </div>

      {/* 합계 + 차이 */}
      <div className="sticky bottom-24 z-10">
        <div className="-mx-4 px-4 pt-4">
          <div className="border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-brutal-black">
                결제 합계
              </span>
              <span className="text-lg font-black text-brutal-black">
                {formatCurrency(paymentTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-brutal-black">
                판매량 합계
              </span>
              <span className="text-lg font-black text-brutal-black">
                {formatCurrency(salesTotal)}
              </span>
            </div>
            {hasPayment && hasSales && difference !== 0 && (
              <div className="mt-1 border-t-2 border-brutal-black/30 pt-1 text-right text-sm font-bold text-brutal-black">
                차이 {difference > 0 ? '+' : ''}
                {formatCurrency(difference)} (입력 누락 확인)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-14 left-0 right-0 z-20 border-t-3 border-brutal-black bg-brutal-yellow p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/dashboard')}
            disabled={isSubmitting}
            className="h-12 flex-1 py-3 text-base"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="h-12 flex-1 py-3 text-base"
          >
            {isSubmitting ? '저장 중...' : '마감 저장'}
          </Button>
        </div>
      </div>
    </form>
  )
}
