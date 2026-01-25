'use client'

import { useState, useEffect } from 'react'
import { createCostRule, updateCostRule, deleteCostRule, getMenus, getIngredients } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils/format'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface CostRuleFormProps {
  rule?: {
    id: string
    menuId: string
    menuName: string | null
    ingredientId: string
    ingredientName: string | null
    distributionPercent: string
    effectiveFrom: string
    effectiveTo: string | null
  }
}

export default function CostRuleForm({ rule }: CostRuleFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menus, setMenus] = useState<Array<{ id: string; menuName: string }>>([])
  const [ingredientsList, setIngredientsList] = useState<Array<{ id: string; ingredientName: string; unit: string }>>([])
  const confirm = useConfirm()

  useEffect(() => {
    if (isOpen) {
      Promise.all([getMenus(), getIngredients()]).then(([menusData, ingredientsData]) => {
        setMenus(menusData)
        setIngredientsList(ingredientsData)
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = rule
        ? await updateCostRule(rule.id, formData)
        : await createCostRule(formData)

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
    if (!rule) return

    if (!(await confirm({ title: '확인', description: '정말 삭제하시겠습니까?', variant: 'danger' }))) return

    setIsSubmitting(true)
    try {
      const result = await deleteCostRule(rule.id)
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
          rule
            ? 'font-bold text-brutal-black underline underline-offset-2 hover:text-brutal-yellow hover:bg-brutal-black px-1 transition-all'
            : 'px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all'
        }
      >
        {rule ? '수정' : '규칙 추가'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden bg-brutal-white border-3 border-brutal-black shadow-brutal-lg px-4 pb-4 pt-5 text-left transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                    {rule ? '원가 배분 규칙 수정' : '원가 배분 규칙 추가'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="menuId">메뉴 *</Label>
                      <Select
                        name="menuId"
                        id="menuId"
                        required
                        defaultValue={rule?.menuId}
                      >
                        <option value="">선택하세요</option>
                        {menus.map((menu) => (
                          <option key={menu.id} value={menu.id}>
                            {menu.menuName}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ingredientId">재료 *</Label>
                      <Select
                        name="ingredientId"
                        id="ingredientId"
                        required
                        defaultValue={rule?.ingredientId}
                      >
                        <option value="">선택하세요</option>
                        {ingredientsList.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.ingredientName} ({ingredient.unit})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="distributionPercent">배분 비율 (%) *</Label>
                      <Input
                        type="number"
                        name="distributionPercent"
                        id="distributionPercent"
                        required
                        step="0.01"
                        min="0.01"
                        max="100"
                        defaultValue={rule?.distributionPercent}
                        placeholder="예: 40.5"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        같은 메뉴의 모든 재료 배분 비율 합계가 100%가 되도록 설정하세요
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="effectiveFrom">시작일 *</Label>
                      <Input
                        type="date"
                        name="effectiveFrom"
                        id="effectiveFrom"
                        required
                        defaultValue={rule?.effectiveFrom}
                      />
                    </div>

                    <div>
                      <Label htmlFor="effectiveTo">종료일 (선택사항)</Label>
                      <Input
                        type="date"
                        name="effectiveTo"
                        id="effectiveTo"
                        defaultValue={rule?.effectiveTo || ''}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        비워두면 계속 유효합니다
                      </p>
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

                {rule && (
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
