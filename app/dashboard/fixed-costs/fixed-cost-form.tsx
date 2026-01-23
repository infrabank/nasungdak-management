'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createFixedCost } from './actions'
import { formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'

interface FixedCostFormProps {
  storeId?: string
}

export default function FixedCostForm({ storeId }: FixedCostFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createFixedCost, null)

  // Redirect on success
  if (state?.success) {
    router.push(storeId ? `/dashboard/fixed-costs?storeId=${storeId}` : '/dashboard/fixed-costs')
  }

  const today = formatDate(new Date(), 'yyyy-MM-dd')

  const inputClass =
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all placeholder:text-brutal-black/50'
  const selectClass =
    'block w-full border-2 border-brutal-black py-3 px-4 text-base font-medium text-brutal-black bg-brutal-white shadow-brutal-sm focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all appearance-none'
  const labelClass = 'block text-sm font-bold text-brutal-black mb-2'

  return (
    <form action={formAction} className="pb-32">
      {/* Hidden storeId */}
      {storeId && <input type="hidden" name="storeId" value={storeId} />}

      {/* Error Message */}
      {state?.error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{state.error}</p>
        </div>
      )}

      <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4 mb-4">
        <h3 className="text-sm font-black text-brutal-black uppercase tracking-wide mb-4">
          고정비용 등록
        </h3>

        <div className="space-y-4">
          {/* Cost Date */}
          <div>
            <label htmlFor="costDate" className={labelClass}>
              📅 날짜 *
            </label>
            <input
              type="date"
              name="costDate"
              id="costDate"
              required
              defaultValue={today}
              className={inputClass}
            />
          </div>

          {/* Cost Type */}
          <div>
            <label htmlFor="costType" className={labelClass}>
              📁 비용 유형 *
            </label>
            <div className="relative">
              <select
                id="costType"
                name="costType"
                required
                className={selectClass}
              >
                <option value="">선택하세요</option>
                <option value="인건비">인건비</option>
                <option value="임대료">임대료</option>
                <option value="관리비">관리비</option>
                <option value="기타">기타</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Cost Name */}
          <div>
            <label htmlFor="costName" className={labelClass}>
              📋 항목명 *
            </label>
            <input
              type="text"
              name="costName"
              id="costName"
              required
              placeholder="예: 직원 급여, 월세, 전기요금 등"
              className={inputClass}
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className={labelClass}>
              💰 금액 (원) *
            </label>
            <input
              type="number"
              name="amount"
              id="amount"
              required
              min="0"
              step="1"
              placeholder="0"
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className={labelClass}>
              📝 비고
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="추가 정보를 입력하세요 (선택사항)"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar - positioned above bottom nav on mobile */}
      <div className="fixed bottom-14 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4 z-20">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isPending}
            className="flex-1 py-3 text-base"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 py-3 text-base"
          >
            {isPending ? '등록 중...' : '등록'}
          </Button>
        </div>
      </div>
    </form>
  )
}
