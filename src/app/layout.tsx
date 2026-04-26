import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import LayoutWrapper from '@/components/admin/LayoutWrapper'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ChefChina Admin',
  description: '出海中国菜 — 管理后台',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}
