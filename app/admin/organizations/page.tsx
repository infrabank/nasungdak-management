import { redirect } from 'next/navigation'

// /admin/organizations -> /admin으로 리다이렉트
export default function OrganizationsPage() {
  redirect('/admin')
}
