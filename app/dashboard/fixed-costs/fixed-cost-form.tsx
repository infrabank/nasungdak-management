'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createFixedCost } from './actions'
import { formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface FixedCostFormProps {
  storeId?: string
}

export default function FixedCostForm({ storeId }: FixedCostFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setIsSubmitting(true)
      setError(null)

      try {
        const result = await createFixedCost(new FormData(e.currentTarget))

        if (result.success) {
          window.location.href = storeId
            ? `/dashboard/fixed-costs?storeId=${storeId}`
            : '/dashboard/fixed-costs'
          return
        } else {
          setError(result.error || '등록에 실패했습니다')
        }
      } catch {
        setError('등록 중 오류가 발생했습니다')
      } finally {
        setIsSubmitting(false)
      }
    },
    [storeId, router]
  )

  const today = formatDate(new Date(), 'yyyy-MM-dd')

  return (
    <form onSubmit={handleSubmit} className="pb-32">
      {/* Hidden storeId */}
      {storeId && <input type="hidden" name="storeId" value={storeId} />}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-brutal-red/10 p-4">
          <p className="text-sm text-brutal-red">{error}</p>
        </div>
      )}

      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-brutal-black">
          고정비용 등록
        </h3>

        <div className="space-y-4">
          {/* Cost Date */}
          <div>
            <Label htmlFor="costDate">📅 날짜 *</Label>
            <Input
              type="date"
              name="costDate"
              id="costDate"
              required
              defaultValue={today}
            />
          </div>

          {/* Cost Type */}
          <div>
            <Label htmlFor="costType">📁 비용 유형 *</Label>
            <Select id="costType" name="costType" required>
              <option value="">선택하세요</option>
              <option value="인건비">인건비</option>
              <option value="임대료">임대료</option>
              <option value="관리비">관리비</option>
              <option value="광고비">광고비</option>
              <option value="기타">기타</option>
            </Select>
          </div>

          {/* Cost Name */}
          <div>
            <Label htmlFor="costName">📋 항목명 *</Label>
            <Input
              type="text"
              name="costName"
              id="costName"
              required
              placeholder="예: 직원 급여, 월세, 전기요금 등"
            />
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">💰 금액 (원) *</Label>
            <Input
              type="number"
              name="amount"
              id="amount"
              required
              min="0"
              step="1"
              placeholder="0"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">📝 비고</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="추가 정보를 입력하세요 (선택사항)"
            />
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar - positioned above bottom nav on mobile */}
      <div className="fixed bottom-14 left-0 right-0 z-20 border-t border-brutal-black bg-brutal-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 py-3 text-base"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 text-base"
          >
            {isSubmitting ? '등록 중...' : '등록'}
          </Button>
        </div>
      </div>
    </form>
  )
}
