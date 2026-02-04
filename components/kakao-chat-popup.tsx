'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react'

const STORAGE_KEY = 'kakao-chat-popup-dismissed'

export default function KakaoChatPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // 로컬스토리지에서 팝업 닫힘 상태 확인
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      // 1초 후 팝업 표시 (페이지 로드 후 자연스럽게)
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDontShowAgain = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText('mjmgmt')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // 클립보드 API 실패 시 폴백
      const textArea = document.createElement('textarea')
      textArea.value = 'mjmgmt'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* 팝업 본체 */}
      <div className="animate-in fade-in zoom-in-95 relative w-full max-w-md border-3 border-brutal-black bg-brutal-white shadow-brutal-lg duration-200">
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center border-2 border-brutal-black bg-brutal-white shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 헤더 */}
        <div className="border-b-3 border-brutal-black bg-brutal-yellow px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-brutal-black bg-[#FEE500]">
              <MessageCircle className="h-5 w-5 text-brutal-black" />
            </div>
            <h2 className="text-xl font-black text-brutal-black">
              소통방 오픈!
            </h2>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5">
          <h3 className="text-lg font-bold text-brutal-black">
            매장관리시스템 소통방
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-brutal-black/80">
            <li className="flex items-start gap-2">
              <span className="text-brutal-yellow">●</span>
              기능 건의 및 아이디어 제안
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brutal-pink">●</span>
              버그 신고 및 문의
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brutal-blue">●</span>
              매장 운영 관련 가벼운 잡담
            </li>
          </ul>

          {/* 참여코드 */}
          <div className="mt-5 border-2 border-brutal-black bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-brutal-black/60">
                  참여코드
                </p>
                <p className="mt-0.5 font-mono text-lg font-bold text-brutal-black">
                  mjmgmt
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 border-2 border-brutal-black bg-brutal-white px-3 py-1.5 text-sm font-bold shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    복사
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 카카오톡 링크 버튼 */}
          <a
            href="https://open.kakao.com/o/gT3K1Rei"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-brutal-black bg-[#FEE500] px-4 py-3 font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            <MessageCircle className="h-5 w-5" />
            카카오톡 오픈채팅 참여하기
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* 푸터 */}
        <div className="border-t-2 border-brutal-black/20 px-6 py-3">
          <button
            onClick={handleDontShowAgain}
            className="text-sm text-brutal-black/50 underline underline-offset-2 hover:text-brutal-black/70"
          >
            다시 보지 않기
          </button>
        </div>
      </div>
    </div>
  )
}
