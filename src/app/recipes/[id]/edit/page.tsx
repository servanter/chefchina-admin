'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'

// ─── Types ────────────────────────────────────────────────
interface Category {
  id: string
  nameZh: string
  nameEn: string
}

interface StepField {
  id?: string
  contentZh: string
  contentEn: string
  titleZh?: string
  titleEn?: string
  image?: string
  durationMin?: number | string
  stepNumber?: number
}

interface IngredientField {
  id?: string
  nameZh: string
  nameEn: string
  amount: string
  unit?: string
  isOptional: boolean
}

interface FormValues {
  titleZh: string
  titleEn: string
  descriptionZh?: string
  descriptionEn?: string
  categoryId: string
  // 需求 15：以下 4 个 meta 字段均非必填，允许留空 → NULL。
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | ''
  cookTimeMin?: number | string
  servings?: number | string
  calories?: number | string
  coverImage?: string
  isPublished: boolean
  steps: StepField[]
  ingredients: IngredientField[]
}

// ─── UI Helpers ───────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-colors ${className}`}
    />
  )
}

function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-colors resize-none ${className}`}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────
export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string

  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingRecipe, setLoadingRecipe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      difficulty: '',
      cookTimeMin: '',
      servings: '',
      calories: '',
      isPublished: false,
      steps: [{ contentZh: '', contentEn: '' }],
      ingredients: [{ nameZh: '', nameEn: '', amount: '', isOptional: false }],
    },
  })

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({ control, name: 'steps' })

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({ control, name: 'ingredients' })

  // Fetch categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d?.data ?? []))
      .catch(() => {})
  }, [])

  // Fetch existing recipe data
  useEffect(() => {
    if (!recipeId) return
    setLoadingRecipe(true)
    fetch(`/api/recipes/${recipeId}`)
      .then((r) => r.json())
      .then((d) => {
        const recipe = d?.data
        if (!recipe) {
          setError('菜谱不存在或已删除')
          return
        }
        reset({
          titleZh: recipe.titleZh ?? '',
          titleEn: recipe.titleEn ?? '',
          descriptionZh: recipe.descriptionZh ?? '',
          descriptionEn: recipe.descriptionEn ?? '',
          categoryId: recipe.categoryId ?? '',
          // 需求 15：字段可能为 null → 映射为空字符串（select / input 的空态）
          difficulty: recipe.difficulty ?? '',
          cookTimeMin: recipe.cookTimeMin ?? '',
          servings: recipe.servings ?? '',
          calories: recipe.calories ?? '',
          coverImage: recipe.coverImage ?? '',
          isPublished: recipe.isPublished ?? false,
          steps: recipe.steps?.length > 0
            ? recipe.steps.map((s: StepField) => ({
                id: s.id,
                stepNumber: s.stepNumber,
                titleZh: s.titleZh ?? '',
                titleEn: s.titleEn ?? '',
                contentZh: s.contentZh ?? '',
                contentEn: s.contentEn ?? '',
                image: s.image ?? '',
                durationMin: s.durationMin ?? '',
              }))
            : [{ contentZh: '', contentEn: '' }],
          ingredients: recipe.ingredients?.length > 0
            ? recipe.ingredients.map((ing: IngredientField) => ({
                id: ing.id,
                nameZh: ing.nameZh ?? '',
                nameEn: ing.nameEn ?? '',
                amount: ing.amount ?? '',
                unit: ing.unit ?? '',
                isOptional: ing.isOptional ?? false,
              }))
            : [{ nameZh: '', nameEn: '', amount: '', isOptional: false }],
        })
      })
      .catch(() => setError('加载菜谱失败，请刷新重试'))
      .finally(() => setLoadingRecipe(false))
  }, [recipeId, reset])

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      // 需求 15：difficulty / cookTimeMin / servings / calories 全部改为可选。
      // 空字符串 → null（PATCH schema 中对应字段都有 .nullable()）。
      const toIntOrNull = (v: unknown): number | null => {
        if (v === '' || v === null || v === undefined) return null
        const n = Number(v)
        return Number.isFinite(n) ? n : null
      }

      const payload = {
        titleZh: values.titleZh,
        titleEn: values.titleEn,
        descriptionZh: values.descriptionZh || undefined,
        descriptionEn: values.descriptionEn || undefined,
        categoryId: values.categoryId,
        difficulty: values.difficulty || null,
        cookTimeMin: toIntOrNull(values.cookTimeMin),
        servings: toIntOrNull(values.servings),
        calories: toIntOrNull(values.calories),
        coverImage: values.coverImage || null,
        isPublished: values.isPublished,
        steps: values.steps.map((s, i) => ({
          stepNumber: i + 1,
          titleZh: s.titleZh || undefined,
          titleEn: s.titleEn || undefined,
          contentZh: s.contentZh,
          contentEn: s.contentEn,
          image: s.image || '',
          durationMin: toIntOrNull(s.durationMin) ?? undefined,
        })),
        ingredients: values.ingredients.map((ing) => ({
          nameZh: ing.nameZh,
          nameEn: ing.nameEn,
          amount: ing.amount,
          unit: ing.unit || undefined,
          isOptional: !!ing.isOptional,
        })),
      }

      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error ?? '保存失败，请检查表单后重试')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/recipes'), 1200)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const coverImageUrl = watch('coverImage')

  // Loading skeleton
  if (loadingRecipe) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-48 mt-2 animate-pulse" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">编辑菜谱</h1>
          <p className="text-sm text-gray-500 mt-0.5">修改菜谱基本信息，步骤和食材</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          返回
        </button>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <svg className="w-5 h-5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>保存成功！正在跳转回菜谱列表...</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <svg className="w-5 h-5 mt-0.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Basic Info ────────────────────────────────── */}
        <Section title="基本信息">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label required>中文标题</Label>
              <Input
                {...register('titleZh', { required: '请填写中文标题' })}
                placeholder="例：红烧肉"
              />
              {errors.titleZh && <p className="text-red-500 text-xs mt-1">{errors.titleZh.message}</p>}
            </div>
            <div>
              <Label required>英文标题</Label>
              <Input
                {...register('titleEn', { required: '请填写英文标题' })}
                placeholder="e.g. Red Braised Pork"
              />
              {errors.titleEn && <p className="text-red-500 text-xs mt-1">{errors.titleEn.message}</p>}
            </div>
            <div>
              <Label>中文描述</Label>
              <Textarea {...register('descriptionZh')} rows={3} placeholder="简短介绍这道菜..." />
            </div>
            <div>
              <Label>英文描述</Label>
              <Textarea {...register('descriptionEn')} rows={3} placeholder="Brief description..." />
            </div>
          </div>
        </Section>

        {/* ── Cover Image ───────────────────────────────── */}
        <Section title="封面图片">
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <Label>封面图 URL</Label>
              <Input
                {...register('coverImage')}
                placeholder="https://images.unsplash.com/..."
                type="url"
              />
              <p className="text-xs text-gray-400 mt-1">留空将使用默认占位图</p>
            </div>
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
              {coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImageUrl} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              )}
            </div>
          </div>
        </Section>

        {/* ── Category & Settings ───────────────────────── */}
        <Section title="分类与设置">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="col-span-2 md:col-span-1">
              <Label required>分类</Label>
              <select
                {...register('categoryId', { required: '请选择分类' })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 bg-white"
              >
                <option value="">请选择</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameZh}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
            </div>
            <div>
              <Label>难度</Label>
              <select
                {...register('difficulty')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 bg-white"
              >
                <option value="">未指定</option>
                <option value="EASY">简单</option>
                <option value="MEDIUM">中等</option>
                <option value="HARD">困难</option>
              </select>
            </div>
            <div>
              <Label>烹饪时间（分钟）</Label>
              <Input
                {...register('cookTimeMin', { min: 1 })}
                type="number"
                min={1}
                placeholder="30"
              />
            </div>
            <div>
              <Label>份数</Label>
              <Input
                {...register('servings', { min: 1 })}
                type="number"
                min={1}
                placeholder="2"
              />
            </div>
            <div>
              <Label>热量（kcal）</Label>
              <Input {...register('calories')} type="number" min={0} placeholder="可选" />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2.5 cursor-pointer w-fit">
              <input
                {...register('isPublished')}
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400/50 accent-orange-500"
              />
              <span className="text-sm text-gray-700 font-medium">立即发布</span>
              <span className="text-xs text-gray-400">（不勾选则保存为草稿）</span>
            </label>
          </div>
        </Section>

        {/* ── Ingredients ───────────────────────────────── */}
        <Section title="食材清单">
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_80px_80px_80px_40px] gap-2 text-xs text-gray-500 font-medium px-1">
              <span>中文名称</span>
              <span>英文名称</span>
              <span>用量</span>
              <span>单位</span>
              <span>可选</span>
              <span />
            </div>
            {ingredientFields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_80px_80px_80px_40px] gap-2 items-center">
                <Input
                  {...register(`ingredients.${i}.nameZh`, { required: true })}
                  placeholder="例：五花肉"
                />
                <Input
                  {...register(`ingredients.${i}.nameEn`, { required: true })}
                  placeholder="Pork belly"
                />
                <Input
                  {...register(`ingredients.${i}.amount`, { required: true })}
                  placeholder="500"
                />
                <Input {...register(`ingredients.${i}.unit`)} placeholder="g" />
                <div className="flex justify-center">
                  <input
                    {...register(`ingredients.${i}.isOptional`)}
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 accent-orange-500"
                    title="可选食材"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  disabled={ingredientFields.length === 1}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => appendIngredient({ nameZh: '', nameEn: '', amount: '', isOptional: false })}
            className="mt-3 flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            添加食材
          </button>
        </Section>

        {/* ── Steps ─────────────────────────────────────── */}
        <Section title="烹饪步骤">
          <div className="space-y-4">
            {stepFields.map((field, i) => (
              <div key={field.id} className="relative border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700">步骤 {i + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-gray-400">时长（分钟）</label>
                      <input
                        {...register(`steps.${i}.durationMin`)}
                        type="number"
                        min={0}
                        placeholder="可选"
                        className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      disabled={stepFields.length === 1}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>步骤标题（中文，可选）</Label>
                    <Input {...register(`steps.${i}.titleZh`)} placeholder="如：炒出焦糖色" />
                  </div>
                  <div>
                    <Label>步骤标题（English, optional）</Label>
                    <Input {...register(`steps.${i}.titleEn`)} placeholder="e.g. Caramelize" />
                  </div>
                  <div>
                    <Label required>步骤内容（中文）</Label>
                    <Textarea
                      {...register(`steps.${i}.contentZh`, { required: true })}
                      rows={3}
                      placeholder="详细描述这一步的操作..."
                    />
                  </div>
                  <div>
                    <Label required>步骤内容（English）</Label>
                    <Textarea
                      {...register(`steps.${i}.contentEn`, { required: true })}
                      rows={3}
                      placeholder="Describe this step in detail..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>步骤图片 URL（可选）</Label>
                    <Input
                      {...register(`steps.${i}.image`)}
                      placeholder="https://images.unsplash.com/..."
                      type="url"
                    />
                    <p className="text-xs text-gray-400 mt-1">编辑时会自动回填已有步骤图片，留空表示不设置</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => appendStep({ contentZh: '', contentEn: '' })}
            className="mt-3 flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            添加步骤
          </button>
        </Section>

        {/* ── Submit ────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                保存中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                保存修改
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
