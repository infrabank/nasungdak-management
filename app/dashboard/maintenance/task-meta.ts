// 정비·청소 항목별 표시 메타 (이모지/색상)
export const TASK_META: Record<string, { emoji: string; color: string }> = {
  '아이스크림 반죽 투입': {
    emoji: '🍦',
    color: 'bg-brutal-pink text-brutal-black',
  },
  '아이스크림 기계 청소': {
    emoji: '🧊',
    color: 'bg-brutal-blue text-brutal-black',
  },
  '튀김 초벌기 청소': {
    emoji: '🟡',
    color: 'bg-brutal-yellow text-brutal-black',
  },
  '튀김 재벌기 청소': {
    emoji: '🟢',
    color: 'bg-brutal-green text-brutal-black',
  },
}

export function taskMeta(taskType: string) {
  return TASK_META[taskType] ?? { emoji: '🧽', color: 'bg-brutal-white text-brutal-black' }
}
