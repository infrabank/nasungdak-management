'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

/**
 * 바코드 카메라 스캐너 (html5-qrcode)
 *
 * html5-qrcode = 수백만 기기에서 검증된 바코드 스캔 라이브러리
 * - 네이티브 BarcodeDetector 자동 감지 + ExperimentalFeatures(ZXing) 폴백
 * - 삼성 인터넷, Chrome, Safari, Firefox 등 모든 모바일 브라우저 지원
 * - 카메라 관리, 프레임 캡처, 디코딩을 라이브러리가 일괄 처리
 */

/** 매장 관리에 필요한 바코드 포맷 */
const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13, // 한국 상품 바코드 (가장 흔함)
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
]

/** 스캐너 컨테이너 ID */
const SCANNER_ELEMENT_ID = 'barcode-scanner-region'

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannedRef = useRef(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState('')
  const [isInsecure, setIsInsecure] = useState(false)

  // 스캔 성공 핸들러
  const handleDetected = useCallback((value: string) => {
    if (scannedRef.current) return
    scannedRef.current = true
    setScanned(true)

    // 스캐너 정지
    if (scannerRef.current) {
      void scannerRef.current.stop().catch(() => {
        /* 이미 정지됨 */
      })
    }
    onScanRef.current(value)
  }, [])

  // ─── 메인 효과: html5-qrcode 스캐너 시작 ───
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setIsInsecure(true)
      return
    }

    let mounted = true

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          formatsToSupport: BARCODE_FORMATS,
          verbose: false,
        })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 4 / 3,
            disableFlip: false,
          },
          (decodedText) => {
            if (mounted) handleDetected(decodedText)
          },
          () => {
            // 매 프레임 디코딩 실패 — 정상 (바코드 미감지)
          }
        )
      } catch (err) {
        if (!mounted) return
        const msg = err instanceof Error ? err.message : String(err)
        if (
          msg.includes('NotAllowed') ||
          msg.includes('Permission') ||
          msg.includes('denied')
        ) {
          setError('카메라 권한이 거부되었습니다')
        } else if (msg.includes('NotFound') || msg.includes('Requested')) {
          setError('카메라를 찾을 수 없습니다')
        } else if (msg.includes('NotReadable') || msg.includes('Abort')) {
          setError('카메라가 다른 앱에서 사용 중이거나 접근할 수 없습니다')
        } else if (msg.includes('Security') || msg.includes('blocked')) {
          setError('브라우저 보안 정책으로 카메라 사용이 차단되었습니다')
        } else {
          setError('카메라 시작 중 오류가 발생했습니다')
        }
      }
    }

    // DOM이 준비된 후 시작 (html5-qrcode는 실제 DOM 요소가 필요)
    const timerId = setTimeout(() => void start(), 50)

    return () => {
      mounted = false
      clearTimeout(timerId)
      if (scannerRef.current) {
        void scannerRef.current.stop().catch(() => {
          /* cleanup */
        })
        scannerRef.current = null
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

        {/* Camera View — html5-qrcode가 이 div 내부에 video + canvas를 생성 */}
        <div className="relative w-full bg-brutal-black">
          <div
            id={SCANNER_ELEMENT_ID}
            className="w-full [&>video]:!object-cover"
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
