'use client'

import { useState } from 'react'
import { runInventoryAlertCheck } from './actions'

interface AlertCheckButtonProps {
  storeId?: string
}

export default function AlertCheckButton({ storeId }: AlertCheckButtonProps) {
  const [isChecking, setIsChecking] = useState(false)

  const handleCheck = async () => {
    if (isChecking) return
    setIsChecking(true)
    try {
      const result = await runInventoryAlertCheck(storeId)
      if (!result.success) {
        alert(result.error || '재고 점검에 실패했습니다')
        return
      }

      if (result.total === 0) {
        alert('재고 부족 항목이 없습니다.')
      } else if (result.sent > 0) {
        alert(
          `재고 부족 ${result.total}건 확인. 알림 ${result.sent}건 발송${
            result.failed ? `, 실패 ${result.failed}건` : ''
          }.`
        )
      } else {
        alert(
          `재고 부족 ${result.total}건을 확인해 이력에 기록했습니다. (발송 채널 미구성 시 대기 ${result.pending}건)`
        )
      }
    } catch {
      alert('재고 점검 중 오류가 발생했습니다')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCheck}
      disabled={isChecking}
      className="border-2 border-brutal-black bg-brutal-pink px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
    >
      {isChecking ? '점검 중...' : '지금 점검'}
    </button>
  )
}
