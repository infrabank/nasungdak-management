'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import AllMenuSheet from './all-menu-sheet'

function ShoppingCartIcon({ className }: { className?: string }) {
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
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    </svg>
  )
}

function BanknotesIcon({ className }: { className?: string }) {
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
        d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
      />
    </svg>
  )
}

function CalculatorIcon({ className }: { className?: string }) {
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
        d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18M12 5.25h.008v.008H12V5.25Zm0 2.25h.008v.008H12V7.5Zm0 2.25h.008v.008H12V9.75Zm0 2.25h.008v.008H12V12Zm-3-6.75h.008v.008H9V5.25Zm0 2.25h.008v.008H9V7.5Zm0 2.25h.008v.008H9V9.75Zm0 2.25h.008v.008H9V12Zm-3-6.75h.008v.008H6V5.25Zm0 2.25h.008v.008H6V7.5Zm0 2.25h.008v.008H6V9.75Zm0 2.25h.008v.008H6V12Zm12-6.75h.008v.008H18V5.25Zm0 2.25h.008v.008H18V7.5Zm0 2.25h.008v.008H18V9.75Zm0 2.25h.008v.008H18V12Z"
      />
    </svg>
  )
}

function Squares2X2Icon({ className }: { className?: string }) {
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
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  )
}

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [isAllMenuOpen, setIsAllMenuOpen] = useState(false)

  const isActive = (href: string) => pathname.startsWith(href)

  const navItems = [
    {
      label: '매입',
      href: '/dashboard/purchases',
      icon: ShoppingCartIcon,
    },
    {
      label: '판매',
      href: '/dashboard/sales',
      icon: BanknotesIcon,
    },
    {
      label: '고정',
      href: '/dashboard/fixed-costs',
      icon: CalculatorIcon,
    },
  ]

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 block border-t bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <nav className="flex h-14 items-center justify-around">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex w-full flex-col items-center justify-center py-1"
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <item.icon
                  className={`h-6 w-6 ${
                    active ? 'text-red-600' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`mt-0.5 text-[10px] font-medium ${
                    active ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
          <button
            onClick={() => setIsAllMenuOpen(true)}
            className="flex w-full flex-col items-center justify-center py-1"
            aria-label="전체 메뉴"
            aria-expanded={isAllMenuOpen}
          >
            <Squares2X2Icon
              className={`h-6 w-6 ${
                isAllMenuOpen ? 'text-red-600' : 'text-gray-400'
              }`}
            />
            <span
              className={`mt-0.5 text-[10px] font-medium ${
                isAllMenuOpen ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              전체
            </span>
          </button>
        </nav>
      </div>

      <AllMenuSheet
        isOpen={isAllMenuOpen}
        onClose={() => setIsAllMenuOpen(false)}
      />
    </>
  )
}
