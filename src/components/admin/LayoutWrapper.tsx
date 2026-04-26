'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { AuthGuard } from '../AuthGuard'

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    // 登录页：只渲染内容，不显示导航
    return <>{children}</>
  }

  // 管理页：带侧边栏和顶栏
  return (
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
  )
}
