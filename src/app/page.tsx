import Link from 'next/link'
import { headers } from 'next/headers'

// ─── Types ───────────────────────────────────────────────
interface Recipe {
  id: string
  titleEn: string
  titleZh: string
  isPublished: boolean
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  cookTimeMin: number
  createdAt: string
  coverImage?: string | null
  category: { nameEn: string; nameZh: string } | null
  author: { name: string | null } | null
  _count: { likes: number; comments: number }
}

interface ApiData {
  totalRecipes: number
  publishedRecipes: number
  totalUsers: number
  totalComments: number
  recentRecipes: Recipe[]
}

// ─── Data Fetching ────────────────────────────────────────
async function fetchDashboardData(): Promise<ApiData> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const base = `${protocol}://${host}`

  try {
    const [allRecipes, publishedRecipes, recentRecipes, usersRes] = await Promise.allSettled([
      fetch(`${base}/api/recipes?published=false&pageSize=1`, { cache: 'no-store' }),
      fetch(`${base}/api/recipes?published=true&pageSize=1`, { cache: 'no-store' }),
      fetch(`${base}/api/recipes?published=false&pageSize=5`, { cache: 'no-store' }),
      fetch(`${base}/api/admin/users?pageSize=1`, { cache: 'no-store' }),
    ])

    let totalRecipes = 0
    let published = 0
    let recentList: Recipe[] = []
    let totalUsers = 0
    let totalComments = 0

    if (allRecipes.status === 'fulfilled' && allRecipes.value.ok) {
      const d = await allRecipes.value.json()
      totalRecipes = d?.data?.pagination?.total ?? 0
    }
    if (publishedRecipes.status === 'fulfilled' && publishedRecipes.value.ok) {
      const d = await publishedRecipes.value.json()
      published = d?.data?.pagination?.total ?? 0
    }
    if (recentRecipes.status === 'fulfilled' && recentRecipes.value.ok) {
      const d = await recentRecipes.value.json()
      recentList = d?.data?.recipes ?? []
      // Derive total comments from the recipe list _count data
      totalComments = (recentList as Recipe[]).reduce(
        (sum, r) => sum + (r._count?.comments ?? 0),
        0
      )
    }
    if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
      const d = await usersRes.value.json()
      totalUsers = d?.data?.pagination?.total ?? 0
    }

    return {
      totalRecipes,
      publishedRecipes: published,
      totalUsers,
      totalComments,
      recentRecipes: recentList,
    }
  } catch {
    return {
      totalRecipes: 0,
      publishedRecipes: 0,
      totalUsers: 0,
      totalComments: 0,
      recentRecipes: [],
    }
  }
}

// ─── Difficulty Badge ─────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    EASY: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HARD: 'bg-red-100 text-red-700',
  }
  const label: Record<string, string> = { EASY: '简单', MEDIUM: '中等', HARD: '困难' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[difficulty] ?? difficulty}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────
function StatCard({
  title, value, subtitle, icon, color,
}: {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────
export default async function DashboardPage() {
  const data = await fetchDashboardData()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">首页概览</h1>
        <p className="text-sm text-gray-500 mt-0.5">欢迎使用 ChefChina 管理后台</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总菜谱数"
          value={data.totalRecipes}
          subtitle="全部菜谱"
          color="bg-blue-50"
          icon={
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          }
        />
        <StatCard
          title="已发布菜谱"
          value={data.publishedRecipes}
          subtitle={`共 ${data.totalRecipes} 道菜谱`}
          color="bg-green-50"
          icon={
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <StatCard
          title="总用户数"
          value={data.totalUsers}
          subtitle="注册用户"
          color="bg-purple-50"
          icon={
            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          }
        />
        <StatCard
          title="总评论数"
          value={data.totalComments}
          subtitle="用户留言"
          color="bg-orange-50"
          icon={
            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          }
        />
      </div>

      {/* Recent Recipes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">最近菜谱</h2>
          <Link
            href="/recipes"
            className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
          >
            查看全部
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        {data.recentRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-sm">暂无菜谱数据</p>
            <Link href="/recipes/new" className="mt-3 text-sm text-orange-500 hover:underline">
              去新增菜谱 →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recentRecipes.map((recipe) => (
              <div key={recipe.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                {/* Cover */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      recipe.coverImage ||
                      'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=64&h=64&fit=crop'
                    }
                    alt={recipe.titleZh}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{recipe.titleZh}</p>
                    <DifficultyBadge difficulty={recipe.difficulty} />
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {recipe.titleEn} · {recipe.category?.nameZh ?? '—'} · {recipe.cookTimeMin}分钟
                  </p>
                </div>
                {/* Status */}
                <div className="shrink-0 flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      recipe.isPublished
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {recipe.isPublished ? '已发布' : '草稿'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(recipe.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/recipes/new', label: '新增菜谱', color: 'bg-orange-500 hover:bg-orange-600', icon: '＋' },
          { href: '/categories', label: '管理分类', color: 'bg-blue-500 hover:bg-blue-600', icon: '🏷' },
          { href: '/comments', label: '查看评论', color: 'bg-purple-500 hover:bg-purple-600', icon: '💬' },
          { href: '/users', label: '用户列表', color: 'bg-slate-600 hover:bg-slate-700', icon: '👥' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`${action.color} text-white rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm`}
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
