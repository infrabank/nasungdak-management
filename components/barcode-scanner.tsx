'use client'

import { useCallback, useEffect, useState } from 'react'
import { useZxing } from 'react-zxing'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)

  const { ref } = useZxing({
    paused: scanned,
    constraints: {
      video: {
        facingMode: 'environment',
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
      },
    },
    onDecodeResult(result) {
      const text = result.getText()
      if (text && !scanned) {
        setScanned(true)
        onScan(text)
      }
    },
    onError(err) {
      const message =
        err instanceof Error ? err.message : '카메라를 사용할 수 없습니다'

      if (
        message.includes('NotAllowedError') ||
        message.includes('Permission')
      ) {
        setError('카메라 권한이 필요합니다. 브라우저 설정에서 허용해주세요.')
      } else if (
        message.includes('NotFoundError') ||
        message.includes('DevicesNotFound')
      ) {
        setError('카메라를 찾을 수 없습니다.')
      } else if (!error) {
        // Only set generic errors once (avoid decode attempt noise)
        setError(null)
      }
    },
  })

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRetry = useCallback(() => {
    setScanned(false)
    setError(null)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-black/80">
      <div className="relative mx-4 w-full max-w-md overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b-3 border-brutal-black bg-brutal-yellow p-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-brutal-black">
            📷 바코드 스캔
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-brutal-black bg-brutal-white p-1.5 font-black text-brutal-black hover:bg-brutal-pink"
          >
            <svg
              className="h-5 w-5"
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
        </div>

        {/* Camera View */}
        <div className="relative aspect-[4/3] w-full bg-brutal-black">
          <video
            ref={ref}
            className="h-full w-full object-cover"
            playsInline
            muted
          />

          {/* Scan Guide Overlay */}
          {!error && !scanned && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-64 border-4 border-brutal-yellow/70">
                <div className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-brutal-yellow" />
                <div className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-brutal-yellow" />
                <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-brutal-yellow" />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-brutal-yellow" />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-brutal-black/90 p-6">
              <p className="mb-4 text-center font-bold text-brutal-white">
                {error}
              </p>
              <Button type="button" onClick={handleRetry}>
                다시 시도
              </Button>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t-2 border-brutal-black bg-brutal-blue/20 p-3 text-center">
          <p className="text-sm font-bold text-brutal-black">
            바코드를 사각형 안에 맞춰주세요
          </p>
        </div>
      </div>
    </div>
  )
}
