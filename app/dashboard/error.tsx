'use client'

/**
 * Dashboard Error Boundary
 * 
 * Neo-Brutalism styled error page that catches and displays errors
 * gracefully within the dashboard layout.
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      {/* Error Icon */}
      <div className="w-20 h-20 bg-brutal-pink border-3 border-brutal-black shadow-brutal flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-brutal-black"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error Message */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-brutal-black mb-2">
          문제가 발생했습니다
        </h2>
        <p className="text-sm font-medium text-brutal-black/70 max-w-md">
          페이지를 불러오는 중 오류가 발생했습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>
      </div>

      {/* Error Details (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="w-full max-w-lg mb-6">
          <div className="bg-brutal-yellow/30 border-3 border-brutal-black p-4 overflow-auto">
            <p className="text-xs font-mono font-bold text-brutal-black break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs font-mono text-brutal-black/60">
                Digest: {error.digest}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => window.location.href = '/dashboard'}
        >
          홈으로
        </Button>
        <Button onClick={reset}>
          다시 시도
        </Button>
      </div>
    </div>
  )
}
