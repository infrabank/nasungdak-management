'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getLastPurchaseDaySummary,
  copyLastPurchasesToToday,
  type LastPurchaseDaySummary,
} from './actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from '@/components/ui/toast'

export default function CopyLastPurchaseButton() {
  const router = useRouter()
  const [summary, setSummary] = useState<LastPurchaseDaySummary | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const handleOpen = async () => {
    setIsLoading(true)
    try {
      const result = await getLastPurchaseDaySummary()
      if (!result.success) {
        toast.error(result.error || '최근 매입 조회에 실패했습니다')
        return
      }
      if (!result.data) {
        toast.error('복사할 매입 내역이 없습니다')
        return
      }
      setSummary(result.data)
      setIsOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    setIsCopying(true)
    try {
      const result = await copyLastPurchasesToToday()
      if (result.success) {
        toast.success(
          `${result.count}건 복사 완료 · ${formatCurrency(result.totalAmount ?? 0)}`
        )
        setIsOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || '매입 복사에 실패했습니다')
      }
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isLoading}
        className="block border-2 border-brutal-black bg-brutal-white px-4 py-2 text-center text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm disabled:opacity-50"
      >
        {isLoading ? '조회 중...' : '지난 매입 복사'}
      </button>

      {isOpen && summary && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => !isCopying && setIsOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto border-3 border-brutal-black bg-brutal-white p-5 shadow-brutal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-brutal-black">
              {formatDate(new Date(summary.date), 'yy-MM-dd(EEE)')} 매입을
              오늘 날짜로 복사
            </h3>
            <p className="mt-1 text-sm font-medium text-brutal-black/70">
              {summary.items.length}건 · 총 {formatCurrency(summary.totalAmount)}
            </p>

            <div className="mt-4 max-h-60 space-y-2 overflow-y-auto border-y-2 border-brutal-black/20 py-3">
              {summary.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-brutal-black">
                      {item.ingredientName}
                    </span>
                    <span className="ml-2 text-brutal-black/60">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                  <span className="ml-2 font-black text-brutal-black">
                    {formatCurrency(item.totalAmount)}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs font-medium text-brutal-black/60">
              재고도 자동으로 입고 반영됩니다. 수량이나 단가가 다르면 등록 후
              개별 수정하세요.
            </p>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isCopying}
                className="flex-1 border-2 border-brutal-black bg-brutal-white py-3 text-sm font-bold text-brutal-black shadow-brutal-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={isCopying}
                className="flex-1 border-2 border-brutal-black bg-brutal-yellow py-3 text-sm font-bold text-brutal-black shadow-brutal disabled:opacity-50"
              >
                {isCopying ? '등록 중...' : '오늘 날짜로 등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
