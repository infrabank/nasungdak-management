'use client'

import { logout } from '../(auth)/login/actions'

export default function LogoutButton({
  variant = 'default',
  className,
}: {
  variant?: 'default' | 'icon'
  className?: string
}) {
  const handleLogout = async () => {
    await logout()
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleLogout}
        className={`flex w-full items-center gap-3 border-2 border-brutal-black bg-brutal-white p-3 text-left text-base font-bold text-brutal-black shadow-brutal-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active ${className}`}
      >
        <svg
          className="h-6 w-6 text-brutal-black"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
          />
        </svg>
        로그아웃
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className="border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active"
    >
      로그아웃
    </button>
  )
}
