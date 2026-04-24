'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────
interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: 'USER' | 'ADMIN'
  locale: string
  bio: string | null
  createdAt: string
  _count: { recipes: number; comments: number; favorites: number }
}

// ─── Locale Badge ─────────────────────────────────────────
function LocaleBadge({ locale }: { locale: string }) {
  const map: Record<string, string> = {
    en: '🇺🇸 EN',
    zh: '🇨🇳 ZH',
    'zh-CN': '🇨🇳 ZH',
    'zh-TW': '🇹🇼 TW',
    ja: '🇯🇵 JA',
    ko: '🇰🇷 KO',
  }
  return (
    <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
      {map[locale] ?? locale}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState<User[]>([])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users?pageSize=100')
      if (res.ok) {
        const d = await res.json()
        setUsers(d?.data?.users ?? d?.data ?? [])
      } else {
        setUsers([])
      }
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    if (!search) {
      setFiltered(users)
      return
    }
    const q = search.toLowerCase()
    setFiltered(
      users.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name ?? '').toLowerCase().includes(q)
      )
    )
  }, [search, users])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? '加载中...' : `共 ${users.length} 位用户`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索邮箱或用户名..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">用户</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">邮箱</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">角色</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">语言</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">菜谱</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">评论</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">收藏</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">注册时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                        <div className="h-3.5 bg-gray-200 rounded w-24" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-40" /></td>
                    <td className="px-5 py-3.5"><div className="h-5 bg-gray-200 rounded w-14" /></td>
                    <td className="px-5 py-3.5"><div className="h-5 bg-gray-100 rounded w-12" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                    <td className="px-5 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-24" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      {users.length === 0 ? (
                        <>
                          <p className="font-medium text-gray-500">暂无用户数据</p>
                          <p className="text-xs text-gray-400 max-w-sm text-center">
                            用户通过 OAuth 登录后会自动出现在此列表中。
                          </p>
                        </>
                      ) : (
                        <p>未找到匹配用户</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (user.name?.[0] ?? user.email[0]).toUpperCase()
                          )}
                        </div>
                        <span className="font-medium text-gray-800">
                          {user.name ?? <span className="text-gray-400 italic">未设置</span>}
                        </span>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-3.5 text-gray-600">{user.email}</td>
                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.role === 'ADMIN' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    {/* Locale */}
                    <td className="px-5 py-3.5">
                      <LocaleBadge locale={user.locale} />
                    </td>
                    {/* Counts */}
                    <td className="px-5 py-3.5 text-gray-600 text-center">{user._count.recipes}</td>
                    <td className="px-5 py-3.5 text-gray-600 text-center">{user._count.comments}</td>
                    <td className="px-5 py-3.5 text-gray-600 text-center">{user._count.favorites}</td>
                    {/* Date */}
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <div className="text-sm text-blue-700">
          <p className="font-medium">提示</p>
          <p className="text-blue-600 mt-0.5">
            用户通过 OAuth（Google/GitHub）登录后自动注册。用户列表通过{' '}
            <code className="bg-blue-100 px-1 rounded font-mono text-xs">/api/admin/users</code>{' '}
            接口获取。
          </p>
        </div>
      </div>
    </div>
  )
}
