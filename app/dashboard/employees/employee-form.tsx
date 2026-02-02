'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createEmployee } from './actions'
import { formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EmployeeFormProps {
  storeId?: string
}

export default function EmployeeForm({ storeId }: EmployeeFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createEmployee, null)

  // Redirect on success
  if (state?.success) {
    router.push(
      storeId
        ? `/dashboard/employees?storeId=${storeId}`
        : '/dashboard/employees'
    )
  }

  const today = formatDate(new Date(), 'yyyy-MM-dd')

  return (
    <form action={formAction} className="pb-32">
      {/* Hidden storeId */}
      {storeId && <input type="hidden" name="storeId" value={storeId} />}

      {/* No Store Warning */}
      {!storeId && (
        <div className="mb-4 border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal">
          <p className="text-sm font-bold text-brutal-black">
            상단에서 매장을 선택해주세요
          </p>
        </div>
      )}

      {/* Error Message */}
      {state?.error && (
        <div className="mb-4 border-3 border-brutal-red bg-brutal-red/10 p-4">
          <p className="text-sm font-bold text-brutal-red">{state.error}</p>
        </div>
      )}

      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-brutal-black">
          직원 정보
        </h3>

        <div className="space-y-4">
          {/* Employee Name */}
          <div>
            <Label htmlFor="employeeName">👤 직원명 *</Label>
            <Input
              type="text"
              name="employeeName"
              id="employeeName"
              required
              placeholder="예: 홍길동"
              maxLength={100}
            />
          </div>

          {/* Hourly Rate */}
          <div>
            <Label htmlFor="hourlyRate">💰 시급 (원) *</Label>
            <Input
              type="number"
              name="hourlyRate"
              id="hourlyRate"
              required
              min="0"
              step="10"
              placeholder="예: 9620"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">📱 연락처</Label>
            <Input
              type="tel"
              name="phone"
              id="phone"
              placeholder="예: 010-1234-5678"
              maxLength={20}
            />
          </div>

          {/* Hire Date */}
          <div>
            <Label htmlFor="hireDate">📅 입사일</Label>
            <Input
              type="date"
              name="hireDate"
              id="hireDate"
              defaultValue={today}
            />
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              defaultChecked={true}
              className="h-5 w-5 border-2 border-brutal-black accent-brutal-yellow"
            />
            <Label htmlFor="isActive" className="mb-0 cursor-pointer">
              재직 중
            </Label>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-14 left-0 right-0 z-20 border-t border-brutal-black bg-brutal-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-4">
        <div className="mx-auto flex max-w-lg gap-3">
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
