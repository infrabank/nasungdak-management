import { redirect } from 'next/navigation'

// SaaS 동결: 단일 매장 운영에 집중하는 동안 회원가입을 비활성화함
export default function SignupPage() {
  redirect('/login')
}
