'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'

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

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search.trim()) qs.set('search', search.trim())
      const res = await api.get(`/api/admin/users?${qs.toString()}`)
      const d = await res.json()
      if (!res.ok) {
        setUsers([])
        setPagination(null)
        setError(d?.error ?? '加载用户失败')
        return
      }
      setUsers(d?.data?.users ?? [])
      setPagination(d?.data?.pagination ?? null)
    } catch {
      setUsers([])
      setPagination(null)
      setError('网络错误,请重试')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? '加载中...' : `共 ${pagination?.total ?? users.length} 位用户`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-end gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[260px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="搜索邮箱或用户名..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setSearch('')
            setPage(1)
          }}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          清空搜索
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
                    <td className="px-5 py-3.5"><div className="h-8 bg-gray-100 rounded w-28" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                    <td className="px-5 py-3.5"><div className="h-5 bg-gray-100 rounded w-14" /></td>
                    <td className="px-5 py-3.5"><div className="h-5 bg-gray-100 rounded w-12" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <p>{search ? '未找到匹配用户' : '暂无用户数据'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {user.avatar ? (
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
                    <td className="px-5 py-3.5 text-gray-600">{user.email}</td>
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
                    <td className="px-5 py-3.5"><LocaleBadge locale={user.locale} /></td>
                    <td className="px-5 py-3.5 text-gray-600 text-center">{user._count.recipes}</td>
                    <td className="px-5 py-3.5 text-gray-600 text-center">{user._count.comments}</td>
                    <td className="px-5 py-3.5 text-gray-600 text-center">{user._count.favorites}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50">
            <p className="text-xs text-gray-500">第 {pagination.page} / {pagination.totalPages} 页</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
