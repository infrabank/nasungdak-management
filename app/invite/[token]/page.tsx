import { redirect } from 'next/navigation'

// SaaS 동결: 단일 매장 운영에 집중하는 동안 멤버 초대를 비활성화함
export default function InvitePage() {
  redirect('/login')
}
