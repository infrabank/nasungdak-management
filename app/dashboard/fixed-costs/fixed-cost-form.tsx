'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createFixedCost } from './actions'
import { formatDate } from '@/lib/utils/format'

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

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
      <form action={formAction} className="px-4 py-6 sm:p-8">
        {/* Hidden storeId */}
        {storeId && <input type="hidden" name="storeId" value={storeId} />}

        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
          {/* Error Message */}
          {state?.error && (
            <div className="sm:col-span-6">
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{state.error}</p>
              </div>
            </div>
          )}

          {/* Cost Date */}
          <div className="sm:col-span-3">
            <label htmlFor="costDate" className="block text-sm font-medium text-gray-900">
              날짜 *
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="costDate"
                id="costDate"
                required
                defaultValue={today}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>
          </div>

          {/* Cost Type */}
          <div className="sm:col-span-3">
            <label htmlFor="costType" className="block text-sm font-medium text-gray-900">
              비용 유형 *
            </label>
            <div className="mt-2">
              <select
                id="costType"
                name="costType"
                required
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              >
                <option value="">선택하세요</option>
                <option value="인건비">인건비</option>
                <option value="임대료">임대료</option>
                <option value="관리비">관리비</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          {/* Cost Name */}
          <div className="sm:col-span-4">
            <label htmlFor="costName" className="block text-sm font-medium text-gray-900">
              항목명 *
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="costName"
                id="costName"
                required
                placeholder="예: 직원 급여, 월세, 전기요금 등"
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>
          </div>

          {/* Amount */}
          <div className="sm:col-span-2">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-900">
              금액 (원) *
            </label>
            <div className="mt-2">
              <input
                type="number"
                name="amount"
                id="amount"
                required
                min="0"
                step="1"
                placeholder="0"
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="sm:col-span-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
              비고
            </label>
            <div className="mt-2">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="추가 정보를 입력하세요 (선택사항)"
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            {isPending ? '등록 중...' : '등록'}
          </button>
          <button
            type="button"
            onClick={() => router.push(storeId ? `/dashboard/fixed-costs?storeId=${storeId}` : '/dashboard/fixed-costs')}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
