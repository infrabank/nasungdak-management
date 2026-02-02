import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import {
  organizationInvitations,
  organizationMembers,
  organizations,
  users,
} from '@/lib/db/schema'
import { eq, and, isNull, gte } from 'drizzle-orm'
import Image from 'next/image'
import Link from 'next/link'
import AcceptInviteButton from './accept-button'

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-in-production'
)

interface Props {
  params: Promise<{ token: string }>
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    return (payload as { userId?: string }).userId || null
  } catch {
    return null
  }
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  // Find invitation
  const invitation = await db.query.organizationInvitations.findFirst({
    where: and(
      eq(organizationInvitations.token, token),
      isNull(organizationInvitations.acceptedAt),
      gte(organizationInvitations.expiresAt, new Date())
    ),
  })

  if (!invitation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brutal-white px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="border-3 border-brutal-black bg-brutal-white p-8 shadow-brutal-lg">
            <h1 className="text-2xl font-bold text-brutal-black">
              유효하지 않은 초대
            </h1>
            <p className="mt-4 text-brutal-black/70">
              이 초대 링크는 만료되었거나 이미 사용되었습니다.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block border-2 border-brutal-black bg-brutal-yellow px-6 py-3 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:shadow-brutal-lg"
            >
              로그인 페이지로
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Get organization info
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, invitation.organizationId),
  })

  if (!org) {
    return redirect('/login')
  }

  // Check if user is logged in
  const userId = await getCurrentUserId()

  // If logged in, check if email matches
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    // Check if already a member
    const existingMembership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, org.id),
        eq(organizationMembers.userId, userId),
        isNull(organizationMembers.deletedAt)
      ),
    })

    if (existingMembership) {
      return redirect('/dashboard')
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brutal-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <div className="border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal-lg">
              <Image
                src="/images/logo.png"
                alt="나성닭강정 로고"
                width={80}
                height={80}
                className="h-auto w-auto"
                priority
              />
            </div>
          </div>

          <div className="border-3 border-brutal-black bg-brutal-white p-8 shadow-brutal-lg">
            <h1 className="text-center text-2xl font-bold text-brutal-black">
              조직 초대
            </h1>

            <div className="mt-6 border-2 border-brutal-black bg-brutal-yellow/10 p-4">
              <p className="text-sm text-brutal-black/70">초대받은 조직</p>
              <p className="text-xl font-bold text-brutal-black">{org.name}</p>
              <p className="mt-2 text-sm text-brutal-black/70">
                역할:{' '}
                <span className="font-bold">
                  {invitation.role === 'admin' ? '관리자' : '멤버'}
                </span>
              </p>
            </div>

            <p className="mt-4 text-center text-sm text-brutal-black/70">
              <strong>{user?.name}</strong>님으로 로그인되어 있습니다.
              <br />이 조직에 참여하시겠습니까?
            </p>

            <div className="mt-6">
              <AcceptInviteButton token={token} />
            </div>

            <p className="mt-4 text-center text-xs text-brutal-black/50">
              다른 계정으로 참여하려면{' '}
              <Link href="/login" className="underline">
                로그아웃
              </Link>
              하세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Not logged in - show signup/login options
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brutal-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal-lg">
            <Image
              src="/images/logo.png"
              alt="나성닭강정 로고"
              width={80}
              height={80}
              className="h-auto w-auto"
              priority
            />
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-8 shadow-brutal-lg">
          <h1 className="text-center text-2xl font-bold text-brutal-black">
            조직 초대
          </h1>

          <div className="mt-6 border-2 border-brutal-black bg-brutal-yellow/10 p-4">
            <p className="text-sm text-brutal-black/70">초대받은 조직</p>
            <p className="text-xl font-bold text-brutal-black">{org.name}</p>
            <p className="mt-2 text-sm text-brutal-black/70">
              초대 이메일: <span className="font-bold">{invitation.email}</span>
            </p>
            <p className="text-sm text-brutal-black/70">
              역할:{' '}
              <span className="font-bold">
                {invitation.role === 'admin' ? '관리자' : '멤버'}
              </span>
            </p>
          </div>

          <p className="mt-4 text-center text-sm text-brutal-black/70">
            초대를 수락하려면 로그인하거나 회원가입하세요.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href={`/signup?invite=${token}&email=${encodeURIComponent(invitation.email)}`}
              className="flex w-full justify-center border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
            >
              회원가입
            </Link>
            <Link
              href={`/login?invite=${token}`}
              className="flex w-full justify-center border-2 border-brutal-black bg-brutal-white px-4 py-3 text-base font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
            >
              로그인
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-brutal-black/50">
            이 초대는{' '}
            {new Date(invitation.expiresAt).toLocaleDateString('ko-KR')}까지
            유효합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
