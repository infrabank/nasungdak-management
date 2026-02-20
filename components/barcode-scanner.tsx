'use client'

import { useCallback, useEffect, useState } from 'react'
import { useZxing } from 'react-zxing'
import { Button } from '@/components/ui/button'

type CameraState = 'requesting' | 'granted' | 'denied' | 'not-found'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const [cameraState, setCameraState] = useState<CameraState>('requesting')
  const [scanned, setScanned] = useState(false)

  // 마운트 시 명시적으로 카메라 권한 요청 → 브라우저 네이티브 권한 팝업 트리거
  useEffect(() => {
    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((mediaStream) => {
        stream = mediaStream
        // 수동 스트림 중지 — useZxing이 자체 스트림을 생성함
        stream.getTracks().forEach((track) => track.stop())
        setCameraState('granted')
      })
      .catch((err: DOMException) => {
        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError'
        ) {
          setCameraState('denied')
        } else if (err.name === 'NotFoundError') {
          setCameraState('not-found')
        } else {
          setCameraState('denied')
        }
      })

    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  // 권한 획득 후에만 스캐너 시작
  const { ref } = useZxing({
    paused: cameraState !== 'granted' || scanned,
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
  })

  // Escape 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRetry = useCallback(() => {
    setCameraState('requesting')
    setScanned(false)

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop())
        setCameraState('granted')
      })
      .catch(() => {
        setCameraState('denied')
      })
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
          {/* 카메라 권한 요청 중 */}
          {cameraState === 'requesting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
              <div className="h-8 w-8 animate-spin border-4 border-brutal-yellow border-t-transparent" />
              <p className="text-center font-bold text-brutal-white">
                카메라 권한을 요청하고 있습니다...
              </p>
              <p className="text-center text-sm text-brutal-white/70">
                브라우저 팝업에서 &quot;허용&quot;을 눌러주세요
              </p>
            </div>
          )}

          {/* 카메라 활성화됨 */}
          {cameraState === 'granted' && (
            <>
              <video
                ref={ref}
                className="h-full w-full object-cover"
                playsInline
                muted
              />

              {/* Scan Guide Overlay */}
              {!scanned && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-48 w-64">
                    <div className="absolute inset-0 border-2 border-brutal-yellow/40" />
                    <div className="absolute -left-0.5 -top-0.5 h-6 w-6 border-l-4 border-t-4 border-brutal-yellow" />
                    <div className="absolute -right-0.5 -top-0.5 h-6 w-6 border-r-4 border-t-4 border-brutal-yellow" />
                    <div className="absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-4 border-l-4 border-brutal-yellow" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 border-b-4 border-r-4 border-brutal-yellow" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* 카메라 권한 거부됨 */}
          {cameraState === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <svg
                className="h-12 w-12 text-brutal-yellow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <p className="text-center font-bold text-brutal-white">
                카메라 접근이 차단되었습니다
              </p>
              <div className="space-y-1 text-center text-sm text-brutal-white/80">
                <p>브라우저 주소창 왼쪽의 🔒 아이콘을 누르고</p>
                <p>
                  <span className="font-bold text-brutal-yellow">카메라</span>를
                  &quot;허용&quot;으로 변경해주세요
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={handleRetry}>
                  다시 시도
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                  닫기
                </Button>
              </div>
            </div>
          )}

          {/* 카메라 없음 */}
          {cameraState === 'not-found' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <p className="text-center font-bold text-brutal-white">
                카메라를 찾을 수 없습니다
              </p>
              <p className="text-center text-sm text-brutal-white/80">
                이 기기에 카메라가 연결되어 있는지 확인해주세요
              </p>
              <Button type="button" variant="secondary" onClick={onClose}>
                닫기
              </Button>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        {cameraState === 'granted' && (
          <div className="border-t-2 border-brutal-black bg-brutal-blue/20 p-3 text-center">
            <p className="text-sm font-bold text-brutal-black">
              바코드를 사각형 안에 맞춰주세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
