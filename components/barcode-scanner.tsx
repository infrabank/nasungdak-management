'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ZBarSymbol } from '@undecaf/zbar-wasm'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

/**
 * 바코드 카메라 스캐너 — 삼성 인터넷 최적화
 *
 * 핵심 수정사항 (삼성 S20+ / 삼성 인터넷 호환):
 * 1. ZBar WASM 폴리필 사용 — 네이티브 BarcodeDetector 크래시 우회
 * 2. createImageBitmap 기반 프레임 캡처 — canvas.drawImage 회전 버그 우회
 * 3. getUserMedia 직접 호출 + 해상도 제한 (720p) — 삼성 4K 기본값 문제 완화
 * 4. purchase-form.tsx의 pre-permission 더블오픈 패턴 제거됨
 *
 * @see https://github.com/mebjas/html5-qrcode/issues/881
 * @see https://github.com/mebjas/html5-qrcode/issues/934
 */

/**
 * 스캔 간격 (ms) — 너무 빠르면 WASM이 부하, 너무 느리면 인식 지연
 * ZBar WASM은 기본적으로 EAN-13, EAN-8, Code-128, Code-39, QR, UPC-A/E, ITF 등
 * 모든 지원 포맷을 자동 감지하므로 별도 포맷 목록이 불필요
 */
const SCAN_INTERVAL_MS = 120

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
  const [debugInfo, setDebugInfo] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  // 토치(플래시) 토글 — 저조도 환경 바코드 스캔 개선
  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (!track) return

    const newState = !torchOn
    try {
      await track.applyConstraints({
        advanced: [{ torch: newState } as MediaTrackConstraintSet],
      })
      setTorchOn(newState)
    } catch {
      // 토치 지원 안 되는 기기 — 무시
    }
  }, [torchOn])

  // 스캔 성공 핸들러
  const handleDetected = useCallback((value: string) => {
    if (scannedRef.current) return
    scannedRef.current = true
    setScanned(true)
    onScanRef.current(value)
  }, [])

  // ─── 메인 효과: ZBar WASM 폴리필 + 직접 카메라 관리 ───
  // 삼성 인터넷의 3가지 버그를 모두 우회:
  // 1. 네이티브 BarcodeDetector 사용 안 함 (constructor 크래시 우회)
  // 2. canvas.drawImage 사용 안 함 (회전 버그 우회 — ZBar가 내부적으로 createImageBitmap 사용)
  // 3. getUserMedia 해상도 제약 직접 관리
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setIsInsecure(true)
      return
    }

    let mounted = true
    let rafId = 0

    const start = async () => {
      try {
        // ① ZBar WASM 모듈 동적 로딩 (코드 스플리팅)
        const { scanImageData } = await import('@undecaf/zbar-wasm')

        if (!mounted) return

        // ② 카메라 스트림 획득 — 해상도 제한으로 삼성 고해상도 문제 완화
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: false,
        })

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        // ③ video 요소에 스트림 연결
        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play()

        // 디버그: 실제 획득된 해상도 표시 + 토치 지원 여부 감지
        const track = stream.getVideoTracks()[0]
        const settings = track.getSettings()
        setDebugInfo(`${settings.width}x${settings.height}`)

        // 토치 지원 감지 (Samsung Internet / Chrome Android)
        try {
          const capabilities = track.getCapabilities?.()
          if (
            capabilities &&
            'torch' in capabilities &&
            (capabilities as Record<string, unknown>).torch
          ) {
            setTorchSupported(true)
          }
        } catch {
          // getCapabilities 미지원 — 무시
        }

        // ④ 프레임 캡처용 OffscreenCanvas (또는 일반 canvas)
        // createImageBitmap → canvas → getImageData 파이프라인으로
        // Samsung의 canvas.drawImage(video) 회전 버그를 우회
        const captureCanvas = document.createElement('canvas')
        const ctx = captureCanvas.getContext('2d', {
          willReadFrequently: true,
        })
        if (!ctx) return

        // ⑤ requestAnimationFrame 스캔 루프
        let lastScanTime = 0

        const scanLoop = async (timestamp: number) => {
          if (!mounted || scannedRef.current) return

          if (timestamp - lastScanTime >= SCAN_INTERVAL_MS) {
            lastScanTime = timestamp
            try {
              // createImageBitmap는 compositor 레벨에서 올바른 방향으로
              // 프레임을 캡처 — Samsung의 canvas.drawImage(video) 회전 버그 우회
              const bitmap = await createImageBitmap(video)
              captureCanvas.width = bitmap.width
              captureCanvas.height = bitmap.height
              ctx.drawImage(bitmap, 0, 0)
              bitmap.close()

              const imageData = ctx.getImageData(
                0,
                0,
                captureCanvas.width,
                captureCanvas.height
              )

              // ZBar WASM C/C++ 디코더로 스캔
              const symbols: ZBarSymbol[] = await scanImageData(imageData)
              if (symbols.length > 0 && mounted) {
                const decoded = symbols[0].decode()
                if (decoded) {
                  handleDetected(decoded)
                  return // 인식 성공 → 루프 종료
                }
              }
            } catch {
              // 프레임 준비 안 됨 또는 비디오 미재생 — 무시하고 재시도
            }
          }

          rafId = requestAnimationFrame(scanLoop)
        }

        rafId = requestAnimationFrame(scanLoop)
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
          setError(`카메라 시작 중 오류: ${msg}`)
        }
      }
    }

    // DOM이 준비된 후 시작 (video 요소가 필요)
    const timerId = setTimeout(() => void start(), 100)

    return () => {
      mounted = false
      clearTimeout(timerId)
      cancelAnimationFrame(rafId)
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

        {/* Camera View — 직접 관리하는 video 요소 + ZBar WASM 디코더 */}
        <div className="relative w-full bg-brutal-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* 스캔 가이드 오버레이 */}
          {!scanned && !error && !isInsecure && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-72 border-2 border-brutal-yellow/80" />
            </div>
          )}

          {/* 디버그 정보 (카메라 해상도) */}
          {debugInfo && !scanned && !error && (
            <div className="absolute left-2 top-2 rounded bg-brutal-black/70 px-2 py-1">
              <p className="font-mono text-[10px] text-brutal-white/60">
                {debugInfo}
              </p>
            </div>
          )}

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
                    <p className="mb-1 font-bold text-brutal-yellow">Android</p>
                    <p>
                      주소창 왼쪽 아이콘 → 권한 → 카메라 →{' '}
                      <span className="font-bold">&quot;허용&quot;</span>
                    </p>
                    <p className="mt-1 text-brutal-white/60">
                      또는: 브라우저 설정 → 사이트 설정 → 카메라
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

        {/* Footer: 토치 버튼 + 안내 */}
        {!scanned && !error && !isInsecure && (
          <div className="flex items-center justify-between border-t-2 border-brutal-black bg-brutal-blue/20 p-3">
            <p className="text-sm font-bold text-brutal-black">
              바코드를 사각형 안에 맞춰주세요
            </p>
            {torchSupported && (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                className={`flex items-center gap-1.5 border-2 border-brutal-black px-3 py-1.5 text-xs font-bold transition-all ${
                  torchOn
                    ? 'bg-brutal-yellow text-brutal-black shadow-brutal'
                    : 'bg-brutal-white text-brutal-black hover:bg-brutal-yellow/50'
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill={torchOn ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                {torchOn ? '조명 끄기' : '조명 켜기'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
