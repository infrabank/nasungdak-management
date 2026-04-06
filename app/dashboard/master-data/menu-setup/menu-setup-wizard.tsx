'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import type { ComboboxOption } from '@/components/ui/combobox'
import { toast } from '@/components/ui/toast'
import { createMenuSetup } from './actions'
import type { Ingredient } from '@/lib/db/schema'

interface IngredientRow {
  id: string
  mode: 'existing' | 'new'
  existingId: string
  newName: string
  newUnit: string
  newUnitCost: string
  requiredQuantity: string
}

interface SkuRow {
  id: string
  skuName: string
  unitPrice: string
  description: string
}

function genId() {
  return Math.random().toString(36).substring(2, 9)
}

const STEPS = ['메뉴 정보', '재료 구성', 'SKU 설정'] as const

export default function MenuSetupWizard({
  existingIngredients,
}: {
  existingIngredients: Ingredient[]
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Menu info
  const [menuName, setMenuName] = useState('')
  const [menuDescription, setMenuDescription] = useState('')

  // Step 2: Ingredients
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([
    {
      id: genId(),
      mode: 'existing',
      existingId: '',
      newName: '',
      newUnit: '',
      newUnitCost: '',
      requiredQuantity: '',
    },
  ])

  // Step 3: SKUs
  const [skuRows, setSkuRows] = useState<SkuRow[]>([
    { id: genId(), skuName: '', unitPrice: '', description: '' },
  ])

  const activeIngredients = useMemo(
    () => existingIngredients.filter((i) => i.isActive),
    [existingIngredients]
  )

  const ingredientOptions: ComboboxOption[] = useMemo(
    () =>
      activeIngredients.map((ing) => ({
        value: ing.id,
        label: ing.ingredientName,
        sublabel: ing.unit,
      })),
    [activeIngredients]
  )

  // Step 1 validation
  const isStep1Valid = menuName.trim().length > 0

  // Step 2 validation
  const isStep2Valid = ingredientRows.every(
    (row) =>
      (row.mode === 'existing'
        ? row.existingId
        : row.newName.trim() && row.newUnit.trim()) &&
      Number(row.requiredQuantity) > 0
  )

  // Step 3 validation
  const isStep3Valid = skuRows.every(
    (row) => row.skuName.trim() && Number(row.unitPrice) >= 0
  )

  const addIngredientRow = useCallback(() => {
    setIngredientRows((prev) => [
      ...prev,
      {
        id: genId(),
        mode: 'existing',
        existingId: '',
        newName: '',
        newUnit: '',
        newUnitCost: '',
        requiredQuantity: '',
      },
    ])
  }, [])

  const removeIngredientRow = useCallback((id: string) => {
    setIngredientRows((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  const updateIngredientRow = useCallback(
    (id: string, field: keyof IngredientRow, value: string) => {
      setIngredientRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      )
    },
    []
  )

  const addSkuRow = useCallback(() => {
    setSkuRows((prev) => [
      ...prev,
      { id: genId(), skuName: '', unitPrice: '', description: '' },
    ])
  }, [])

  const removeSkuRow = useCallback((id: string) => {
    setSkuRows((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  const updateSkuRow = useCallback(
    (id: string, field: keyof SkuRow, value: string) => {
      setSkuRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      )
    },
    []
  )

  // Auto-fill first SKU name from menu name
  const handleNext = useCallback(() => {
    if (step === 0 && skuRows[0]?.skuName === '') {
      setSkuRows((prev) =>
        prev.map((r, i) => (i === 0 ? { ...r, skuName: menuName } : r))
      )
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }, [step, menuName, skuRows])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const result = await createMenuSetup({
        menu: {
          menuName: menuName.trim(),
          description: menuDescription.trim() || undefined,
        },
        ingredients: ingredientRows.map((row) => ({
          existingId: row.mode === 'existing' ? row.existingId : undefined,
          newIngredient:
            row.mode === 'new'
              ? {
                  ingredientName: row.newName.trim(),
                  unit: row.newUnit.trim(),
                  unitCost: row.newUnitCost || undefined,
                }
              : undefined,
          requiredQuantity: row.requiredQuantity,
        })),
        skus: skuRows.map((row) => ({
          skuName: row.skuName.trim(),
          unitPrice: row.unitPrice,
          description: row.description.trim() || undefined,
        })),
      })

      if (result.success) {
        toast.success(
          `"${result.data?.menuName}" 메뉴가 성공적으로 등록되었습니다`
        )
        router.push('/dashboard/master-data')
      } else {
        toast.error(result.error || '등록에 실패했습니다')
      }
    } catch {
      toast.error('메뉴 셋업 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Step Indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-0.5 w-6 ${i <= step ? 'bg-brutal-black' : 'bg-brutal-black/20'}`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 border-2 px-3 py-1.5 text-sm font-bold ${
                i === step
                  ? 'border-brutal-black bg-brutal-yellow text-brutal-black shadow-brutal-sm'
                  : i < step
                    ? 'border-brutal-black bg-brutal-green text-brutal-black'
                    : 'border-brutal-black/30 bg-brutal-white text-brutal-black/40'
              }`}
            >
              <span className="font-black">{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Menu Info */}
      {step === 0 && (
        <div className="border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal">
          <h2 className="mb-4 text-lg font-black text-brutal-black">
            메뉴 정보
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="menuName">메뉴명 *</Label>
              <Input
                id="menuName"
                type="text"
                required
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder="예: 닭강정, 떡볶이"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="menuDesc">설명 (선택)</Label>
              <Input
                id="menuDesc"
                type="text"
                value={menuDescription}
                onChange={(e) => setMenuDescription(e.target.value)}
                placeholder="메뉴에 대한 간단한 설명"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Ingredients */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-brutal-black">재료 구성</h2>
          {ingredientRows.map((row, index) => (
            <div
              key={row.id}
              className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center border-2 border-brutal-black bg-brutal-blue text-xs font-black">
                  {index + 1}
                </span>
                {ingredientRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(row.id)}
                    className="border-2 border-brutal-black p-1 text-brutal-black hover:bg-brutal-pink"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Toggle: existing vs new */}
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateIngredientRow(row.id, 'mode', 'existing')
                  }
                  className={`border-2 border-brutal-black px-3 py-1 text-xs font-bold ${
                    row.mode === 'existing'
                      ? 'bg-brutal-yellow'
                      : 'bg-brutal-white'
                  }`}
                >
                  기존 재료
                </button>
                <button
                  type="button"
                  onClick={() => updateIngredientRow(row.id, 'mode', 'new')}
                  className={`border-2 border-brutal-black px-3 py-1 text-xs font-bold ${
                    row.mode === 'new'
                      ? 'bg-brutal-pink'
                      : 'bg-brutal-white'
                  }`}
                >
                  신규 재료
                </button>
              </div>

              {row.mode === 'existing' ? (
                <div className="mb-3">
                  <Label>재료 선택 *</Label>
                  <Combobox
                    options={ingredientOptions}
                    value={row.existingId}
                    onChange={(val) =>
                      updateIngredientRow(row.id, 'existingId', val)
                    }
                    placeholder="재료를 선택하세요"
                  />
                </div>
              ) : (
                <div className="mb-3 space-y-3 border-2 border-dashed border-brutal-pink bg-brutal-pink/10 p-3">
                  <div>
                    <Label>재료명 *</Label>
                    <Input
                      type="text"
                      value={row.newName}
                      onChange={(e) =>
                        updateIngredientRow(row.id, 'newName', e.target.value)
                      }
                      placeholder="예: 닭고기"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>단위 *</Label>
                      <select
                        value={row.newUnit}
                        onChange={(e) =>
                          updateIngredientRow(
                            row.id,
                            'newUnit',
                            e.target.value
                          )
                        }
                        className="w-full border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-medium"
                      >
                        <option value="">단위 선택</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        <option value="개">개</option>
                        <option value="봉">봉</option>
                        <option value="팩">팩</option>
                        <option value="박스">박스</option>
                        <option value="병">병</option>
                        <option value="캔">캔</option>
                      </select>
                    </div>
                    <div>
                      <Label>단가 (선택)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={row.newUnitCost}
                        onChange={(e) =>
                          updateIngredientRow(
                            row.id,
                            'newUnitCost',
                            e.target.value
                          )
                        }
                        placeholder="원"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label>필요 수량 *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.requiredQuantity}
                  onChange={(e) =>
                    updateIngredientRow(
                      row.id,
                      'requiredQuantity',
                      e.target.value
                    )
                  }
                  placeholder="예: 1.5"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addIngredientRow}
            className="w-full border-3 border-dashed border-brutal-black py-3 font-bold text-brutal-black transition-all hover:border-solid hover:bg-brutal-blue"
          >
            + 재료 추가
          </button>
        </div>
      )}

      {/* Step 3: SKU Setting */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-brutal-black">SKU 설정</h2>
          <p className="text-sm text-brutal-black/60">
            같은 메뉴의 판매 단위를 등록합니다 (예: 소/중/대)
          </p>
          {skuRows.map((row, index) => (
            <div
              key={row.id}
              className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center border-2 border-brutal-black bg-brutal-green text-xs font-black">
                  {index + 1}
                </span>
                {skuRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSkuRow(row.id)}
                    className="border-2 border-brutal-black p-1 text-brutal-black hover:bg-brutal-pink"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label>SKU명 *</Label>
                  <Input
                    type="text"
                    value={row.skuName}
                    onChange={(e) =>
                      updateSkuRow(row.id, 'skuName', e.target.value)
                    }
                    placeholder="예: 닭강정 (중)"
                  />
                </div>
                <div>
                  <Label>판매단가 (원) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={row.unitPrice}
                    onChange={(e) =>
                      updateSkuRow(row.id, 'unitPrice', e.target.value)
                    }
                    placeholder="예: 15000"
                  />
                </div>
                <div>
                  <Label>설명 (선택)</Label>
                  <Input
                    type="text"
                    value={row.description}
                    onChange={(e) =>
                      updateSkuRow(row.id, 'description', e.target.value)
                    }
                    placeholder="예: 2인분 기준"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSkuRow}
            className="w-full border-3 border-dashed border-brutal-black py-3 font-bold text-brutal-black transition-all hover:border-solid hover:bg-brutal-green"
          >
            + SKU 추가
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((s) => s - 1)}
            disabled={isSubmitting}
            className="flex-1 py-3"
          >
            이전
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className={step === 0 ? 'flex-1 py-3' : 'py-3'}
        >
          취소
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={
              (step === 0 && !isStep1Valid) || (step === 1 && !isStep2Valid)
            }
            className="flex-1 py-3"
          >
            다음
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isStep3Valid}
            className="flex-1 py-3"
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        )}
      </div>
    </div>
  )
}
