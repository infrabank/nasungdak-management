'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getPurchaseTemplates,
  createTemplateFromLastPurchaseDay,
  deletePurchaseTemplate,
  type PurchaseTemplateView,
} from './template-actions'
import { createMultiplePurchases } from './actions'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from '@/components/ui/toast'

type View = 'list' | 'create' | 'apply'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

export default function PurchaseTemplatesButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<View>('list')
  const [templates, setTemplates] = useState<PurchaseTemplateView[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  // create view
  const [newName, setNewName] = useState('')

  // apply view
  const [applying, setApplying] = useState<PurchaseTemplateView | null>(null)
  const [applyDate, setApplyDate] = useState(todayString)
  const [quantities, setQuantities] = useState<Record<string, string>>({})

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const result = await getPurchaseTemplates()
      if (result.success && result.data) {
        setTemplates(result.data)
      } else {
        toast.error(result.error || '템플릿 조회에 실패했습니다')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = async () => {
    setIsOpen(true)
    setView('list')
    await loadTemplates()
  }

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('템플릿 이름을 입력해주세요')
      return
    }
    setIsBusy(true)
    try {
      const result = await createTemplateFromLastPurchaseDay(newName)
      if (result.success) {
        toast.success(
          `템플릿 생성 완료 (${result.sourceDate} 매입 ${result.itemCount}개 품목)`
        )
        setNewName('')
        setView('list')
        await loadTemplates()
      } else {
        toast.error(result.error || '템플릿 생성에 실패했습니다')
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleDelete = async (template: PurchaseTemplateView) => {
    if (!confirm(`'${template.templateName}' 템플릿을 삭제할까요?`)) return
    setIsBusy(true)
    try {
      const result = await deletePurchaseTemplate(template.id)
      if (result.success) {
        toast.success('템플릿을 삭제했습니다')
        await loadTemplates()
      } else {
        toast.error(result.error || '템플릿 삭제에 실패했습니다')
      }
    } finally {
      setIsBusy(false)
    }
  }

  const startApply = (template: PurchaseTemplateView) => {
    setApplying(template)
    setApplyDate(todayString())
    const initial: Record<string, string> = {}
    for (const item of template.items) {
      initial[item.ingredientId] = String(item.defaultQuantity)
    }
    setQuantities(initial)
    setView('apply')
  }

  const handleQuantityChange = (ingredientId: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setQuantities((prev) => ({ ...prev, [ingredientId]: value }))
    }
  }

  const applyTotal = applying
    ? applying.items.reduce((sum, item) => {
        const qty = Number(quantities[item.ingredientId] || 0)
        return sum + qty * item.latestUnitPrice
      }, 0)
    : 0

  const handleApply = async () => {
    if (!applying) return
    const entries = applying.items
      .filter((item) => Number(quantities[item.ingredientId] || 0) > 0)
      .map((item) => ({
        ingredientId: item.ingredientId,
        quantity: quantities[item.ingredientId],
        unitPrice: String(item.latestUnitPrice),
        notes: `템플릿: ${applying.templateName}`,
      }))

    if (entries.length === 0) {
      toast.error('수량을 1개 이상 입력해주세요')
      return
    }

    setIsBusy(true)
    try {
      const result = await createMultiplePurchases(
        applyDate,
        applying.supplierName,
        entries
      )
      if (result.success) {
        toast.success(`${result.successCount}건 매입 등록 완료`)
        setIsOpen(false)
        router.refresh()
      } else {
        toast.error(
          result.errors?.length
            ? result.errors.join('\n')
            : result.error || '매입 등록에 실패했습니다'
        )
      }
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="block border-2 border-brutal-black bg-brutal-white px-4 py-2 text-center text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
      >
        매입 템플릿
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => !isBusy && setIsOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto border-3 border-brutal-black bg-brutal-white p-5 shadow-brutal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 목록 */}
            {view === 'list' && (
              <>
                <h3 className="text-lg font-black text-brutal-black">
                  매입 템플릿
                </h3>
                <p className="mt-1 text-sm font-medium text-brutal-black/70">
                  자주 쓰는 매입 묶음을 클릭 몇 번으로 등록합니다
                </p>

                <div className="mt-4 space-y-2">
                  {isLoading ? (
                    <p className="py-6 text-center text-sm font-bold text-brutal-black">
                      로딩 중...
                    </p>
                  ) : templates.length === 0 ? (
                    <p className="py-6 text-center text-sm font-medium text-brutal-black/60">
                      아직 템플릿이 없습니다.
                      <br />
                      아래 버튼으로 최근 매입을 템플릿으로 만들어보세요.
                    </p>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className="border-2 border-brutal-black p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-bold text-brutal-black">
                              {template.templateName}
                            </div>
                            <div className="text-xs font-medium text-brutal-black/60">
                              {template.supplierName} ·{' '}
                              {template.items.length}개 품목 · 약{' '}
                              {formatCurrency(template.estimatedTotal)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => startApply(template)}
                            disabled={isBusy}
                            className="border-2 border-brutal-black bg-brutal-yellow px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm"
                          >
                            사용
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(template)}
                            disabled={isBusy}
                            className="border-2 border-brutal-black bg-brutal-white px-2 py-2 text-sm font-bold text-brutal-black/60"
                            aria-label="템플릿 삭제"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 border-2 border-brutal-black bg-brutal-white py-3 text-sm font-bold text-brutal-black shadow-brutal-sm"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('create')}
                    className="flex-1 border-2 border-brutal-black bg-brutal-green py-3 text-sm font-bold text-brutal-black shadow-brutal"
                  >
                    + 최근 매입으로 만들기
                  </button>
                </div>
              </>
            )}

            {/* 생성 */}
            {view === 'create' && (
              <>
                <h3 className="text-lg font-black text-brutal-black">
                  템플릿 만들기
                </h3>
                <p className="mt-1 text-sm font-medium text-brutal-black/70">
                  가장 최근 매입일의 품목과 수량을 템플릿으로 저장합니다
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="templateName"
                    className="block text-sm font-bold text-brutal-black"
                  >
                    템플릿 이름
                  </label>
                  <input
                    type="text"
                    id="templateName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="예: 닭고기 발주, 코스트코 장보기"
                    maxLength={100}
                    className="mt-1 w-full border-2 border-brutal-black p-3 text-base font-medium text-brutal-black focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    disabled={isBusy}
                    className="flex-1 border-2 border-brutal-black bg-brutal-white py-3 text-sm font-bold text-brutal-black shadow-brutal-sm"
                  >
                    뒤로
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isBusy}
                    className="flex-1 border-2 border-brutal-black bg-brutal-yellow py-3 text-sm font-bold text-brutal-black shadow-brutal disabled:opacity-50"
                  >
                    {isBusy ? '저장 중...' : '템플릿 저장'}
                  </button>
                </div>
              </>
            )}

            {/* 적용 */}
            {view === 'apply' && applying && (
              <>
                <h3 className="text-lg font-black text-brutal-black">
                  {applying.templateName}
                </h3>
                <p className="mt-1 text-sm font-medium text-brutal-black/70">
                  {applying.supplierName} · 단가는 최근 매입가 기준
                </p>

                <div className="mt-3">
                  <label
                    htmlFor="applyDate"
                    className="block text-sm font-bold text-brutal-black"
                  >
                    매입 날짜
                  </label>
                  <input
                    type="date"
                    id="applyDate"
                    value={applyDate}
                    onChange={(e) => setApplyDate(e.target.value)}
                    className="mt-1 w-full border-2 border-brutal-black p-2 text-base font-medium text-brutal-black"
                  />
                </div>

                <div className="mt-3 max-h-60 space-y-2 overflow-y-auto border-y-2 border-brutal-black/20 py-3">
                  {applying.items.map((item) => {
                    const qty = Number(quantities[item.ingredientId] || 0)
                    return (
                      <div
                        key={item.ingredientId}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-brutal-black">
                            {item.ingredientName}
                          </div>
                          <div className="text-xs text-brutal-black/60">
                            {formatCurrency(item.latestUnitPrice)}
                            {item.unit ? ` / ${item.unit}` : ''}
                          </div>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={quantities[item.ingredientId] || ''}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.ingredientId,
                              e.target.value
                            )
                          }
                          placeholder="0"
                          className="w-20 border-2 border-brutal-black p-2 text-right text-base font-black text-brutal-black"
                        />
                        <span className="w-20 text-right text-sm font-black text-brutal-black">
                          {qty > 0
                            ? formatCurrency(qty * item.latestUnitPrice)
                            : '-'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 text-right">
                  <span className="text-sm font-bold text-brutal-black">
                    합계{' '}
                  </span>
                  <span className="text-xl font-black text-brutal-black">
                    {formatCurrency(applyTotal)}
                  </span>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    disabled={isBusy}
                    className="flex-1 border-2 border-brutal-black bg-brutal-white py-3 text-sm font-bold text-brutal-black shadow-brutal-sm"
                  >
                    뒤로
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={isBusy}
                    className="flex-1 border-2 border-brutal-black bg-brutal-yellow py-3 text-sm font-bold text-brutal-black shadow-brutal disabled:opacity-50"
                  >
                    {isBusy ? '등록 중...' : '매입 등록'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
