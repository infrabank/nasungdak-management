import { describe, it, expect } from 'vitest'
import { mergeAlerts } from '@/lib/inventory/alert-service'
import type { InventoryAlertItem } from '@/lib/notifications/inventory-alert'

function alert(
  storeId: string,
  ingredientId: string,
  extra: Partial<InventoryAlertItem> = {}
): InventoryAlertItem {
  return {
    storeId,
    storeName: 's',
    managerPhone: '',
    ingredientId,
    ingredientName: 'i',
    daysRemaining: 0,
    thresholdDays: 1,
    ...extra,
  }
}

describe('mergeAlerts (봉 알림 + 규칙 알림 중복 제거)', () => {
  it('같은 (매장,재료) 조합은 한 번만, 앞 그룹(봉) 우선', () => {
    const bag = [alert('s1', 'ing1', { bagMode: true, bagCount: 0 })]
    const rule = [
      alert('s1', 'ing1', { daysRemaining: 2 }), // 중복 → 제거됨
      alert('s1', 'ing2', { daysRemaining: 1 }),
    ]
    const merged = mergeAlerts(bag, rule)
    expect(merged).toHaveLength(2)
    // ing1은 봉 알림(bagMode)이 유지되어야 한다
    const ing1 = merged.find((a) => a.ingredientId === 'ing1')
    expect(ing1?.bagMode).toBe(true)
  })

  it('다른 매장 같은 재료는 각각 유지', () => {
    const merged = mergeAlerts(
      [alert('s1', 'ing1')],
      [alert('s2', 'ing1')]
    )
    expect(merged).toHaveLength(2)
  })

  it('빈 입력은 빈 배열', () => {
    expect(mergeAlerts([], [])).toEqual([])
  })
})
