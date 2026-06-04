'use client'

import { useState, useEffect, use } from 'react'
import { api } from '@/lib/api-client'

interface UserDetail {
  id: string
  email: string
  name: string | null
  avatar: string | null
  bio: string | null
  role: 'USER' | 'ADMIN'
  locale: string
  isBanned: boolean
  bannedAt: string | null
  bannedReason: string | null
  createdAt: string
  updatedAt: string
  _count: {
    recipes: number
    comments: number
    likes: number
    favorites: number
    following: number
    followers: number
  }
}

interface RecentRecipe {
  id: string
  titleEn: string
  titleZh: string
  coverImage: string | null
  createdAt: string
}

interface RecentComment {
  id: string
  content: string
  rating: number | null
  createdAt: string
  recipe: {
    id: string
    titleEn: string
    titleZh: string
  }
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [user, setUser] = useState<UserDetail | null>(null)
  const [recentRecipes, setRecentRecipes] = useState<RecentRecipe[]>([])
  const [recentComments, setRecentComments] = useState<RecentComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [showBanForm, setShowBanForm] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [id])

  const fetchUser = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/admin/users/${id}`)
      const d = await res.json()
      if (!res.ok) {
        setError(d?.error ?? 'Failed to load user')
        return
      }
      setUser(d.data.user)
      setRecentRecipes(d.data.recentRecipes ?? [])
      setRecentComments(d.data.recentComments ?? [])
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async () => {
    setActionLoading(true)
    try {
      const res = await api.patch(`/api/admin/users/${id}/ban`, { reason: banReason })
      if (res.ok) {
        await fetchUser()
        setShowBanForm(false)
        setBanReason('')
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async () => {
    setActionLoading(true)
    try {
      const res = await api.patch(`/api/admin/users/${id}/unban`)
      if (res.ok) {
        await fetchUser()
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-48" />
        <div className="bg-white rounded-xl border p-6">
          <div className="h-20 bg-gray-100 rounded w-full" />
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || '用户不存在'}
        </div>
        <a href="/users" className="inline-block mt-4 text-sm text-orange-600 hover:underline">
          ← 返回用户列表
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/users" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </a>
          <h1 className="text-2xl font-bold text-gray-900">用户详情</h1>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (user.name?.[0] ?? user.email[0]).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{user.name || '未设置昵称'}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {user.role === 'ADMIN' ? '管理员' : '普通用户'}
              </span>
              {user.isBanned ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">已封禁</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">正常</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            {user.bio && <p className="text-sm text-gray-600 mt-2">{user.bio}</p>}
            <p className="text-xs text-gray-400 mt-2">
              注册时间：{new Date(user.createdAt).toLocaleString('zh-CN')} · ID: {user.id}
            </p>
          </div>
          <div className="flex gap-2">
            {user.isBanned ? (
              <button
                onClick={handleUnban}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                {actionLoading ? '处理中...' : '解封用户'}
              </button>
            ) : (
              <button
                onClick={() => setShowBanForm(true)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                封禁用户
              </button>
            )}
          </div>
        </div>

        {/* Ban info */}
        {user.isBanned && user.bannedAt && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>封禁时间：</strong>{new Date(user.bannedAt).toLocaleString('zh-CN')}
            </p>
            {user.bannedReason && (
              <p className="text-sm text-red-600 mt-1">
                <strong>封禁原因：</strong>{user.bannedReason}
              </p>
            )}
          </div>
        )}

        {/* Ban form */}
        {showBanForm && !user.isBanned && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">封禁原因</label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="请输入封禁原因..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400/50 resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => { setShowBanForm(false); setBanReason('') }}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white"
              >
                取消
              </button>
              <button
                onClick={handleBan}
                disabled={actionLoading}
                className="px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading ? '处理中...' : '确认封禁'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: '菜谱', value: user._count.recipes, color: 'text-orange-600' },
          { label: '评论', value: user._count.comments, color: 'text-blue-600' },
          { label: '点赞', value: user._count.likes, color: 'text-pink-600' },
          { label: '收藏', value: user._count.favorites, color: 'text-yellow-600' },
          { label: '关注', value: user._count.following, color: 'text-green-600' },
          { label: '粉丝', value: user._count.followers, color: 'text-purple-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Recipes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">最近菜谱</h3>
        {recentRecipes.length === 0 ? (
          <p className="text-sm text-gray-400">暂无菜谱</p>
        ) : (
          <div className="space-y-3">
            {recentRecipes.map((recipe) => (
              <div key={recipe.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {recipe.coverImage && (
                  <img src={recipe.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{recipe.titleZh || recipe.titleEn}</p>
                  <p className="text-xs text-gray-400">{new Date(recipe.createdAt).toLocaleDateString('zh-CN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Comments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">最近评论</h3>
        {recentComments.length === 0 ? (
          <p className="text-sm text-gray-400">暂无评论</p>
        ) : (
          <div className="space-y-3">
            {recentComments.map((comment) => (
              <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-gray-500">
                    评价 <strong>{comment.recipe.titleZh || comment.recipe.titleEn}</strong>
                  </p>
                  {comment.rating && (
                    <span className="text-xs text-yellow-600">{'⭐'.repeat(comment.rating)}</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{comment.content}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(comment.createdAt).toLocaleDateString('zh-CN')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
