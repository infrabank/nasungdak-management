'use client'

import { useActionState } from 'react'
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
  const [state, formAction, isPending] = useActionState(createFixedCost, null)

  // Redirect on success
  if (state?.success) {
    router.push(storeId ? `/dashboard/fixed-costs?storeId=${storeId}` : '/dashboard/fixed-costs')
  }

   const today = formatDate(new Date(), 'yyyy-MM-dd')

   return (
    <form action={formAction} className="pb-32">
      {/* Hidden storeId */}
      {storeId && <input type="hidden" name="storeId" value={storeId} />}

       {/* Error Message */}
       {state?.error && (
         <div className="mb-4 bg-brutal-red/10 p-4">
           <p className="text-sm text-brutal-red">{state.error}</p>
         </div>
       )}

      <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4 mb-4">
        <h3 className="text-sm font-black text-brutal-black uppercase tracking-wide mb-4">
          고정비용 등록
        </h3>

         <div className="space-y-4">
           {/* Cost Date */}
           <div>
             <Label htmlFor="costDate">
               📅 날짜 *
             </Label>
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
             <Label htmlFor="costType">
               📁 비용 유형 *
             </Label>
             <Select
               id="costType"
               name="costType"
               required
             >
               <option value="">선택하세요</option>
               <option value="인건비">인건비</option>
               <option value="임대료">임대료</option>
               <option value="관리비">관리비</option>
               <option value="기타">기타</option>
             </Select>
           </div>

           {/* Cost Name */}
           <div>
             <Label htmlFor="costName">
               📋 항목명 *
             </Label>
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
             <Label htmlFor="amount">
               💰 금액 (원) *
             </Label>
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

       {/* Fixed Bottom Action Bar - positioned above bottom nav on mobile */}
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
