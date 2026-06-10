'use client'

import { useEffect } from 'react'

const RELOAD_FLAG = 'stale-chunk-reload-at'

function isStaleChunkError(error: Error): boolean {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    `${error.name} ${error.message}`
  )
}

// 배포 직후 이전 빌드의 JS 청크를 요청하면 404가 나며 크래시함.
// 새로고침으로 해결되므로 1회 자동 새로고침 후, 반복되면 수동 버튼 표시.
function autoReloadOnStaleChunk(error: Error): boolean {
  if (!isStaleChunkError(error)) return false
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0)
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
      window.location.reload()
      return true
    }
  } catch {
    // sessionStorage 접근 불가 시 자동 새로고침 생략
  }
  return false
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    autoReloadOnStaleChunk(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-brutal-white p-4">
      <div className="w-full max-w-md border-3 border-brutal-black bg-brutal-white p-6 text-center shadow-brutal">
        <h2 className="text-xl font-black text-brutal-black">
          일시적인 오류가 발생했습니다
        </h2>
        <p className="mt-2 text-sm font-medium text-brutal-black/70">
          새로고침하면 대부분 해결됩니다
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 border-2 border-brutal-black bg-brutal-yellow py-3 text-sm font-bold text-brutal-black shadow-brutal"
          >
            새로고침
          </button>
          <button
            onClick={() => reset()}
            className="flex-1 border-2 border-brutal-black bg-brutal-white py-3 text-sm font-bold text-brutal-black shadow-brutal-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  )
}
