'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────
interface Recipe {
  id: string
  titleZh: string
  titleEn: string
}

interface CommentUser {
  id: string
  name: string | null
  avatar: string | null
}

interface Comment {
  id: string
  content: string
  rating?: number | null
  isVisible: boolean
  createdAt: string
  recipeId: string
  user: CommentUser
  replies?: Comment[]
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// ─── Star Rating ──────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────
export default function CommentsPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('')
  const [comments, setComments] = useState<Comment[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [page, setPage] = useState(1)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch recipes for filter dropdown
  useEffect(() => {
    setLoadingRecipes(true)
    fetch('/api/recipes?published=false&pageSize=100')
      .then((r) => r.json())
      .then((d) => {
        const list: Recipe[] = (d?.data?.recipes ?? []).map((r: Recipe) => ({
          id: r.id,
          titleZh: r.titleZh,
          titleEn: r.titleEn,
        }))
        setRecipes(list)
        if (list.length > 0) {
          setSelectedRecipeId(list[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRecipes(false))
  }, [])

  const fetchComments = useCallback(async () => {
    if (!selectedRecipeId) return
    setLoading(true)
    try {
      // Pass all=true so the admin can see hidden comments too
      const res = await fetch(`/api/comments?recipeId=${selectedRecipeId}&page=${page}&pageSize=20&all=true`)
      const d = await res.json()
      setComments(d?.data?.comments ?? [])
      setPagination(d?.data?.pagination ?? null)
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [selectedRecipeId, page])

  useEffect(() => {
    if (selectedRecipeId) fetchComments()
  }, [fetchComments, selectedRecipeId])

  async function toggleVisibility(comment: Comment) {
    setTogglingId(comment.id)
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !comment.isVisible }),
      })
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === comment.id ? { ...c, isVisible: !c.isVisible } : c))
        )
      }
    } catch {
      alert('操作失败')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除该评论？此操作不可撤销。')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id))
      } else {
        alert('删除失败')
      }
    } catch {
      alert('删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId)

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">评论管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理用户对菜谱的评论，可切换可见性</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">选择菜谱</label>
          {loadingRecipes ? (
            <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <select
              value={selectedRecipeId}
              onChange={(e) => {
                setSelectedRecipeId(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 bg-white"
            >
              {recipes.length === 0 ? (
                <option value="">暂无菜谱</option>
              ) : (
                recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titleZh} ({r.titleEn})
                  </option>
                ))
              )}
            </select>
          )}
        </div>
        {pagination && (
          <div className="text-sm text-gray-500">
            共 <span className="font-semibold text-gray-800">{pagination.total}</span> 条评论
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Recipe Info Header */}
        {selectedRecipe && (
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-800">{selectedRecipe.titleZh}</span>
              <span className="text-gray-400 ml-1">— {selectedRecipe.titleEn}</span>
            </span>
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-5 animate-pulse flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : !selectedRecipeId ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <p>请先选择一道菜谱</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <p>该菜谱暂无评论</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-5 transition-colors ${!comment.isVisible ? 'bg-gray-50/60 opacity-70' : 'hover:bg-gray-50/40'}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                    {comment.user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={comment.user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (comment.user.name?.[0] ?? 'U').toUpperCase()
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {comment.user.name ?? '匿名用户'}
                      </span>
                      {comment.rating && <StarRating rating={comment.rating} />}
                      {!comment.isVisible && (
                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-xs rounded font-medium">
                          已隐藏
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(comment.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{comment.content}</p>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-2 pl-3 border-l-2 border-gray-200">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                              {(reply.user.name?.[0] ?? 'U').toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-700">{reply.user.name ?? '匿名'}</span>
                              <span className="text-xs text-gray-400 ml-1.5">
                                {new Date(reply.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                              <p className="text-xs text-gray-600 mt-0.5">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    {/* Toggle visibility */}
                    <button
                      onClick={() => toggleVisibility(comment)}
                      disabled={togglingId === comment.id}
                      title={comment.isVisible ? '隐藏评论' : '显示评论'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        comment.isVisible
                          ? 'text-green-500 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      } disabled:opacity-50`}
                    >
                      {togglingId === comment.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : comment.isVisible ? (
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
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      title="删除评论"
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deletingId === comment.id ? (
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50">
            <p className="text-xs text-gray-500">
              第 {pagination.page} / {pagination.totalPages} 页
            </p>
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
