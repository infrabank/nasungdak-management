'use client'

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAttendance } from './actions'
import { formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Employee } from '@/lib/db/schema'

interface AttendanceFormProps {
  storeId?: string
  employees: Employee[]
}

export default function AttendanceForm({ storeId, employees }: AttendanceFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createAttendance, null)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [workHours, setWorkHours] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [totalPay, setTotalPay] = useState('')

  // Redirect on success
  if (state?.success) {
    router.push(storeId ? `/dashboard/attendance?storeId=${storeId}` : '/dashboard/attendance')
  }

  // Auto-fill hourlyRate when employee is selected
  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = employees.find((e) => e.id === selectedEmployeeId)
      if (employee) {
        setHourlyRate(employee.hourlyRate)
      }
    }
  }, [selectedEmployeeId, employees])

  // Auto-calculate totalPay when workHours or hourlyRate changes
  useEffect(() => {
    const hours = Number(workHours)
    const rate = Number(hourlyRate)
    if (hours > 0 && rate > 0) {
      const calculated = Math.round(hours * rate)
      setTotalPay(String(calculated))
    }
  }, [workHours, hourlyRate])

  const today = formatDate(new Date(), 'yyyy-MM-dd')

  return (
    <form action={formAction} className="pb-32">
      {/* Hidden storeId */}
      {storeId && <input type="hidden" name="storeId" value={storeId} />}

      {/* No Store Warning */}
      {!storeId && (
        <div className="mb-4 bg-brutal-yellow border-3 border-brutal-black shadow-brutal p-4">
          <p className="text-sm font-bold text-brutal-black">
            상단에서 매장을 선택해주세요
          </p>
        </div>
      )}

      {/* No Employees Warning */}
      {storeId && employees.length === 0 && (
        <div className="mb-4 bg-brutal-pink border-3 border-brutal-black shadow-brutal p-4">
          <p className="text-sm font-bold text-brutal-black">
            등록된 재직 직원이 없습니다. 먼저 직원을 등록해주세요.
          </p>
        </div>
      )}

      {/* Error Message */}
      {state?.error && (
        <div className="mb-4 bg-brutal-red/10 border-3 border-brutal-red p-4">
          <p className="text-sm font-bold text-brutal-red">{state.error}</p>
        </div>
      )}

      <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4 mb-4">
        <h3 className="text-sm font-black text-brutal-black uppercase tracking-wide mb-4">
          출퇴근 기록
        </h3>

        <div className="space-y-4">
          {/* Employee */}
          <div>
            <Label htmlFor="employeeId">
              👤 직원 *
            </Label>
            <Select
              id="employeeId"
              name="employeeId"
              required
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={employees.length === 0}
            >
              <option value="">선택하세요</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeName}
                </option>
              ))}
            </Select>
          </div>

          {/* Work Date */}
          <div>
            <Label htmlFor="workDate">
              📅 근무일 *
            </Label>
            <Input
              type="date"
              name="workDate"
              id="workDate"
              required
              defaultValue={today}
            />
          </div>

          {/* Work Hours */}
          <div>
            <Label htmlFor="workHours">
              🕐 근무시간 *
            </Label>
            <Input
              type="number"
              name="workHours"
              id="workHours"
              required
              min="0.5"
              max="24"
              step="0.5"
              placeholder="예: 8"
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value)}
            />
            <p className="mt-1 text-xs text-brutal-black/60">
              0.5시간(30분) 단위로 입력
            </p>
          </div>

          {/* Hourly Rate */}
          <div>
            <Label htmlFor="hourlyRate">
              💰 시급 (원) *
            </Label>
            <Input
              type="number"
              name="hourlyRate"
              id="hourlyRate"
              required
              min="0"
              step="10"
              placeholder="직원 선택 시 자동 입력"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>

          {/* Total Pay */}
          <div>
            <Label htmlFor="totalPay">
              💵 지급액 (원)
            </Label>
            <Input
              type="number"
              name="totalPay"
              id="totalPay"
              min="0"
              step="1"
              placeholder="자동 계산됨"
              value={totalPay}
              onChange={(e) => setTotalPay(e.target.value)}
            />
            <p className="mt-1 text-xs text-brutal-black/60">
              시급 × 근무시간으로 자동 계산됩니다. 수정 가능합니다.
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">
              📝 비고
            </Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="추가 정보를 입력하세요 (선택사항)"
            />
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-14 lg:bottom-0 left-0 right-0 bg-brutal-white border-t border-brutal-black p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4 z-20">
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
            disabled={isPending || employees.length === 0}
            className="flex-1 py-3 text-base"
          >
            {isPending ? '등록 중...' : '등록'}
          </Button>
        </div>
      </div>
    </form>
  )
}
