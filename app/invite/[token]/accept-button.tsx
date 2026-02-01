'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvitation } from './actions'
import { toast } from 'sonner'

interface Props {
  token: string
}

export default function AcceptInviteButton({ token }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAccept = async () => {
    setIsLoading(true)
    try {
      const result = await acceptInvitation(token)
      if (result.success) {
        toast.success('조직에 참여했습니다!')
        router.push('/dashboard')
      } else {
        toast.error(result.error || '오류가 발생했습니다')
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleAccept}
      disabled={isLoading}
      className="flex w-full justify-center px-4 py-3 text-base font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? '참여 중...' : '초대 수락'}
    </button>
  )
}
