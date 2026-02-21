'use client'

import { useEffect, useMemo, useState } from 'react'
import { useZxing } from 'react-zxing'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

/**
 * 바코드 카메라 스캐너
 *
 * react-zxing 모바일 호환 패턴 (Issues #32, #45):
 * - 이 컴포넌트가 마운트될 때 즉시 카메라 시작
 * - video 요소는 항상 DOM에 존재 (조건부 렌더링 금지)
 * - paused prop을 시작/중지 토글로 사용 금지
 * - 부모가 mount/unmount로 카메라를 제어
 */
export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState('')
  const [isInsecure, setIsInsecure] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setIsInsecure(true)
    }
  }, [])

  // 바코드 디코딩 힌트 — 포맷 지정 + TRY_HARDER로 인식률 향상
  const hints = useMemo(() => {
    const map = new Map<DecodeHintType, unknown>()
    map.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, // 한국 상품 바코드 (가장 흔함)
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
    ])
    map.set(DecodeHintType.TRY_HARDER, true)
    return map
  }, [])

  // useZxing — 마운트 즉시 카메라 시작 (paused 토글 없음)
  // 부모의 버튼 클릭 → 이 컴포넌트 마운트 → useEffect에서 getUserMedia 호출
  // 사용자 제스처 컨텍스트가 유지되는 시간 내에 실행됨
  const { ref } = useZxing({
    paused: scanned || isInsecure, // 스캔 성공 또는 비보안 컨텍스트에서만 일시정지
    hints,
    timeBetweenDecodingAttempts: 150, // 기본 300ms → 150ms로 빠른 스캔
    constraints: {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
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
      // DOMException만 처리 — zxing 디코딩 에러(NotFoundException 등) 무시
      if (err instanceof DOMException) {
        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError'
        ) {
          setError('카메라 권한이 거부되었습니다')
        } else if (err.name === 'NotFoundError') {
          setError('카메라를 찾을 수 없습니다')
        } else if (
          err.name === 'NotReadableError' ||
          err.name === 'AbortError'
        ) {
          setError('카메라가 다른 앱에서 사용 중이거나 접근할 수 없습니다')
        } else if (err.name === 'OverconstrainedError') {
          setError('카메라 설정이 지원되지 않습니다')
        } else if (
          err.name === 'SecurityError' ||
          err.name === 'NotSupportedError'
        ) {
          setError('브라우저 보안 정책으로 카메라 사용이 차단되었습니다')
        }
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

        {/* Camera View — video 항상 DOM에 존재 (ref 유지 필수) */}
        <div className="relative aspect-[4/3] w-full bg-brutal-black">
          <video
            ref={ref}
            className="h-full w-full object-cover"
            playsInline
            autoPlay
            muted
          />

          {/* HTTPS 필요 오버레이 */}
          {isInsecure && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brutal-black p-6">
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

          {/* 에러 오버레이 */}
          {error && !isInsecure && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-brutal-black/95 p-6">
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
              <p className="text-center font-bold text-brutal-white">{error}</p>

              <div className="w-full space-y-3">
                <p className="text-center text-xs text-brutal-white/70">
                  카메라 권한을 확인해주세요:
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
                      주소창 왼쪽 ⓘ 아이콘 → 권한 → 카메라 →{' '}
                      <span className="font-bold">&quot;허용&quot;</span>
                    </p>
                    <p className="mt-1 text-brutal-white/60">
                      또는: Chrome ⋮ → 설정 → 사이트 설정 → 카메라
                    </p>
                  </div>
                )}

                {!isIOS && !isAndroid && (
                  <div className="border-2 border-brutal-yellow/50 bg-brutal-black/50 p-3 text-xs text-brutal-white/90">
                    <p className="mb-1 font-bold text-brutal-yellow">
                      PC Chrome
                    </p>
                    <p>
                      주소창 왼쪽 아이콘 → 사이트 설정 → 카메라 →{' '}
                      <span className="font-bold">&quot;허용&quot;</span>
                    </p>
                  </div>
                )}

                <div className="flex justify-center gap-2 pt-1">
                  <Button type="button" onClick={onClose}>
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 스캔 가이드 오버레이 */}
          {!scanned && !error && !isInsecure && (
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
        </div>

        {/* Footer Hint */}
        {!scanned && !error && !isInsecure && (
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
