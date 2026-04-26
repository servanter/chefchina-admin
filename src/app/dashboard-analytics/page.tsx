'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  HeartIcon,
  StarIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

interface DashboardData {
  overview: {
    totalUsers: number
    newUsersInPeriod: number
    totalRecipes: number
    newRecipesInPeriod: number
    totalLikes: number
    likesInPeriod: number
    totalFavorites: number
    favoritesInPeriod: number
    totalComments: number
    commentsInPeriod: number
    interactionRate: string
  }
  topRecipes: any[]
  topAuthors: any[]
  dailyStats: Array<{
    date: string
    users: number
    recipes: number
    likes: number
    comments: number
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/dashboard?startDate=${startDate}&endDate=${endDate}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = () => {
    if (!data) return
    const csv = `Date,New Users,New Recipes,Likes,Comments\n${data.dailyStats
      .map(d => `${d.date},${d.users},${d.recipes},${d.likes},${d.comments}`)
      .join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard_${startDate}_${endDate}.csv`
    a.click()
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!data) {
    return <div className="p-8 text-center text-red-500">Failed to load data</div>
  }

  const { overview, topRecipes, topAuthors, dailyStats } = data

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">运营数据看板</h1>
        <div className="flex gap-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={exportData}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            导出 CSV
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<UserGroupIcon className="w-8 h-8" />}
          title="总用户数"
          value={overview.totalUsers}
          change={`+${overview.newUsersInPeriod}`}
          color="blue"
        />
        <StatCard
          icon={<DocumentTextIcon className="w-8 h-8" />}
          title="总菜谱数"
          value={overview.totalRecipes}
          change={`+${overview.newRecipesInPeriod}`}
          color="green"
        />
        <StatCard
          icon={<HeartIcon className="w-8 h-8" />}
          title="总点赞数"
          value={overview.totalLikes}
          change={`+${overview.likesInPeriod}`}
          color="red"
        />
        <StatCard
          icon={<StarIcon className="w-8 h-8" />}
          title="总收藏数"
          value={overview.totalFavorites}
          change={`+${overview.favoritesInPeriod}`}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<ChatBubbleLeftIcon className="w-8 h-8" />}
          title="总评论数"
          value={overview.totalComments}
          change={`+${overview.commentsInPeriod}`}
          color="purple"
        />
        <StatCard
          icon={<ChartBarIcon className="w-8 h-8" />}
          title="互动率"
          value={overview.interactionRate}
          subtitle="(点赞+收藏+评论)/菜谱数"
          color="indigo"
        />
      </div>

      {/* Daily Stats Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">最近 7 天趋势</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-4">日期</th>
                <th className="pb-4">新用户</th>
                <th className="pb-4">新菜谱</th>
                <th className="pb-4">点赞</th>
                <th className="pb-4">评论</th>
              </tr>
            </thead>
            <tbody>
              {dailyStats.map((stat) => (
                <tr key={stat.date} className="border-t">
                  <td className="py-3 text-sm">{stat.date}</td>
                  <td className="py-3 text-sm">{stat.users}</td>
                  <td className="py-3 text-sm">{stat.recipes}</td>
                  <td className="py-3 text-sm">{stat.likes}</td>
                  <td className="py-3 text-sm">{stat.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Recipes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">热门菜谱 Top 10</h2>
          <div className="space-y-4">
            {topRecipes.map((recipe, idx) => (
              <div key={recipe.id} className="flex items-center gap-4 border-b pb-3">
                <div className="text-2xl font-bold text-gray-400">#{idx + 1}</div>
                <div className="flex-1">
                  <div className="font-medium">{recipe.titleEn}</div>
                  <div className="text-sm text-gray-500">{recipe.titleZh}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    👁️ {recipe.viewCount} | ❤️ {recipe._count.likes} | ⭐ {recipe._count.favorites}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Authors */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">活跃作者 Top 10</h2>
          <div className="space-y-4">
            {topAuthors.map((author, idx) => (
              <div key={author.id} className="flex items-center gap-4 border-b pb-3">
                <div className="text-2xl font-bold text-gray-400">#{idx + 1}</div>
                <div className="flex-1">
                  <div className="font-medium">{author.name || author.email}</div>
                  <div className="text-sm text-gray-500">
                    Level {author.level}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    📝 {author._count.recipes} 菜谱 | 👥 {author._count.followers} 粉丝
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  icon, 
  title, 
  value, 
  change, 
  subtitle, 
  color 
}: { 
  icon: React.ReactNode
  title: string
  value: number | string
  change?: string
  subtitle?: string
  color: string
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div className="mt-4">
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-3xl font-bold mt-1">{value}</div>
        {change && (
          <div className="text-sm text-green-600 mt-1">{change} 新增</div>
        )}
        {subtitle && (
          <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  )
}
