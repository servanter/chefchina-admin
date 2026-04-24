import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache, CACHE_TTL } from '@/lib/redis'
import { successResponse, errorResponse, handleError } from '@/lib/api'

/**
 * GET /api/recipes/[id]/related
 *
 * 返回同分类下（`categoryId` 相同）的其他已发布菜谱，按 `viewCount desc` 排序。
 * 排除当前菜谱自身；默认 6 条，调用方可用 `?limit=` 覆盖（1–20）。
 *
 * 需求 15：App 详情页底部"相关推荐"使用该接口。
 * 响应结构：`{ success: true, data: { items: BackendRecipe[] } }`
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const limitRaw = Number(searchParams.get('limit') ?? 6)
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 6, 1), 20)

    const current = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true, categoryId: true },
    })
    if (!current) return errorResponse('Recipe not found', 404)

    const cacheKey = `recipes:related:${id}:${limit}`
    const items = await withCache(cacheKey, CACHE_TTL.recipes, async () => {
      const recipes = await prisma.recipe.findMany({
        where: {
          isPublished: true,
          categoryId: current.categoryId,
          id: { not: current.id },
        },
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        include: {
          category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
          author: { select: { id: true, name: true, avatar: true } },
          tags: { include: { tag: true } },
          _count: { select: { likes: true, comments: true, favorites: true } },
        },
      })

      // 需求 15：相关推荐也要带 avgRating / ratingsCount（与 /api/recipes 一致的
      // ratingMap 逻辑，避免 App 端详情页底部的星级永远显示 0.0）
      const recipeIds = recipes.map((r) => r.id)
      const ratingStats = recipeIds.length > 0
        ? await prisma.comment.groupBy({
            by: ['recipeId'],
            _avg: { rating: true },
            _count: { rating: true },
            where: { recipeId: { in: recipeIds }, rating: { not: null } },
          })
        : []

      const ratingMap = new Map(
        ratingStats.map((s) => [s.recipeId, { avg: s._avg.rating ?? 0, count: s._count.rating }])
      )

      return recipes.map((r) => ({
        ...r,
        avgRating: ratingMap.get(r.id)?.avg ?? 0,
        ratingsCount: ratingMap.get(r.id)?.count ?? 0,
      }))
    })

    return successResponse({ items })
  } catch (error) {
    return handleError(error)
  }
}
