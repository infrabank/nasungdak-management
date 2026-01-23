'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { menuGroups } from './accordion-menu'
import LogoutButton from './logout-button'

interface AllMenuSheetProps {
  isOpen: boolean
  onClose: () => void
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

export default function AllMenuSheet({ isOpen, onClose }: AllMenuSheetProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Handle animation timing
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      document.body.style.overflow = ''
      return () => clearTimeout(timer)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isVisible && !isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 bg-brutal-black/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col bg-brutal-white border-t-3 border-brutal-black transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between border-b-3 border-brutal-black px-6 py-4 bg-brutal-yellow">
          <span className="text-lg font-bold text-brutal-black">전체 메뉴</span>
          <button
            onClick={onClose}
            className="p-2 text-brutal-black border-2 border-brutal-black bg-brutal-white shadow-brutal-sm hover:shadow-brutal transition-all duration-150"
            aria-label="닫기"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-6 pb-8">
            {menuGroups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-3 text-sm font-bold text-brutal-black border-b-2 border-brutal-black pb-2">
                  {group.label}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="p-3 text-center text-sm font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-active active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-3 border-brutal-black bg-brutal-yellow px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <LogoutButton variant="icon" />
        </div>
      </div>
    </div>
  )
}
