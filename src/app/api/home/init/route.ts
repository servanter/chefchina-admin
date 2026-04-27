import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'
import { withCache, CACHE_TTL } from '@/lib/redis'

/**
 * GET /api/home/init
 * 首页初始化接口：一次性返回首页所需的所有数据
 * 
 * 替代前端多次请求：
 * - /api/recipes?featured=true (精选菜谱)
 * - /api/recipes?difficulty=easy&limit=6 (快手菜)
 * - /api/ranking?period=week (周热榜)
 * - /api/categories (分类列表)
 * - /api/notifications/unread-count (未读通知)
 * 
 * 目的：减少首屏并发请求，加快加载速度，降低数据库连接压力
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') // 可选，用于查询未读通知

    // 匿名用户缓存 5 分钟，登录用户缓存 2 分钟
    const cacheKey = userId ? `home:init:${userId}` : 'home:init:guest'
    const cacheTTL = userId ? 60 * 2 : 60 * 5

    const data = await withCache(cacheKey, cacheTTL, async () => {
      // Batch 1: 基础数据（4 个查询）
      const [featured, quick, categories, ranking] = await Promise.all([
        // 精选菜谱（按浏览量排序，取前 3 条）
        prisma.recipe.findMany({
          where: {
            isPublished: true,
          },
          take: 3,
          orderBy: { viewCount: 'desc' },
          select: {
            id: true,
            titleEn: true,
            titleZh: true,
            coverImage: true,
            difficulty: true,
            cookTimeMin: true,
            servings: true,
            viewCount: true,
            _count: {
              select: {
                likes: true,
                favorites: true,
                comments: true,
              },
            },
          },
        }),

        // 快手菜（6 条）
        prisma.recipe.findMany({
          where: {
            isPublished: true,
            difficulty: 'EASY',
          },
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            titleEn: true,
            titleZh: true,
            coverImage: true,
            difficulty: true,
            cookTimeMin: true,
            servings: true,
            _count: {
              select: {
                likes: true,
                favorites: true,
              },
            },
          },
        }),

        // 分类列表
        prisma.category.findMany({
          orderBy: { nameEn: 'asc' },
          select: {
            id: true,
            nameEn: true,
            nameZh: true,
            _count: {
              select: {
                recipes: true,
              },
            },
          },
        }),

        // 周热榜 Top 5
        prisma.recipe.findMany({
          where: {
            isPublished: true,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          take: 5,
          orderBy: [
            { viewCount: 'desc' },
            { likes: { _count: 'desc' } },
          ],
          select: {
            id: true,
            titleEn: true,
            titleZh: true,
            coverImage: true,
            viewCount: true,
            _count: {
              select: {
                likes: true,
                favorites: true,
              },
            },
          },
        }),
      ])

      // Batch 2: 用户相关（如果提供了 userId）
      let unreadCount = 0
      if (userId) {
        unreadCount = await prisma.notification.count({
          where: {
            userId,
            readAt: null,  // 正确字段：readAt 为 null 表示未读
          },
        })
      }

      return {
        featured,
        quick,
        categories: categories.map((cat) => ({
          id: cat.id,
          nameEn: cat.nameEn,
          nameZh: cat.nameZh,
          recipesCount: cat._count.recipes,
        })),
        ranking: ranking.map(r => {
          const { _count, ...cleanR } = r;
          return {
            ...cleanR,
            likesCount: _count.likes,
            favoritesCount: _count.favorites,
          };
        }),
        unreadCount,
      }
    })

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}
