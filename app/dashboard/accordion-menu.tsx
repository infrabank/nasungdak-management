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
      { label: '직원 관리', href: '/dashboard/employees' },
      { label: '출퇴근 기록', href: '/dashboard/attendance' },
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
    label: '재고',
    items: [
      { label: '재고 관리', href: '/dashboard/inventory' },
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-brutal-black border-2 border-brutal-black bg-brutal-white shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="hidden lg:flex lg:space-x-2">
        {menuGroups.map((group) => (
          <div key={group.label} className="relative">
            <button
              onClick={() => toggleGroup(group.label)}
              className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-bold border-2 border-brutal-black transition-all duration-150 ${
                isGroupActive(group)
                  ? 'bg-brutal-pink text-brutal-black shadow-brutal-sm'
                  : 'bg-brutal-white text-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5'
              }`}
            >
              {group.label}
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-200 ${
                  openGroup === group.label ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              className={`absolute left-0 top-full z-50 mt-2 min-w-[180px] origin-top-left bg-brutal-white border-2 border-brutal-black shadow-brutal transition-all duration-200 ${
                openGroup === group.label
                  ? 'scale-100 opacity-100'
                  : 'pointer-events-none scale-95 opacity-0'
              }`}
            >
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 text-sm font-medium border-b-2 border-brutal-black last:border-b-0 transition-colors ${
                    isItemActive(item.href)
                      ? 'bg-brutal-yellow text-brutal-black'
                      : 'text-brutal-black hover:bg-brutal-yellow/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-brutal-black/60 transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-brutal-white border-r-3 border-brutal-black transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b-3 border-brutal-black px-4 py-3 bg-brutal-yellow">
              <span className="text-lg font-bold text-brutal-black">메뉴</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-brutal-black border-2 border-brutal-black bg-brutal-white shadow-brutal-sm hover:shadow-brutal transition-all duration-150"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3">
                {menuGroups.map((group) => (
                  <div key={group.label} className="border-b-2 border-brutal-black pb-3 last:border-0">
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className={`flex w-full items-center justify-between py-3 px-3 text-left font-bold border-2 border-brutal-black transition-all duration-150 ${
                        isGroupActive(group) 
                          ? 'bg-brutal-pink text-brutal-black shadow-brutal-sm' 
                          : 'bg-brutal-white text-brutal-black shadow-brutal-sm'
                      }`}
                    >
                      {group.label}
                      <ChevronDownIcon
                        className={`h-5 w-5 text-brutal-black transition-transform duration-200 ${
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
                      <div className="flex flex-col space-y-2 pl-2 pt-3">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block py-3 px-4 text-base font-medium border-2 border-brutal-black transition-all duration-150 ${
                              isItemActive(item.href)
                                ? 'bg-brutal-yellow text-brutal-black shadow-brutal-sm'
                                : 'bg-brutal-white text-brutal-black hover:bg-brutal-yellow/50'
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
