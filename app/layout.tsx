import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toast'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

export const metadata: Metadata = {
  title: '매장 관리 시스템',
  description: '매입, 판매, 원가를 효율적으로 관리하는 SaaS 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="antialiased">
        <ConfirmProvider>
          {children}
          <Toaster />
        </ConfirmProvider>
      </body>
    </html>
  )
}
