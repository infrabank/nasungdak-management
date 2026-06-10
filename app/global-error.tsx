'use client'

import { useEffect } from 'react'

const RELOAD_FLAG = 'stale-chunk-reload-at'

// 배포 직후 구버전 청크 404로 인한 크래시는 새로고침으로 해결됨 (1회만 자동 시도)
function autoReloadOnStaleChunk(error: Error) {
  const isStale =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      `${error.name} ${error.message}`
    )
  if (!isStale) return
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0)
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
      window.location.reload()
    }
  } catch {
    // sessionStorage 접근 불가 시 자동 새로고침 생략
  }
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    autoReloadOnStaleChunk(error)
  }, [error])

  return (
    <html lang="ko">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          background: '#fff',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>
            일시적인 오류가 발생했습니다
          </h2>
          <p style={{ marginTop: 8, fontSize: 14, color: '#555' }}>
            새로고침하면 대부분 해결됩니다
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '12px 32px',
              border: '2px solid #111',
              background: '#ffd400',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            새로고침
          </button>
        </div>
      </body>
    </html>
  )
}
