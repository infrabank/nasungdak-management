'use client'

import { logout } from '../(auth)/login/actions'

export default function LogoutButton() {
  const handleLogout = async () => {
    await logout()
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
