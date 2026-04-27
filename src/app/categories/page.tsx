'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────
interface Category {
  id: string
  nameZh: string
  nameEn: string
  slug: string
  image?: string | null
  sortOrder: number
  createdAt: string
  _count: { recipes: number }
}

interface CategoryForm {
  nameZh: string
  nameEn: string
  slug: string
  sortOrder: number
  image: string
}

const emptyForm: CategoryForm = { nameZh: '', nameEn: '', slug: '', sortOrder: 0, image: '' }

// ─── Modal ────────────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  // null = closed, undefined = new, string = editing id
  const [editingId, setEditingId] = useState<string | null | undefined>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)

  const modalOpen = editingId !== null
  const isEditing = typeof editingId === 'string'

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/categories')
      const d = await res.json()
      setCategories(d?.data ?? [])
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Auto-generate slug from English name (only when creating new)
  const handleNameEnChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      nameEn: val,
      slug: isEditing
        ? prev.slug
        : prev.slug || val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }))
  }

  function openCreate() {
    setForm(emptyForm)
    setFormError(null)
    setEditingId(undefined) // undefined = new
  }

  function openEdit(cat: Category) {
    setForm({
      nameZh: cat.nameZh,
      nameEn: cat.nameEn,
      slug: cat.slug,
      sortOrder: cat.sortOrder,
      image: cat.image ?? '',
    })
    setFormError(null)
    setEditingId(cat.id) // string = editing
  }

  function closeModal() {
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.nameZh || !form.nameEn || !form.slug) {
      setFormError('请填写必填项')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        nameZh: form.nameZh,
        nameEn: form.nameEn,
        slug: form.slug,
        sortOrder: Number(form.sortOrder),
        ...(form.image ? { image: form.image } : {}),
      }

      let res: Response
      if (isEditing) {
        res = await api.patch(`/api/categories/${editingId}`, payload)
      } else {
        res = await api.post('/api/categories', payload)
      }

      const data = await res.json()
      if (!res.ok) {
        setFormError(data?.error ?? (isEditing ? '更新失败' : '创建失败'))
        return
      }
      closeModal()
      setForm(emptyForm)
      await fetchCategories()
    } catch {
      setFormError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确认删除分类「${name}」？若该分类下有菜谱，删除会失败。`)) return
    setDeletingId(id)
    try {
      const res = await api.delete(`/api/categories/${id}`)
      if (res.ok) {
        await fetchCategories()
      } else {
        const d = await res.json()
        alert(d?.error ?? '删除失败，该分类下可能存在菜谱')
      }
    } catch {
      alert('删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">分类管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {categories.length} 个分类</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新增分类
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">图标</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">名称</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">菜谱数</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">排序</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3.5"><div className="w-10 h-10 bg-gray-200 rounded-lg" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-200 rounded w-28 mb-1" /><div className="h-3 bg-gray-100 rounded w-20" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-5 py-3.5"><div className="h-5 bg-gray-200 rounded w-10" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-200 rounded w-8" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-5 py-3.5"><div className="h-8 bg-gray-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                      </svg>
                      <p>暂无分类数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    {/* Image */}
                    <td className="px-5 py-3.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-orange-50 flex items-center justify-center">
                        {cat.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cat.image} alt={cat.nameZh} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-orange-400 text-lg">🏷</span>
                        )}
                      </div>
                    </td>
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{cat.nameZh}</p>
                      <p className="text-xs text-gray-400">{cat.nameEn}</p>
                    </td>
                    {/* Slug */}
                    <td className="px-5 py-3.5">
                      <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                        {cat.slug}
                      </code>
                    </td>
                    {/* Recipe count */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {cat._count?.recipes ?? 0} 道
                      </span>
                    </td>
                    {/* Sort */}
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                      {cat.sortOrder}
                    </td>
                    {/* Date */}
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(cat.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit button */}
                        <button
                          onClick={() => openEdit(cat)}
                          title="编辑分类"
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(cat.id, cat.nameZh)}
                          disabled={deletingId === cat.id || (cat._count?.recipes ?? 0) > 0}
                          title={cat._count?.recipes > 0 ? '该分类下有菜谱，无法删除' : '删除分类'}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {deletingId === cat.id ? (
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
      </div>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={isEditing ? '编辑分类' : '新增分类'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              中文名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nameZh}
              onChange={(e) => setForm((p) => ({ ...p, nameZh: e.target.value }))}
              placeholder="例：川菜"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              英文名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => handleNameEnChange(e.target.value)}
              placeholder="e.g. Sichuan Cuisine"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Slug <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                }))
              }
              placeholder="sichuan-cuisine"
              required
              pattern="[a-z0-9-]+"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">只允许小写字母、数字和连字符</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">排序</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                min={0}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">图片 URL（可选）</label>
              <input
                type="url"
                value={form.image}
                onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  保存中...
                </>
              ) : isEditing ? (
                '保存修改'
              ) : (
                '创建分类'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
