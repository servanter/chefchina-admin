import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/admin/Sidebar'
import TopBar from '@/components/admin/TopBar'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/AuthGuard'

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
          <AuthGuard>
            <div className="flex h-full">
              {/* Sidebar (fixed, 256px wide) */}
              <Sidebar />

              {/* Main content area — offset by sidebar width */}
              <div className="flex flex-col flex-1 min-h-screen ml-64">
                <TopBar />
                <main className="flex-1 p-6 overflow-auto">
                  {children}
                </main>
              </div>
            </div>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
