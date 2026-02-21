'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  NotFoundException,
} from '@zxing/library'
import { HTMLCanvasElementLuminanceSource } from '@zxing/library/esm/browser/HTMLCanvasElementLuminanceSource'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

/**
 * 바코드 카메라 스캐너 (직접 카메라 관리 + 듀얼 디코더)
 *
 * react-zxing 제거 — 삼성 인터넷 등 일부 브라우저에서 decodeFromConstraints 디코딩 루프 미동작 이슈
 *
 * 구조:
 * 1. getUserMedia로 직접 카메라 스트림 획득 → <video>에 연결
 * 2. 네이티브 BarcodeDetector (RAF 루프) — 하드웨어 가속, 최우선
 * 3. ZXing MultiFormatReader (setInterval + canvas) — JS 폴백
 * 4. 둘 다 동시 실행, 먼저 인식되는 쪽이 결과 반환
 */

/** 네이티브 BarcodeDetector용 포맷 */
const NATIVE_FORMATS = [
  'ean_13',
  'ean_8',
  'code_128',
  'code_39',
  'qr_code',
  'upc_a',
  'upc_e',
  'itf',
]

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannedRef = useRef(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState('')
  const [isInsecure, setIsInsecure] = useState(false)

  // 스캔 성공 핸들러 (중복 호출 방지 + 카메라 정리)
  const handleDetected = useCallback((value: string) => {
    if (scannedRef.current) return
    scannedRef.current = true
    setScanned(true)
    // 카메라 즉시 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    onScanRef.current(value)
  }, [])

  // ─── 메인 효과: 카메라 시작 + 듀얼 디코더 루프 ───
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setIsInsecure(true)
      return
    }

    let cancelled = false
    let nativeRafId = 0
    let zxingTimerId: ReturnType<typeof setInterval> | null = null

    const start = async () => {
      try {
        // 1. 카메라 스트림 획득
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play()

        // video ready 대기
        if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            video.addEventListener('loadeddata', () => resolve(), {
              once: true,
            })
          })
        }
        if (cancelled) return

        // 2. 네이티브 BarcodeDetector (RAF 루프)
        if ('BarcodeDetector' in window && window.BarcodeDetector) {
          try {
            const supported = await BarcodeDetector.getSupportedFormats()
            const formats = NATIVE_FORMATS.filter((f) => supported.includes(f))
            if (formats.length > 0 && !cancelled) {
              const detector = new BarcodeDetector({ formats })

              const detectNative = async () => {
                if (cancelled || scannedRef.current) return
                try {
                  if (video.readyState >= 2) {
                    const barcodes = await detector.detect(video)
                    if (
                      barcodes.length > 0 &&
                      barcodes[0].rawValue &&
                      !scannedRef.current
                    ) {
                      handleDetected(barcodes[0].rawValue)
                      return
                    }
                  }
                } catch {
                  /* 프레임 디코딩 실패 */
                }
                if (!cancelled && !scannedRef.current) {
                  nativeRafId = requestAnimationFrame(() => void detectNative())
                }
              }
              nativeRafId = requestAnimationFrame(() => void detectNative())
            }
          } catch {
            /* BarcodeDetector 초기화 실패 — ZXing 폴백에 의존 */
          }
        }

        // 3. ZXing MultiFormatReader (canvas 캡처 + setInterval)
        if (!cancelled) {
          const hints = new Map<DecodeHintType, unknown>()
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.QR_CODE,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.ITF,
          ])
          hints.set(DecodeHintType.TRY_HARDER, true)

          const reader = new MultiFormatReader()
          reader.setHints(hints)

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: true })

          zxingTimerId = setInterval(() => {
            if (cancelled || scannedRef.current) return
            if (!ctx || video.readyState < 2 || video.videoWidth === 0) return

            try {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              ctx.drawImage(video, 0, 0)

              const luminanceSource = new HTMLCanvasElementLuminanceSource(
                canvas
              )
              const binaryBitmap = new BinaryBitmap(
                new HybridBinarizer(luminanceSource)
              )
              const result = reader.decode(binaryBitmap)

              if (result && result.getText()) {
                handleDetected(result.getText())
              }
            } catch (e) {
              // NotFoundException = 이 프레임에서 바코드 없음 (정상)
              if (!(e instanceof NotFoundException)) {
                // 예상치 못한 에러는 무시하되 루프 계속
              }
            }
          }, 200)
        }
      } catch (err) {
        if (cancelled) return
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
        } else {
          setError('카메라 시작 중 오류가 발생했습니다')
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      if (nativeRafId) cancelAnimationFrame(nativeRafId)
      if (zxingTimerId) clearInterval(zxingTimerId)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [handleDetected])

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
          <video
            ref={videoRef}
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
