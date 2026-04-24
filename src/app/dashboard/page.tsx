'use client'

import { useEffect, useState } from 'react'

// ─── Types ───────────────────────────────────────────────
interface OverviewStats {
  recipes: {
    total: number
    published: number
    draft: number
    last7Days: number
    last30Days: number
  }
  users: {
    total: number
    last7Days: number
    last30Days: number
  }
  comments: {
    total: number
    last7Days: number
    last30Days: number
  }
  engagement: {
    totalLikes: number
    totalFavorites: number
    totalViews: number
    avgRating: number
  }
}

interface CategoryItem {
  id: string
  nameEn: string
  nameZh: string
  recipeCount: number
}

interface TopRecipe {
  id: string
  titleEn: string
  titleZh: string
  viewCount?: number
  likesCount: number
  commentsCount: number
  favoritesCount: number
}

interface TopUser {
  id: string
  name: string | null
  email: string
  avatar: string | null
  commentsCount: number
  recipesCount: number
  likesCount: number
  favoritesCount: number
}

interface DashboardData {
  overview: OverviewStats
  categoryDistribution: CategoryItem[]
  topRecipes: {
    byViews: TopRecipe[]
    byFavorites: TopRecipe[]
  }
  topUsers: {
    byComments: TopUser[]
    byRecipes: TopUser[]
  }
}

// ─── Stat Card Component ─────────────────────────────────
interface StatCardProps {
  title: string
  value: number
  change7d?: number
  change30d?: number
  icon: string
  colorClass: string
}

function StatCard({ title, value, change7d, change30d, icon, colorClass }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
          {(change7d !== undefined || change30d !== undefined) && (
            <div className="mt-2 space-y-1">
              {change7d !== undefined && (
                <p className="text-xs text-gray-500">
                  7天新增: <span className="font-medium text-green-600">+{change7d}</span>
                </p>
              )}
              {change30d !== undefined && (
                <p className="text-xs text-gray-500">
                  30天新增: <span className="font-medium text-blue-600">+{change30d}</span>
                </p>
              )}
            </div>
          )}
        </div>
        <div className={`text-4xl ${colorClass}`}>{icon}</div>
      </div>
    </div>
  )
}

// ─── Progress Bar Component ──────────────────────────────
function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const json = await res.json()
        setData(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Error Loading Dashboard</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    )
  }

  const maxRecipeCount = Math.max(...data.categoryDistribution.map((c) => c.recipeCount), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">数据看板 / Dashboard</h1>
        <p className="text-gray-600 mt-1">实时数据统计与分析</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="菜谱总数 / Recipes"
          value={data.overview.recipes.total}
          change7d={data.overview.recipes.last7Days}
          change30d={data.overview.recipes.last30Days}
          icon="📖"
          colorClass="text-orange-500"
        />
        <StatCard
          title="用户总数 / Users"
          value={data.overview.users.total}
          change7d={data.overview.users.last7Days}
          change30d={data.overview.users.last30Days}
          icon="👥"
          colorClass="text-blue-500"
        />
        <StatCard
          title="评论总数 / Comments"
          value={data.overview.comments.total}
          change7d={data.overview.comments.last7Days}
          change30d={data.overview.comments.last30Days}
          icon="💬"
          colorClass="text-green-500"
        />
        <StatCard
          title="互动总数 / Engagement"
          value={data.overview.engagement.totalLikes + data.overview.engagement.totalFavorites}
          icon="❤️"
          colorClass="text-red-500"
        />
      </div>

      {/* Engagement Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">总浏览量 / Total Views</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {data.overview.engagement.totalViews.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">总收藏 / Total Favorites</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {data.overview.engagement.totalFavorites.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">平均评分 / Avg Rating</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {data.overview.engagement.avgRating.toFixed(2)} ⭐
          </p>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">分类分布 / Category Distribution</h2>
        <div className="space-y-3">
          {data.categoryDistribution.slice(0, 10).map((category) => {
            const percent = (category.recipeCount / maxRecipeCount) * 100
            return (
              <div key={category.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {category.nameZh} / {category.nameEn}
                  </span>
                  <span className="text-sm text-gray-500">{category.recipeCount} 菜谱</span>
                </div>
                <ProgressBar percent={percent} color="bg-orange-500" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Recipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Views */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            热门菜谱（浏览量） / Top Recipes (Views)
          </h2>
          <div className="space-y-3">
            {data.topRecipes.byViews.slice(0, 10).map((recipe, idx) => (
              <div
                key={recipe.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {recipe.titleZh || recipe.titleEn}
                  </p>
                  <p className="text-xs text-gray-500">
                    👁️ {recipe.viewCount?.toLocaleString() || 0} · ❤️ {recipe.likesCount} · 💬{' '}
                    {recipe.commentsCount} · ⭐ {recipe.favoritesCount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Favorites */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            热门菜谱（收藏量） / Top Recipes (Favorites)
          </h2>
          <div className="space-y-3">
            {data.topRecipes.byFavorites.slice(0, 10).map((recipe, idx) => (
              <div
                key={recipe.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {recipe.titleZh || recipe.titleEn}
                  </p>
                  <p className="text-xs text-gray-500">
                    ⭐ {recipe.favoritesCount} · ❤️ {recipe.likesCount} · 💬 {recipe.commentsCount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Comments */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            活跃用户（评论数） / Active Users (Comments)
          </h2>
          <div className="space-y-3">
            {data.topUsers.byComments.slice(0, 10).map((user, idx) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    💬 {user.commentsCount} 评论 · 📖 {user.recipesCount} 菜谱 · ❤️{' '}
                    {user.likesCount} 点赞
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Recipes */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            活跃用户（菜谱数） / Active Users (Recipes)
          </h2>
          <div className="space-y-3">
            {data.topUsers.byRecipes.slice(0, 10).map((user, idx) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    📖 {user.recipesCount} 菜谱 · 💬 {user.commentsCount} 评论 · ⭐{' '}
                    {user.favoritesCount} 收藏
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
