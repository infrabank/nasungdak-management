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
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      {/* Error Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center border-3 border-brutal-black bg-brutal-pink shadow-brutal">
        <svg
          className="h-10 w-10 text-brutal-black"
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
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-black text-brutal-black">
          문제가 발생했습니다
        </h2>
        <p className="max-w-md text-sm font-medium text-brutal-black/70">
          페이지를 불러오는 중 오류가 발생했습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>
      </div>

      {/* Error Details (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 w-full max-w-lg">
          <div className="overflow-auto border-3 border-brutal-black bg-brutal-yellow/30 p-4">
            <p className="break-all font-mono text-xs font-bold text-brutal-black">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-brutal-black/60">
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
          onClick={() => (window.location.href = '/dashboard')}
        >
          홈으로
        </Button>
        <Button onClick={reset}>다시 시도</Button>
      </div>
    </div>
  )
}
