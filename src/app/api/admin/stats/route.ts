import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'
import { withCache, CACHE_TTL } from '@/lib/redis'

/**
 * GET /api/admin/stats
 * 获取后台数据看板的总体统计信息
 * REQ-5.6: 数据看板（Admin 后台数据统计与分析）
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: 添加 admin 角色验证
    // const auth = requireAuth(req)
    // if (auth instanceof Response) return auth
    // if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const stats = await withCache('admin:stats', 60 * 5, async () => {
      const now = new Date()
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // 总体统计
      const [
        totalRecipes,
        publishedRecipes,
        draftRecipes,
        totalUsers,
        totalComments,
        totalLikes,
        totalFavorites,
        totalViews,
        avgRating,
        // 7天新增
        recipesLast7Days,
        usersLast7Days,
        commentsLast7Days,
        // 30天新增
        recipesLast30Days,
        usersLast30Days,
        commentsLast30Days,
      ] = await Promise.all([
        prisma.recipe.count(),
        prisma.recipe.count({ where: { isPublished: true } }),
        prisma.recipe.count({ where: { isPublished: false } }),
        prisma.user.count(),
        prisma.comment.count(),
        prisma.like.count(),
        prisma.favorite.count(),
        prisma.recipe.aggregate({ _sum: { viewCount: true } }),
        prisma.comment.aggregate({
          _avg: { rating: true },
          where: { rating: { not: null } },
        }),
        // 7天新增
        prisma.recipe.count({ where: { createdAt: { gte: last7Days } } }),
        prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
        prisma.comment.count({ where: { createdAt: { gte: last7Days } } }),
        // 30天新增
        prisma.recipe.count({ where: { createdAt: { gte: last30Days } } }),
        prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
        prisma.comment.count({ where: { createdAt: { gte: last30Days } } }),
      ])

      // 分类分布
      const categoryStats = await prisma.category.findMany({
        include: {
          _count: { select: { recipes: true } },
        },
      })

      // 按菜谱数量排序
      const sortedCategories = categoryStats.sort((a, b) => b._count.recipes - a._count.recipes)

      // 热门菜谱（按浏览量）
      const topRecipesByViews = await prisma.recipe.findMany({
        where: { isPublished: true },
        take: 10,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          titleEn: true,
          titleZh: true,
          viewCount: true,
          _count: { select: { likes: true, comments: true, favorites: true } },
        },
      })

      // 热门菜谱（按收藏量）
      const topRecipesByFavorites = await prisma.recipe.findMany({
        where: { isPublished: true },
        take: 10,
        orderBy: { favorites: { _count: 'desc' } },
        select: {
          id: true,
          titleEn: true,
          titleZh: true,
          _count: { select: { likes: true, comments: true, favorites: true } },
        },
      })

      // 活跃用户（按评论数）
      const topUsersByComments = await prisma.user.findMany({
        take: 10,
        orderBy: { comments: { _count: 'desc' } },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          _count: {
            select: {
              comments: true,
              recipes: true,
              likes: true,
              favorites: true,
            },
          },
        },
      })

      // 活跃用户（按菜谱数）
      const topUsersByRecipes = await prisma.user.findMany({
        take: 10,
        orderBy: { recipes: { _count: 'desc' } },
        where: { recipes: { some: {} } },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          _count: {
            select: {
              comments: true,
              recipes: true,
              likes: true,
              favorites: true,
            },
          },
        },
      })

      return {
        overview: {
          recipes: {
            total: totalRecipes,
            published: publishedRecipes,
            draft: draftRecipes,
            last7Days: recipesLast7Days,
            last30Days: recipesLast30Days,
          },
          users: {
            total: totalUsers,
            last7Days: usersLast7Days,
            last30Days: usersLast30Days,
          },
          comments: {
            total: totalComments,
            last7Days: commentsLast7Days,
            last30Days: commentsLast30Days,
          },
          engagement: {
            totalLikes,
            totalFavorites,
            totalViews: totalViews._sum.viewCount ?? 0,
            avgRating: Number(avgRating._avg.rating?.toFixed(2) ?? 0),
          },
        },
        categoryDistribution: sortedCategories.map((cat) => ({
          id: cat.id,
          nameEn: cat.nameEn,
          nameZh: cat.nameZh,
          recipeCount: cat._count.recipes,
        })),
        topRecipes: {
          byViews: topRecipesByViews.map((r) => ({
            id: r.id,
            titleEn: r.titleEn,
            titleZh: r.titleZh,
            viewCount: r.viewCount,
            likesCount: r._count.likes,
            commentsCount: r._count.comments,
            favoritesCount: r._count.favorites,
          })),
          byFavorites: topRecipesByFavorites.map((r) => ({
            id: r.id,
            titleEn: r.titleEn,
            titleZh: r.titleZh,
            likesCount: r._count.likes,
            commentsCount: r._count.comments,
            favoritesCount: r._count.favorites,
          })),
        },
        topUsers: {
          byComments: topUsersByComments.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            commentsCount: u._count.comments,
            recipesCount: u._count.recipes,
            likesCount: u._count.likes,
            favoritesCount: u._count.favorites,
          })),
          byRecipes: topUsersByRecipes.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            commentsCount: u._count.comments,
            recipesCount: u._count.recipes,
            likesCount: u._count.likes,
            favoritesCount: u._count.favorites,
          })),
        },
      }
    })

    return successResponse(stats)
  } catch (error) {
    return handleError(error)
  }
}
