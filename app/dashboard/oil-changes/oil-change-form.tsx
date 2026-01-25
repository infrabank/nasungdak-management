'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createOilChange } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

   return (
    <form action={formAction} className="pb-32 max-w-2xl mx-auto">
      {/* Hidden storeId */}
      {storeId && <input type="hidden" name="storeId" value={storeId} />}

       {/* Error Message */}
       {state?.error && (
         <div className="bg-brutal-red/10 p-4 mb-4">
           <p className="text-sm text-brutal-red">{state.error}</p>
         </div>
       )}

       {/* Form Fields Card */}
       <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4 mb-4">
         <div className="space-y-4">
           <div>
             <Label>
               📅 교체일 <span className="text-red-500">*</span>
             </Label>
             <Input
               type="date"
               name="changeDate"
               required
             />
           </div>

           <div>
             <Label>
               🛢️ 튀김기 종류 <span className="text-red-500">*</span>
             </Label>
             <Select
               name="fryerType"
               required
               defaultValue=""
             >
               <option value="">선택하세요</option>
               <option value="초벌">초벌</option>
               <option value="재벌">재벌</option>
             </Select>
           </div>
         </div>
       </div>

      <div className="bg-brutal-blue border-3 border-brutal-black shadow-brutal p-4 mb-4">
        <p className="text-sm font-bold text-brutal-black">
          사용 기간은 이전 기름 교체 이력을 참조하여 자동으로 계산됩니다.
        </p>
      </div>

       <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4 mb-4">
         <div>
           <Label>
             📝 비고
           </Label>
           <Textarea
             name="notes"
             rows={3}
             placeholder="특이사항을 입력하세요"
           />
         </div>
       </div>

       {/* Fixed Bottom Action Bar - positioned above bottom nav on mobile */}
       <div className="fixed bottom-14 lg:bottom-0 left-0 right-0 bg-brutal-white border-t border-brutal-black p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4 z-20">
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
