'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createOilChange } from './actions'
import { Button } from '@/components/ui/button'

interface OilChangeFormProps {
  storeId?: string
}

export default function OilChangeForm({ storeId }: OilChangeFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createOilChange, null)

  // Redirect on success
  if (state?.success) {
    router.push(storeId ? `/dashboard/oil-changes?storeId=${storeId}` : '/dashboard/oil-changes')
  }

  const inputClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 appearance-none bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'

  return (
    <form action={formAction} className="pb-32 max-w-2xl mx-auto">
      {/* Hidden storeId */}
      {storeId && <input type="hidden" name="storeId" value={storeId} />}

      {/* Error Message */}
      {state?.error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <p className="text-sm text-red-800">{state.error}</p>
        </div>
      )}

      {/* Form Fields Card */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4 mb-4">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              📅 교체일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="changeDate"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              🛢️ 튀김기 종류 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="fryerType"
                required
                className={selectClass}
                defaultValue=""
              >
                <option value="">선택하세요</option>
                <option value="초벌">초벌</option>
                <option value="재벌">재벌</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
        <p className="text-sm text-blue-800">
          사용 기간은 이전 기름 교체 이력을 참조하여 자동으로 계산됩니다.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4 mb-4">
        <div>
          <label className={labelClass}>
            📝 비고
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="특이사항을 입력하세요"
            className={inputClass}
          />
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
                  ? `/dashboard/oil-changes?storeId=${storeId}`
                  : '/dashboard/oil-changes'
              )
            }
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
