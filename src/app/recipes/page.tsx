'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────
interface Category {
  id: string
  nameZh: string
  nameEn: string
}

interface Recipe {
  id: string
  titleZh: string
  titleEn: string
  isPublished: boolean
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  cookTimeMin: number
  servings: number
  createdAt: string
  coverImage?: string | null
  category: Category | null
  author: { name: string | null } | null
  _count: { likes: number; comments: number }
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// ─── Helper Components ────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    EASY: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HARD: 'bg-red-100 text-red-700',
  }
  const label: Record<string, string> = { EASY: '简单', MEDIUM: '中等', HARD: '困难' }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[difficulty] ?? difficulty}
    </span>
  )
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${published ? 'bg-green-500' : 'bg-gray-400'}`} />
      {published ? '已发布' : '草稿'}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────
export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [publishedFilter, setPublishedFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch categories once
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d?.data ?? []))
      .catch(() => {})
  }, [])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '15' })
    if (search) params.set('search', search)
    if (categoryId) params.set('categoryId', categoryId)
    if (difficulty) params.set('difficulty', difficulty)
    // When publishedFilter is empty we want ALL recipes (published + drafts).
    // The API defaults published=true when the param is absent, so we must
    // explicitly pass published=false to get the "show all" behaviour of the
    // current API implementation (which skips the isPublished filter when false).
    if (publishedFilter === 'true') {
      params.set('published', 'true')
    } else {
      // Both "empty (all)" and "false (drafts only)" use published=false so the
      // API doesn't restrict to isPublished=true.  We handle draft-only filtering
      // client-side when the user explicitly selects that option.
      params.set('published', 'false')
    }

    try {
      const res = await fetch(`/api/recipes?${params}`)
      const d = await res.json()
      let list: Recipe[] = d?.data?.recipes ?? []
      // If the user explicitly wants draft-only, filter client-side
      if (publishedFilter === 'false') {
        list = list.filter((r) => !r.isPublished)
      }
      setRecipes(list)
      setPagination(d?.data?.pagination ?? null)
    } catch {
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryId, difficulty, publishedFilter])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`确认删除菜谱「${title}」？此操作不可撤销。`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchRecipes()
      } else {
        alert('删除失败，请重试')
      }
    } catch {
      alert('删除失败，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  async function togglePublish(recipe: Recipe) {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !recipe.isPublished }),
      })
      if (res.ok) {
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipe.id ? { ...r, isPublished: !r.isPublished } : r))
        )
      }
    } catch {
      alert('操作失败')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchRecipes()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">菜谱管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pagination ? `共 ${pagination.total} 道菜谱` : '管理所有菜谱'}
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新增菜谱
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1 font-medium">搜索菜谱</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索中英文标题..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
              />
            </div>
          </div>
          {/* Category */}
          <div className="min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1 font-medium">分类</label>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 bg-white"
            >
              <option value="">全部分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameZh}</option>
              ))}
            </select>
          </div>
          {/* Difficulty */}
          <div className="min-w-[120px]">
            <label className="block text-xs text-gray-500 mb-1 font-medium">难度</label>
            <select
              value={difficulty}
              onChange={(e) => { setDifficulty(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 bg-white"
            >
              <option value="">全部难度</option>
              <option value="EASY">简单</option>
              <option value="MEDIUM">中等</option>
              <option value="HARD">困难</option>
            </select>
          </div>
          {/* Published */}
          <div className="min-w-[120px]">
            <label className="block text-xs text-gray-500 mb-1 font-medium">发布状态</label>
            <select
              value={publishedFilter}
              onChange={(e) => { setPublishedFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 bg-white"
            >
              <option value="">全部状态</option>
              <option value="true">已发布</option>
              <option value="false">草稿</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            搜索
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setCategoryId(''); setDifficulty(''); setPublishedFilter(''); setPage(1) }}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            重置
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">封面</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">标题</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">分类</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">难度</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">互动</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="w-10 h-10 bg-gray-200 rounded-lg" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-48 mb-1" /><div className="h-3 bg-gray-100 rounded w-32" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded w-14" /></td>
                    <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded w-16" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-8 bg-gray-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : recipes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                      </svg>
                      <p>暂无菜谱数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50 transition-colors">
                    {/* Cover */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={recipe.coverImage || 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=64&h=64&fit=crop'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    {/* Title */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{recipe.titleZh}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{recipe.titleEn}</p>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3 text-gray-600">
                      {recipe.category?.nameZh ?? <span className="text-gray-300">—</span>}
                    </td>
                    {/* Difficulty */}
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={recipe.difficulty} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge published={recipe.isPublished} />
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(recipe.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    {/* Interactions */}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      ❤️ {recipe._count?.likes ?? 0} · 💬 {recipe._count?.comments ?? 0}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => togglePublish(recipe)}
                          title={recipe.isPublished ? '取消发布' : '发布'}
                          className={`p-1.5 rounded-lg transition-colors text-xs font-medium ${
                            recipe.isPublished
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {recipe.isPublished ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          )}
                        </button>
                        <Link
                          href={`/recipes/${recipe.id}/edit`}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(recipe.id, recipe.titleZh)}
                          disabled={deletingId === recipe.id}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="删除"
                        >
                          {deletingId === recipe.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                上一页
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                      p === pagination.page
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
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
