'use client'

import { useCallback, useEffect, useState } from 'react'
import { useZxing } from 'react-zxing'
import { Button } from '@/components/ui/button'

type CameraState =
  | 'ready' // 초기: "카메라 시작" 버튼 표시
  | 'requesting' // getUserMedia 호출 중 (권한 팝업 대기)
  | 'granted' // 카메라 활성화됨
  | 'denied' // 권한 거부됨
  | 'not-found' // 카메라 없음
  | 'insecure' // HTTPS 아님

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const [cameraState, setCameraState] = useState<CameraState>('ready')
  const [scanned, setScanned] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // 초기 환경 체크
  useEffect(() => {
    if (!window.isSecureContext) {
      setCameraState('insecure')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('not-found')
    }
  }, [])

  // 사용자 제스처에서 호출 — 브라우저가 반드시 권한 팝업을 표시함
  const requestCamera = useCallback(() => {
    setCameraState('requesting')

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        // 수동 스트림 중지 — useZxing이 자체 스트림을 생성함
        stream.getTracks().forEach((track) => track.stop())
        setCameraState('granted')
      })
      .catch((err: DOMException) => {
        if (err.name === 'NotFoundError') {
          setCameraState('not-found')
        } else {
          // NotAllowedError, PermissionDeniedError, 기타
          setCameraState('denied')
          setRetryCount((c) => c + 1)
        }
      })
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

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid =
    typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)

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
          {/* 초기 상태: 카메라 시작 버튼 */}
          {cameraState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <svg
                className="h-16 w-16 text-brutal-yellow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <Button type="button" onClick={requestCamera} className="text-lg">
                📷 카메라 시작
              </Button>
              <p className="text-center text-sm text-brutal-white/70">
                버튼을 누르면 카메라 권한을 요청합니다
              </p>
            </div>
          )}

          {/* 권한 요청 중 (팝업 대기) */}
          {cameraState === 'requesting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
              <div className="h-8 w-8 animate-spin border-4 border-brutal-yellow border-t-transparent" />
              <p className="text-center font-bold text-brutal-white">
                카메라 권한을 요청하고 있습니다...
              </p>
              <p className="text-center text-sm text-brutal-yellow">
                &quot;허용&quot;을 눌러주세요
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

          {/* 권한 거부됨 */}
          {cameraState === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto p-6">
              <svg
                className="h-10 w-10 shrink-0 text-brutal-yellow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-center font-bold text-brutal-white">
                카메라 권한이 필요합니다
              </p>

              {retryCount <= 1 ? (
                <>
                  <p className="text-center text-sm text-brutal-white/80">
                    아래 버튼을 눌러 다시 요청하세요
                  </p>
                  <Button type="button" onClick={requestCamera}>
                    카메라 권한 요청
                  </Button>
                </>
              ) : (
                <div className="w-full space-y-3">
                  <p className="text-center text-xs text-brutal-white/70">
                    브라우저가 권한 요청을 차단했습니다.
                    <br />
                    아래 방법으로 직접 허용해주세요:
                  </p>

                  {isIOS && (
                    <div className="border-2 border-brutal-yellow/50 bg-brutal-black/50 p-3 text-xs text-brutal-white/90">
                      <p className="mb-1 font-bold text-brutal-yellow">
                        iPhone / iPad
                      </p>
                      <p>
                        설정 → Safari → 카메라 →{' '}
                        <span className="font-bold">&quot;허용&quot;</span>
                      </p>
                    </div>
                  )}

                  {isAndroid && (
                    <div className="border-2 border-brutal-yellow/50 bg-brutal-black/50 p-3 text-xs text-brutal-white/90">
                      <p className="mb-1 font-bold text-brutal-yellow">
                        Android Chrome
                      </p>
                      <p>
                        주소창 왼쪽 아이콘 → 권한 → 카메라 →{' '}
                        <span className="font-bold">&quot;허용&quot;</span>
                      </p>
                      <p className="mt-1 text-brutal-white/60">
                        또는: Chrome 설정 → 사이트 설정 → 카메라
                      </p>
                    </div>
                  )}

                  {!isIOS && !isAndroid && (
                    <div className="border-2 border-brutal-yellow/50 bg-brutal-black/50 p-3 text-xs text-brutal-white/90">
                      <p className="mb-1 font-bold text-brutal-yellow">PC</p>
                      <p>
                        주소창 왼쪽 아이콘 → 사이트 설정 → 카메라 →{' '}
                        <span className="font-bold">&quot;허용&quot;</span>
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center gap-2 pt-1">
                    <Button type="button" onClick={requestCamera}>
                      다시 시도
                    </Button>
                    <Button type="button" variant="secondary" onClick={onClose}>
                      닫기
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HTTPS 필요 */}
          {cameraState === 'insecure' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
              <p className="text-center font-bold text-brutal-white">
                카메라는 HTTPS에서만 사용 가능합니다
              </p>
              <p className="text-center text-sm text-brutal-white/70">
                https:// 주소로 접속하거나 localhost에서 테스트해주세요
              </p>
              <Button type="button" variant="secondary" onClick={onClose}>
                닫기
              </Button>
            </div>
          )}

          {/* 카메라 없음 */}
          {cameraState === 'not-found' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
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
