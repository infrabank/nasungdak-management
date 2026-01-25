'use client'

import { useState } from 'react'
import { createSupplier, updateSupplier } from './actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Supplier } from '@/lib/db/schema'

interface SupplierFormProps {
  supplier?: Supplier
}

export default function SupplierForm({ supplier }: SupplierFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!supplier

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const result = isEditing
      ? await updateSupplier(supplier.id, formData)
      : await createSupplier(formData)

    if (result.success) {
      setIsOpen(false)
    } else {
      setError(result.error || '처리에 실패했습니다')
    }

    setIsSubmitting(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          isEditing
            ? 'font-bold text-brutal-black underline underline-offset-2 hover:text-brutal-yellow hover:bg-brutal-black px-1 text-sm transition-all'
            : 'px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all'
        }
      >
        {isEditing ? '수정' : '공급업체 등록'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
           <div
             className="fixed inset-0 bg-brutal-black/50 transition-opacity"
             onClick={() => setIsOpen(false)}
           />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md transform overflow-hidden bg-brutal-white border-3 border-brutal-black shadow-brutal-lg p-6 transition-all">
              <h3 className="text-lg font-semibold text-brutal-black mb-4">
                 {isEditing ? '공급업체 수정' : '공급업체 등록'}
               </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="supplierName">공급업체명 *</Label>
                  <Input
                    type="text"
                    name="supplierName"
                    id="supplierName"
                    defaultValue={supplier?.supplierName || ''}
                    required
                    placeholder="예: (주)나성식품"
                  />
                </div>

                <div>
                  <Label htmlFor="contactName">담당자명</Label>
                  <Input
                    type="text"
                    name="contactName"
                    id="contactName"
                    defaultValue={supplier?.contactName || ''}
                    placeholder="담당자 이름"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    type="tel"
                    name="phone"
                    id="phone"
                    defaultValue={supplier?.phone || ''}
                    placeholder="010-1234-5678"
                  />
                </div>

                <div>
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    type="email"
                    name="email"
                    id="email"
                    defaultValue={supplier?.email || ''}
                    placeholder="example@company.com"
                  />
                </div>

                <div>
                  <Label htmlFor="businessNumber">사업자등록번호</Label>
                  <Input
                    type="text"
                    name="businessNumber"
                    id="businessNumber"
                    defaultValue={supplier?.businessNumber || ''}
                    placeholder="123-45-67890"
                  />
                </div>

                <div>
                  <Label htmlFor="address">주소</Label>
                  <Input
                    type="text"
                    name="address"
                    id="address"
                    defaultValue={supplier?.address || ''}
                    placeholder="사업장 주소"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">비고</Label>
                  <Textarea
                    name="notes"
                    id="notes"
                    defaultValue={supplier?.notes || ''}
                    rows={2}
                    placeholder="추가 메모"
                  />
                </div>

                 <div className="flex items-center gap-2">
                   <input
                     type="checkbox"
                     name="isActive"
                     value="true"
                     defaultChecked={supplier?.isActive ?? true}
                     className="h-4 w-4 border-brutal-black text-brutal-black"
                   />
                   <label className="text-sm text-brutal-black">활성화</label>
                 </div>

                 {error && (
                   <div className="bg-brutal-red/10 p-3 text-sm text-brutal-red">
                     {error}
                   </div>
                 )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                  >
                    {isSubmitting ? '처리 중...' : isEditing ? '수정' : '등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
