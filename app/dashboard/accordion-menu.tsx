'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export type MenuItem = {
  label: string
  href: string
}

export type MenuGroup = {
  label: string
  items: MenuItem[]
}

export const menuGroups: MenuGroup[] = [
  {
    label: '운영 관리',
    items: [
      { label: '매입 관리', href: '/dashboard/purchases' },
      { label: '판매 관리', href: '/dashboard/sales' },
      { label: '기름 교체', href: '/dashboard/oil-changes' },
      { label: '고정비 관리', href: '/dashboard/fixed-costs' },
    ],
  },
  {
    label: '비용/분석',
    items: [
      { label: '기간 분석', href: '/dashboard/analysis' },
    ],
  },
  {
    label: '데이터 관리',
    items: [
      { label: '기초 데이터', href: '/dashboard/master-data' },
      { label: '매장 관리', href: '/dashboard/stores' },
    ],
  },
  {
    label: '재고/연동',
    items: [
      { label: '재고 관리', href: '/dashboard/inventory' },
      { label: '토스 매핑', href: '/dashboard/toss-mappings' },
    ],
  },
]

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

export default function AccordionMenu() {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close menu when route changes
  useEffect(() => {
    setOpenGroup(null)
    setIsMobileMenuOpen(false)
  }, [pathname])

  const isGroupActive = (group: MenuGroup) => {
    return group.items.some((item) => pathname.startsWith(item.href))
  }

  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const toggleGroup = (label: string) => {
    setOpenGroup((prev) => (prev === label ? null : label))
  }

  return (
    <div ref={menuRef} className="flex items-center">
      {/* Mobile Menu Button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop Menu */}
      <div className="hidden lg:flex lg:space-x-1">
        {menuGroups.map((group) => (
          <div key={group.label} className="relative">
            <button
              onClick={() => toggleGroup(group.label)}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isGroupActive(group)
                  ? 'bg-red-50 text-red-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {group.label}
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-200 ${
                  openGroup === group.label ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Panel */}
            <div
              className={`absolute left-0 top-full z-50 mt-1 min-w-[160px] origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200 ${
                openGroup === group.label
                  ? 'scale-100 opacity-100'
                  : 'pointer-events-none scale-95 opacity-0'
              }`}
            >
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    isItemActive(item.href)
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Slide-out Menu */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Side Panel */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-lg font-bold text-gray-900">메뉴</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {menuGroups.map((group) => (
                  <div key={group.label} className="border-b border-gray-100 pb-2 last:border-0">
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className={`flex w-full items-center justify-between rounded-md py-3 px-2 text-left font-medium transition-colors ${
                        isGroupActive(group) ? 'text-red-700' : 'text-gray-900'
                      }`}
                    >
                      {group.label}
                      <ChevronDownIcon
                        className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                          openGroup === group.label ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        openGroup === group.label
                          ? 'max-h-96 opacity-100'
                          : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="flex flex-col space-y-1 pl-4 pt-1">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block rounded-md py-3 px-4 text-base transition-colors ${
                              isItemActive(item.href)
                                ? 'bg-red-50 font-medium text-red-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
