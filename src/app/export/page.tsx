'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'

interface Category {
  id: string
  nameEn: string
  nameZh: string
}

export default function ExportPage() {
  const [categories, setCategories] = useState<Category[]>([])

  // Recipe export filters
  const [recipeCategory, setRecipeCategory] = useState('')
  const [recipeStatus, setRecipeStatus] = useState('')
  const [recipeStartDate, setRecipeStartDate] = useState('')
  const [recipeEndDate, setRecipeEndDate] = useState('')
  const [recipeExporting, setRecipeExporting] = useState(false)

  // Comment export filters
  const [commentRecipeId, setCommentRecipeId] = useState('')
  const [commentStartDate, setCommentStartDate] = useState('')
  const [commentEndDate, setCommentEndDate] = useState('')
  const [commentExporting, setCommentExporting] = useState(false)

  // User export
  const [userExporting, setUserExporting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/categories')
      const d = await res.json()
      if (res.ok && d?.data) {
        setCategories(Array.isArray(d.data) ? d.data : d.data.categories ?? [])
      }
    } catch {
      // ignore
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRecipeExport = async () => {
    setRecipeExporting(true)
    try {
      const qs = new URLSearchParams()
      if (recipeCategory) qs.set('category', recipeCategory)
      if (recipeStatus) qs.set('status', recipeStatus)
      if (recipeStartDate) qs.set('startDate', recipeStartDate)
      if (recipeEndDate) qs.set('endDate', recipeEndDate)
      const res = await api.get(`/api/admin/recipes/export?${qs.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        downloadBlob(blob, `recipes-export-${new Date().toISOString().split('T')[0]}.csv`)
      }
    } catch {
      // ignore
    } finally {
      setRecipeExporting(false)
    }
  }

  const handleCommentExport = async () => {
    setCommentExporting(true)
    try {
      const qs = new URLSearchParams()
      if (commentRecipeId) qs.set('recipeId', commentRecipeId)
      if (commentStartDate) qs.set('startDate', commentStartDate)
      if (commentEndDate) qs.set('endDate', commentEndDate)
      const res = await api.get(`/api/admin/comments/export?${qs.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        downloadBlob(blob, `comments-export-${new Date().toISOString().split('T')[0]}.csv`)
      }
    } catch {
      // ignore
    } finally {
      setCommentExporting(false)
    }
  }

  const handleUserExport = async () => {
    setUserExporting(true)
    try {
      const res = await api.get('/api/admin/users/export')
      if (res.ok) {
        const blob = await res.blob()
        downloadBlob(blob, `users-export-${new Date().toISOString().split('T')[0]}.csv`)
      }
    } catch {
      // ignore
    } finally {
      setUserExporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
        <p className="text-sm text-gray-500 mt-1">导出菜谱、评论、用户数据为 CSV 格式文件</p>
      </div>

      {/* Recipe Export */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">菜谱数据导出</h2>
            <p className="text-xs text-gray-500">导出字段：ID、标题（中英文）、分类、作者、状态、创建时间、浏览量、收藏数、评分</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">分类</label>
            <select
              value={recipeCategory}
              onChange={(e) => setRecipeCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nameZh || cat.nameEn}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">状态</label>
            <select
              value={recipeStatus}
              onChange={(e) => setRecipeStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            >
              <option value="">全部</option>
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">起始日期</label>
            <input
              type="date"
              value={recipeStartDate}
              onChange={(e) => setRecipeStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">截止日期</label>
            <input
              type="date"
              value={recipeEndDate}
              onChange={(e) => setRecipeEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
          </div>
        </div>

        <button
          onClick={handleRecipeExport}
          disabled={recipeExporting}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {recipeExporting ? '导出中...' : '导出菜谱 CSV'}
        </button>
      </div>

      {/* Comment Export */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">评论数据导出</h2>
            <p className="text-xs text-gray-500">导出字段：ID、菜谱ID、菜谱标题、用户、评分、评论内容、创建时间</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">菜谱 ID（可选）</label>
            <input
              type="text"
              value={commentRecipeId}
              onChange={(e) => setCommentRecipeId(e.target.value)}
              placeholder="留空导出全部"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">起始日期</label>
            <input
              type="date"
              value={commentStartDate}
              onChange={(e) => setCommentStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">截止日期</label>
            <input
              type="date"
              value={commentEndDate}
              onChange={(e) => setCommentEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            />
          </div>
        </div>

        <button
          onClick={handleCommentExport}
          disabled={commentExporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {commentExporting ? '导出中...' : '导出评论 CSV'}
        </button>
      </div>

      {/* User Export (quick link) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">用户数据导出</h2>
            <p className="text-xs text-gray-500">导出全部用户数据。如需筛选导出，请前往用户管理页面使用筛选器后导出。</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleUserExport}
            disabled={userExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {userExporting ? '导出中...' : '导出全部用户 CSV'}
          </button>
          <a href="/users" className="text-sm text-orange-600 hover:underline">
            前往用户管理 →
          </a>
        </div>
      </div>
    </div>
  )
}
