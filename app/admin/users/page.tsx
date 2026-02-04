'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Trash2,
  Power,
  ArrowLeft,
  Search,
} from 'lucide-react'
import { getUsers, toggleUserStatus, deleteUser } from '../actions'
import type { UserListItem } from '../actions'
import { toast } from '@/components/ui/toast'

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const data = await getUsers()
    setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (
      !confirm(
        `이 사용자를 ${currentStatus ? '비활성화' : '활성화'}하시겠습니까?`
      )
    ) {
      return
    }

    setActionLoading(userId)
    const result = await toggleUserStatus(userId)
    setActionLoading(null)

    if (result.success) {
      toast.success(
        `사용자가 ${currentStatus ? '비활성화' : '활성화'}되었습니다`
      )
      loadUsers()
    } else {
      toast.error(result.error || '처리 중 오류가 발생했습니다')
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (
      !confirm(
        `정말로 "${userName}" 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return
    }

    setActionLoading(userId)
    const result = await deleteUser(userId)
    setActionLoading(null)

    if (result.success) {
      toast.success('사용자가 삭제되었습니다')
      loadUsers()
    } else {
      toast.error(result.error || '처리 중 오류가 발생했습니다')
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm)
  )

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-brutal-black/70 transition-colors hover:text-brutal-black"
      >
        <ArrowLeft className="h-4 w-4" />
        대시보드로 돌아가기
      </Link>

      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-brutal-black">사용자 관리</h1>
          <p className="mt-2 text-brutal-black/70">
            전체 사용자 목록을 관리합니다 ({users.length}명)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Users className="h-4 w-4" />
            전체 사용자
          </div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {users.length}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <CheckCircle className="h-4 w-4 text-green-600" />
            활성 사용자
          </div>
          <div className="mt-2 text-3xl font-black text-green-600">
            {users.filter((u) => u.isActive).length}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <XCircle className="h-4 w-4 text-red-600" />
            비활성 사용자
          </div>
          <div className="mt-2 text-3xl font-black text-red-600">
            {users.filter((u) => !u.isActive).length}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Clock className="h-4 w-4 text-blue-600" />
            최근 7일 가입
          </div>
          <div className="mt-2 text-3xl font-black text-blue-600">
            {
              users.filter((u) => {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return new Date(u.createdAt) > weekAgo
              }).length
            }
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brutal-black/50" />
          <input
            type="text"
            placeholder="이름, 이메일, 전화번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-2 border-brutal-black bg-brutal-white py-3 pl-10 pr-4 font-medium text-brutal-black placeholder:text-brutal-black/50 focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-2 border-brutal-black bg-brutal-yellow/20 px-6 py-4">
          <h2 className="text-lg font-bold text-brutal-black">
            사용자 목록 ({filteredUsers.length})
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-brutal-black/50">
            로딩 중...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-brutal-bg border-b-2 border-brutal-black">
                  <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                    사용자
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                    연락처
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-brutal-black">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                    소속 조직
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                    마지막 로그인
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                    가입일
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-brutal-black">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-brutal-black/50"
                    >
                      {searchTerm
                        ? '검색 결과가 없습니다'
                        : '등록된 사용자가 없습니다'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-brutal-black/20 transition-colors hover:bg-brutal-yellow/5"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-bold text-brutal-black">
                            {user.name}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-brutal-black/50">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-brutal-black/50" />
                            {user.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-brutal-black/30">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 border border-green-300 bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                            <CheckCircle className="h-3 w-3" />
                            활성
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border border-red-300 bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                            <XCircle className="h-3 w-3" />
                            비활성
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.organizations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.organizations.map((org) => (
                              <Link
                                key={org.id}
                                href={`/admin/organizations/${org.id}`}
                                className="bg-brutal-bg inline-flex items-center gap-1 border border-brutal-black/20 px-2 py-1 text-xs font-medium transition-colors hover:bg-brutal-yellow/20"
                              >
                                <Building2 className="h-3 w-3" />
                                {org.name}
                                <span
                                  className={`ml-1 rounded px-1 text-[10px] uppercase ${getRoleBadgeColor(org.role)}`}
                                >
                                  {org.role}
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-brutal-black/30">
                            소속 없음
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-brutal-black/70">
                        {formatDateTime(user.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-brutal-black/70">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              handleToggleStatus(user.id, user.isActive)
                            }
                            disabled={actionLoading === user.id}
                            className={`inline-flex items-center gap-1 border-2 border-brutal-black px-2 py-1 text-xs font-bold shadow-brutal transition-all hover:shadow-brutal-lg disabled:opacity-50 ${
                              user.isActive
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                            title={user.isActive ? '비활성화' : '활성화'}
                          >
                            <Power className="h-3 w-3" />
                            {user.isActive ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-1 border-2 border-brutal-black bg-red-100 px-2 py-1 text-xs font-bold text-red-800 shadow-brutal transition-all hover:shadow-brutal-lg disabled:opacity-50"
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
