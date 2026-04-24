'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const breadcrumbMap: Record<string, string> = {
  '': '首页概览',
  recipes: '菜谱管理',
  new: '新增菜谱',
  categories: '分类管理',
  comments: '评论管理',
  users: '用户管理',
}

export default function TopBar() {
  const pathname = usePathname()

  const segments = pathname.split('/').filter(Boolean)
  const crumbs = [
    { label: '首页概览', href: '/' },
    ...segments.map((seg, i) => ({
      label: breadcrumbMap[seg] ?? seg,
      href: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ]

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
            {i === crumbs.length - 1 ? (
              <span className="text-gray-800 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-gray-500 hover:text-gray-700 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
          <div className="w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <span className="text-sm text-gray-700 font-medium">Admin</span>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
          onClick={() => {
            if (confirm('确认退出？')) {
              window.location.href = '/'
            }
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          退出
        </button>
      </div>
    </header>
  )
}
