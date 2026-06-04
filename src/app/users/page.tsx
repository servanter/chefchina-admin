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
  isBanned: boolean
  bannedAt: string | null
  bannedReason: string | null
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

function StatusBadge({ isBanned }: { isBanned: boolean }) {
  return isBanned ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      已封禁
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      正常
    </span>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [banModalUser, setBanModalUser] = useState<User | null>(null)
  const [banReason, setBanReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search.trim()) qs.set('search', search.trim())
      if (roleFilter) qs.set('role', roleFilter)
      if (statusFilter) qs.set('status', statusFilter)
      if (startDate) qs.set('startDate', startDate)
      if (endDate) qs.set('endDate', endDate)
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
  }, [page, search, roleFilter, statusFilter, startDate, endDate])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleBan = async (user: User) => {
    setBanModalUser(user)
    setBanReason('')
  }

  const confirmBan = async () => {
    if (!banModalUser) return
    setActionLoading(banModalUser.id)
    try {
      const res = await api.patch(`/api/admin/users/${banModalUser.id}/ban`, { reason: banReason })
      if (res.ok) {
        await fetchUsers()
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null)
      setBanModalUser(null)
    }
  }

  const handleUnban = async (userId: string) => {
    setActionLoading(userId)
    try {
      const res = await api.patch(`/api/admin/users/${userId}/unban`)
      if (res.ok) {
        await fetchUsers()
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const qs = new URLSearchParams()
      if (search.trim()) qs.set('search', search.trim())
      if (roleFilter) qs.set('role', roleFilter)
      if (statusFilter) qs.set('status', statusFilter)
      if (startDate) qs.set('startDate', startDate)
      if (endDate) qs.set('endDate', endDate)
      const res = await api.get(`/api/admin/users/export?${qs.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setRoleFilter('')
    setStatusFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? '加载中...' : `共 ${pagination?.total ?? users.length} 位用户`}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {exporting ? '导出中...' : '导出 CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-end gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <label className="block text-xs text-gray-500 mb-1">搜索</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="按姓名、邮箱或 ID 搜索..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
              />
            </div>
          </div>

          {/* Role filter */}
          <div className="min-w-[120px]">
            <label className="block text-xs text-gray-500 mb-1">角色</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            >
              <option value="">全部</option>
              <option value="USER">普通用户</option>
              <option value="ADMIN">管理员</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="min-w-[120px]">
            <label className="block text-xs text-gray-500 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            >
              <option value="">全部</option>
              <option value="active">正常</option>
              <option value="banned">已封禁</option>
            </select>
          </div>

          {/* Date range */}
          <div className="min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">注册起始</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">注册截止</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
          </div>

          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">用户</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">邮箱</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">角色</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">菜谱</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">评论</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">注册时间</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-8 bg-gray-100 rounded w-28" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 bg-gray-100 rounded w-14" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 bg-gray-100 rounded w-14" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded w-8 mx-auto" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded w-8 mx-auto" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="px-4 py-3.5"><div className="h-6 bg-gray-100 rounded w-20 mx-auto" /></td>
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
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (user.name?.[0] ?? user.email[0]).toUpperCase()
                          )}
                        </div>
                        <a
                          href={`/users/${user.id}`}
                          className="font-medium text-gray-800 hover:text-orange-600 hover:underline transition-colors"
                        >
                          {user.name ?? <span className="text-gray-400 italic">未设置</span>}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5">
                      <StatusBadge isBanned={user.isBanned} />
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-center">{user._count.recipes}</td>
                    <td className="px-4 py-3.5 text-gray-600 text-center">{user._count.comments}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={`/users/${user.id}`}
                          className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                        >
                          详情
                        </a>
                        {user.isBanned ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            disabled={actionLoading === user.id}
                            className="px-2 py-1 text-xs text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? '...' : '解封'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(user)}
                            disabled={actionLoading === user.id}
                            className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? '...' : '封禁'}
                          </button>
                        )}
                      </div>
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

      {/* Ban Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">封禁用户</h3>
            <p className="text-sm text-gray-600 mb-4">
              确定要封禁用户 <strong>{banModalUser.name || banModalUser.email}</strong> 吗？
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">封禁原因</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="请输入封禁原因..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400/50 resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBanModalUser(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmBan}
                disabled={actionLoading === banModalUser.id}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === banModalUser.id ? '处理中...' : '确认封禁'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
