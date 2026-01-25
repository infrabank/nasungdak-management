import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toast'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

export const metadata: Metadata = {
  title: '나성닭강정 관리 시스템',
  description: '나성닭강정 관리 시스템',
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
