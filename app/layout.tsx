import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '매입/판매/원가 관리',
  description: '나성닭강정 매입, 판매, 원가 관리 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
