'use client'

import { useActionState, useState } from 'react'
import { inviteMember, cancelInvitation, removeMember } from './actions'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { UserPlus, X, Clock, Crown, Shield, User } from 'lucide-react'

interface Member {
  id: string
  role: string
  joinedAt: Date | null
  user: {
    id: string
    name: string
    email: string
  }
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expiresAt: Date
}

interface Props {
  members: Member[]
  pendingInvites: PendingInvite[]
  maxUsers: number
  currentUserRole: string
  isOwner: boolean
}

export default function MembersSection({
  members,
  pendingInvites,
  maxUsers,
  currentUserRole,
  isOwner,
}: Props) {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteState, inviteAction, isInviting] = useActionState(inviteMember, null)

  useEffect(() => {
    if (inviteState?.success) {
      toast.success('초대가 발송되었습니다')
      setShowInviteForm(false)
    } else if (inviteState?.error) {
      toast.error(inviteState.error)
    }
  }, [inviteState])

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('초대를 취소하시겠습니까?')) return
    const result = await cancelInvitation(inviteId)
    if (result.success) {
      toast.success('초대가 취소되었습니다')
    } else {
      toast.error(result.error || '오류가 발생했습니다')
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`${memberName}님을 조직에서 제거하시겠습니까?`)) return
    const result = await removeMember(memberId)
    if (result.success) {
      toast.success('멤버가 제거되었습니다')
    } else {
      toast.error(result.error || '오류가 발생했습니다')
    }
  }

  const canInvite = ['owner', 'admin'].includes(currentUserRole)
  const atLimit = maxUsers !== -1 && members.length >= maxUsers

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-brutal-yellow" />
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return <User className="w-4 h-4 text-brutal-black/50" />
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner':
        return '소유자'
      case 'admin':
        return '관리자'
      default:
        return '멤버'
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR')
  }

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-brutal-black/70">
            {members.length}명 멤버
            {maxUsers !== -1 && ` / 최대 ${maxUsers}명`}
          </p>
        </div>
        {canInvite && !atLimit && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            멤버 초대
          </button>
        )}
        {atLimit && (
          <p className="text-sm text-brutal-red font-medium">
            멤버 제한에 도달했습니다
          </p>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <form
          action={inviteAction}
          className="p-4 border-2 border-brutal-black bg-brutal-yellow/10"
        >
          <h3 className="font-bold text-brutal-black mb-4">새 멤버 초대</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="email"
                className="block text-sm font-bold text-brutal-black"
              >
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={isInviting}
                placeholder="member@example.com"
                className="mt-1 block w-full px-4 py-2 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal transition-all disabled:bg-gray-100 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-bold text-brutal-black"
              >
                역할
              </label>
              <select
                id="role"
                name="role"
                disabled={isInviting}
                className="mt-1 block w-full px-4 py-2 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal transition-all disabled:bg-gray-100 sm:text-sm"
              >
                <option value="member">멤버</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isInviting}
              className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg transition-all disabled:opacity-50"
            >
              {isInviting ? '발송 중...' : '초대 발송'}
            </button>
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              className="px-4 py-2 text-sm font-bold text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg transition-all"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-brutal-black mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            대기 중인 초대 ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 border-2 border-dashed border-brutal-black/50 bg-brutal-white"
              >
                <div>
                  <p className="font-medium text-brutal-black">{invite.email}</p>
                  <p className="text-xs text-brutal-black/50">
                    {getRoleName(invite.role)} · {formatDate(invite.expiresAt)}까지
                    유효
                  </p>
                </div>
                {canInvite && (
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="p-1 text-brutal-black/50 hover:text-brutal-red transition-colors"
                    title="초대 취소"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div>
        <h3 className="text-sm font-bold text-brutal-black mb-2">
          현재 멤버
        </h3>
        <div className="border-2 border-brutal-black divide-y-2 divide-brutal-black">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-brutal-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border-2 border-brutal-black bg-brutal-yellow/20 font-bold text-brutal-black">
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-brutal-black flex items-center gap-2">
                    {member.user.name}
                    {getRoleIcon(member.role)}
                  </p>
                  <p className="text-sm text-brutal-black/50">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="inline-block px-2 py-1 text-xs font-bold border-2 border-brutal-black">
                    {getRoleName(member.role)}
                  </span>
                  <p className="text-xs text-brutal-black/50 mt-1">
                    {formatDate(member.joinedAt)} 가입
                  </p>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <button
                    onClick={() =>
                      handleRemoveMember(member.id, member.user.name)
                    }
                    className="p-2 text-brutal-black/50 hover:text-brutal-red transition-colors"
                    title="멤버 제거"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
