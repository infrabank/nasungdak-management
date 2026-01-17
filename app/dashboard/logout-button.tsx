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
        className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-base font-medium text-gray-900 active:bg-gray-100 ${className}`}
      >
        <svg
          className="h-6 w-6 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
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
      className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
    >
      로그아웃
    </button>
  )
}
