'use client'

import { useState, useEffect } from 'react'
import { createSku, updateSku, deleteSku } from './actions'
import { getMenus } from '../menus/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
import type { MenuCategory } from '@/lib/db/schema'

interface SkuFormProps {
  sku?: {
    id: string
    skuName: string
    menuId: string
    menuName: string | null
    unitPrice: string
    description: string | null
    isActive: boolean
  }
}

export default function SkuForm({ sku }: SkuFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menus, setMenus] = useState<MenuCategory[]>([])
  const confirm = useConfirm()

  useEffect(() => {
    if (isOpen) {
      getMenus().then(setMenus)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = sku
        ? await updateSku(sku.id, formData)
        : await createSku(formData)

      if (result.success) {
        setIsOpen(false)
        e.currentTarget.reset()
      } else {
        toast.error(result.error || '저장 중 오류가 발생했습니다')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!sku) return

    if (
      !(await confirm({
        title: '확인',
        description: '정말 삭제하시겠습니까?',
        variant: 'danger',
      }))
    )
      return

    setIsSubmitting(true)
    try {
      const result = await deleteSku(sku.id)
      if (result.success) {
        setIsOpen(false)
      } else {
        toast.error(result.error || '삭제 중 오류가 발생했습니다')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          sku
            ? 'px-1 font-bold text-brutal-black underline underline-offset-2 transition-all hover:bg-brutal-black hover:text-brutal-yellow'
            : 'border-2 border-brutal-black bg-brutal-yellow px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg'
        }
      >
        {sku ? '수정' : '새 SKU 등록'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-brutal-black/50 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="mb-4 text-lg font-semibold leading-6 text-brutal-black">
                    {sku ? 'SKU 수정' : '새 SKU 등록'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="skuName">SKU명 *</Label>
                      <Input
                        type="text"
                        name="skuName"
                        id="skuName"
                        required
                        defaultValue={sku?.skuName}
                        placeholder="예: 닭강정 (중), 순살치킨 (대)"
                      />
                    </div>

                    <div>
                      <Label htmlFor="menuId">메뉴 *</Label>
                      <Select
                        name="menuId"
                        id="menuId"
                        required
                        defaultValue={sku?.menuId}
                      >
                        <option value="">선택하세요</option>
                        {menus.map((menu) => (
                          <option key={menu.id} value={menu.id}>
                            {menu.menuName}
                          </option>
                        ))}
                      </Select>
                      {menus.length === 0 && (
                        <p className="mt-1 text-sm text-brutal-black/70">
                          먼저 메뉴를 등록해주세요
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="unitPrice">판매 단가 (원) *</Label>
                      <Input
                        type="number"
                        name="unitPrice"
                        id="unitPrice"
                        required
                        step="1"
                        min="0"
                        defaultValue={sku?.unitPrice}
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">설명</Label>
                      <Textarea
                        name="description"
                        id="description"
                        rows={3}
                        defaultValue={sku?.description || ''}
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        value="true"
                        defaultChecked={sku?.isActive ?? true}
                        className="h-4 w-4 border-brutal-black text-brutal-black"
                      />
                      <label
                        htmlFor="isActive"
                        className="ml-2 block text-sm text-brutal-black"
                      >
                        활성
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:col-start-2"
                  >
                    {isSubmitting ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    className="mt-3 w-full sm:col-start-1 sm:mt-0"
                  >
                    취소
                  </Button>
                </div>

                {sku && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="w-full"
                      size="sm"
                    >
                      삭제
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
