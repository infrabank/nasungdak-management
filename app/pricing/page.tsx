import { redirect } from 'next/navigation'

// SaaS 동결: 단일 매장 운영에 집중하는 동안 요금제 페이지를 비활성화함
export default function PricingPage() {
  redirect('/login')
}
