'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getQuickPurchaseItems,
  createMultiplePurchases,
  type QuickPurchaseItem,
} from './actions'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from '@/components/ui/toast'

interface RowState {
  checked: boolean
  quantity: string
  unitPrice: string
}

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function formatShortDate(date: string) {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}

/**
 * 빠른 매입: 자주 사는 재료를 재료 단위로 골라 마지막 수량/단가 그대로(수정 가능) 등록.
 * 재료마다 매입 주기가 달라 날짜 묶음 복사 대신 이 방식을 쓴다.
 */
export default function QuickPurchaseButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [items, setItems] = useState<QuickPurchaseItem[]>([])
  const [date, setDate] = useState(todayString)
  const [rows, setRows] = useState<Record<string, RowState>>({})

  const handleOpen = async () => {
    setIsLoading(true)
    try {
      const result = await getQuickPurchaseItems()
      if (!result.success || !result.data) {
        toast.error(result.error || '자주 사는 재료 조회에 실패했습니다')
        return
      }
      if (result.data.length === 0) {
        toast.error('최근 매입 이력이 없습니다. 새 매입 등록을 이용해주세요.')
        return
      }
      setItems(result.data)
      const initial: Record<string, RowState> = {}
      for (const item of result.data) {
        initial[item.ingredientId] = {
          checked: false,
          quantity: String(item.lastQuantity),
          unitPrice: String(item.lastUnitPrice),
        }
      }
      setRows(initial)
      setDate(todayString())
      setIsOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const handleNumeric = (
    id: string,
    field: 'quantity' | 'unitPrice',
    value: string
  ) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      updateRow(id, { [field]: value })
    }
  }

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const row = rows[item.ingredientId]
        if (!row?.checked) return sum
        return sum + Number(row.quantity || 0) * Number(row.unitPrice || 0)
      }, 0),
    [items, rows]
  )

  const selectedCount = items.filter(
    (item) => rows[item.ingredientId]?.checked
  ).length

  const handleSubmit = async () => {
    const selected = items.filter((item) => {
      const row = rows[item.ingredientId]
      return row?.checked && Number(row.quantity || 0) > 0
    })
    if (selected.length === 0) {
      toast.error('등록할 재료를 선택해주세요')
      return
    }

    // 공급처별로 묶어 등록 (매입 1건 = 공급처 단위)
    const bySupplier = new Map<string, QuickPurchaseItem[]>()
    for (const item of selected) {
      const list = bySupplier.get(item.supplierName) ?? []
      list.push(item)
      bySupplier.set(item.supplierName, list)
    }

    setIsBusy(true)
    try {
      let successCount = 0
      const errors: string[] = []
      for (const [supplierName, group] of bySupplier) {
        const entries = group.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: rows[item.ingredientId].quantity,
          unitPrice: rows[item.ingredientId].unitPrice,
          notes: null,
        }))
        const result = await createMultiplePurchases(date, supplierName, entries)
        successCount += result.successCount ?? 0
        if (!result.success && result.errors?.length) {
          errors.push(...result.errors)
        }
      }
      if (errors.length > 0) {
        toast.error(`${successCount}건 등록, 일부 실패: ${errors.join(', ')}`)
      } else {
        toast.success(
          `${successCount}건 매입 등록 완료 · ${formatCurrency(total)}`
        )
      }
      setIsOpen(false)
      router.refresh()
    } finally {
      setIsBusy(false)
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
        {isLoading ? '조회 중...' : '빠른 매입'}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => !isBusy && setIsOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto border-3 border-brutal-black bg-brutal-white p-5 shadow-brutal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-brutal-black">빠른 매입</h3>
            <p className="mt-1 text-sm font-medium text-brutal-black/70">
              오늘 사 온 재료를 체크하세요. 수량·단가는 마지막 매입 기준이며
              수정할 수 있습니다.
            </p>

            <div className="mt-3">
              <label
                htmlFor="quickPurchaseDate"
                className="block text-sm font-bold text-brutal-black"
              >
                매입 날짜
              </label>
              <input
                type="date"
                id="quickPurchaseDate"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full border-2 border-brutal-black p-2 text-base font-medium text-brutal-black"
              />
            </div>

            <div className="mt-3 max-h-[45vh] space-y-1 overflow-y-auto border-y-2 border-brutal-black/20 py-2">
              {items.map((item) => {
                const row = rows[item.ingredientId]
                if (!row) return null
                const lineTotal =
                  Number(row.quantity || 0) * Number(row.unitPrice || 0)
                return (
                  <div
                    key={item.ingredientId}
                    className={`border-2 p-2 ${
                      row.checked
                        ? 'border-brutal-black bg-brutal-yellow/20'
                        : 'border-transparent'
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={(e) =>
                          updateRow(item.ingredientId, {
                            checked: e.target.checked,
                          })
                        }
                        className="h-4 w-4 shrink-0 accent-brutal-black"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-brutal-black">
                          {item.ingredientName}
                        </span>
                        <span className="block text-xs text-brutal-black/60">
                          마지막 {formatShortDate(item.lastDate)} ·{' '}
                          {item.lastQuantity}
                          {item.purchaseUnit ?? ''} ×{' '}
                          {formatCurrency(item.lastUnitPrice)} ·{' '}
                          {item.supplierName}
                        </span>
                      </span>
                    </label>
                    {row.checked && (
                      <div className="mt-2 flex items-center gap-2 pl-6">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.quantity}
                          onChange={(e) =>
                            handleNumeric(
                              item.ingredientId,
                              'quantity',
                              e.target.value
                            )
                          }
                          className="w-16 border-2 border-brutal-black p-1.5 text-right text-sm font-black text-brutal-black"
                          aria-label="수량"
                        />
                        <span className="text-xs font-medium text-brutal-black/60">
                          {item.purchaseUnit ?? ''} ×
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.unitPrice}
                          onChange={(e) =>
                            handleNumeric(
                              item.ingredientId,
                              'unitPrice',
                              e.target.value
                            )
                          }
                          className="w-24 border-2 border-brutal-black p-1.5 text-right text-sm font-black text-brutal-black"
                          aria-label="단가"
                        />
                        <span className="ml-auto text-sm font-black text-brutal-black">
                          {lineTotal > 0 ? formatCurrency(lineTotal) : '-'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-3 text-right">
              <span className="text-sm font-bold text-brutal-black">
                {selectedCount}개 선택 · 합계{' '}
              </span>
              <span className="text-xl font-black text-brutal-black">
                {formatCurrency(total)}
              </span>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isBusy}
                className="flex-1 border-2 border-brutal-black bg-brutal-white py-3 text-sm font-bold text-brutal-black shadow-brutal-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isBusy || selectedCount === 0}
                className="flex-1 border-2 border-brutal-black bg-brutal-yellow py-3 text-sm font-bold text-brutal-black shadow-brutal disabled:opacity-50"
              >
                {isBusy ? '등록 중...' : `${selectedCount}건 매입 등록`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
