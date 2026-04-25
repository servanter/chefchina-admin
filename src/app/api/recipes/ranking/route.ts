import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/redis'
import { successResponse, handleError } from '@/lib/api'

/**
 * GET /api/recipes/ranking?period=week
 *
 * 按过去 7 天 (likes + favorites*2 + comments*3) 加权排序，取 Top 10
 * Redis 缓存 1 小时
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'week'

    const days = period === 'month' ? 30 : 7
    const cacheKey = `ranking:${period}`
    const cacheTTL = 60 * 60 // 1 hour

    const result = await withCache(cacheKey, cacheTTL, async () => {
      const since = new Date()
      since.setDate(since.getDate() - days)

      // Raw SQL for weighted ranking
      const ranked = await prisma.$queryRaw<
        Array<{
          id: string
          titleEn: string
          titleZh: string
          descriptionEn: string | null
          descriptionZh: string | null
          coverImage: string | null
          difficulty: string | null
          cookTimeMin: number | null
          servings: number | null
          calories: number | null
          isPublished: boolean
          categoryId: string
          createdAt: Date
          likes_count: bigint
          favorites_count: bigint
          comments_count: bigint
          score: bigint
        }>
      >`
        SELECT
          r.id,
          r."titleEn",
          r."titleZh",
          r."descriptionEn",
          r."descriptionZh",
          r."coverImage",
          r."difficulty",
          r."cookTimeMin",
          r.servings,
          r.calories,
          r."isPublished",
          r."categoryId",
          r."createdAt",
          COALESCE(lk.cnt, 0) AS likes_count,
          COALESCE(fv.cnt, 0) AS favorites_count,
          COALESCE(cm.cnt, 0) AS comments_count,
          (
            COALESCE(lk.cnt, 0) * 1 +
            COALESCE(fv.cnt, 0) * 2 +
            COALESCE(cm.cnt, 0) * 3
          ) AS score
        FROM "recipes" r
        LEFT JOIN (
          SELECT "recipeId", COUNT(*) AS cnt
          FROM "likes"
          WHERE "createdAt" >= ${since}
          GROUP BY "recipeId"
        ) lk ON lk."recipeId" = r.id
        LEFT JOIN (
          SELECT "recipeId", COUNT(*) AS cnt
          FROM "favorites"
          WHERE "createdAt" >= ${since}
          GROUP BY "recipeId"
        ) fv ON fv."recipeId" = r.id
        LEFT JOIN (
          SELECT "recipeId", COUNT(*) AS cnt
          FROM "comments"
          WHERE "createdAt" >= ${since}
          GROUP BY "recipeId"
        ) cm ON cm."recipeId" = r.id
        WHERE r."isPublished" = true
        ORDER BY score DESC, r."createdAt" DESC
        LIMIT 10
      `

      if (ranked.length === 0) {
        return { recipes: [] }
      }

      const recipeIds = ranked.map((r) => r.id)

      // Fetch full recipe objects with includes
      const recipes = await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
        include: {
          category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
          tags: { include: { tag: true } },
          _count: { select: { likes: true, comments: true, favorites: true } },
        },
      })

      // Get rating stats
      const ratingStats = await prisma.comment.groupBy({
        by: ['recipeId'],
        _avg: { rating: true },
        _count: { rating: true },
        where: { recipeId: { in: recipeIds }, rating: { not: null } },
      })

      const ratingMap = new Map(
        ratingStats.map((s) => [
          s.recipeId,
          { avg: s._avg.rating ?? 0, count: s._count.rating },
        ]),
      )

      const recipeMap = new Map(recipes.map((r) => [r.id, r]))

      // Preserve ranking order
      const result = ranked
        .map((r, index) => {
          const recipe = recipeMap.get(r.id)
          if (!recipe) return null
          return {
            ...recipe,
            avgRating: ratingMap.get(r.id)?.avg ?? 0,
            ratingsCount: ratingMap.get(r.id)?.count ?? 0,
            rank: index + 1,
            score: Number(r.score),
          }
        })
        .filter(Boolean)

      return { recipes: result }
    })

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}
