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
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <span className="text-lg font-bold text-gray-900">전체 메뉴</span>
          <button
            onClick={onClose}
            className="-mr-2 rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="닫기"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-8 pb-8">
            {menuGroups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-3 text-sm font-semibold text-gray-500">
                  {group.label}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="rounded-lg bg-gray-50 p-3 text-center text-sm font-medium text-gray-900 active:bg-gray-100"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <LogoutButton variant="icon" />
        </div>
      </div>
    </div>
  )
}
