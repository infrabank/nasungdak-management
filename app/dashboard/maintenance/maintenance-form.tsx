'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createMaintenanceLog } from './actions'
import { MAINTENANCE_TASK_TYPES } from '@/lib/utils/validation'
import { TASK_META } from './task-meta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface MaintenanceFormProps {
  storeId?: string
}

export default function MaintenanceForm({ storeId }: MaintenanceFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    createMaintenanceLog,
    null
  )

  // 오늘 날짜 기본값 (로컬 기준)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Redirect on success
  if (state?.success) {
    router.push(
      storeId
        ? `/dashboard/maintenance?storeId=${storeId}`
        : '/dashboard/maintenance'
    )
  }

  return (
    <form action={formAction} className="mx-auto max-w-2xl pb-32">
      {/* Hidden storeId */}
      {storeId && <input type="hidden" name="storeId" value={storeId} />}

      {/* Error Message */}
      {state?.error && (
        <div className="mb-4 bg-brutal-red/10 p-4">
          <p className="text-sm text-brutal-red">{state.error}</p>
        </div>
      )}

      {/* Form Fields Card */}
      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <div className="space-y-4">
          <div>
            <Label>
              🧽 항목 <span className="text-red-500">*</span>
            </Label>
            <Select name="taskType" required defaultValue="">
              <option value="">선택하세요</option>
              {MAINTENANCE_TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TASK_META[t]?.emoji ?? '🧽'} {t}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>
              📅 수행일 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              name="performedDate"
              required
              defaultValue={todayStr}
            />
          </div>
        </div>
      </div>

      <div className="mb-4 border-3 border-brutal-black bg-brutal-blue p-4 shadow-brutal">
        <p className="text-sm font-bold text-brutal-black">
          청소·정비를 한 날짜만 남겨두면, 항목별 마지막 수행일과 경과일이 한눈에
          정리됩니다.
        </p>
      </div>

      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <div>
          <Label>📝 비고</Label>
          <Textarea name="notes" rows={3} placeholder="특이사항을 입력하세요" />
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-14 left-0 right-0 z-20 border-t border-brutal-black bg-brutal-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              router.push(
                storeId
                  ? `/dashboard/maintenance?storeId=${storeId}`
                  : '/dashboard/maintenance'
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
