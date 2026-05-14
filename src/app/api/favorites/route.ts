import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/favorites?userId=xxx — list all favorited recipes for a user
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        recipe: {
          include: {
            category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
            tags: { include: { tag: true } },
            _count: { select: { likes: true, comments: true, favorites: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const recipes = favorites.map((f) => f.recipe)

    // Compute avg ratings
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

    const recipesWithRatings = recipes.map((r) => ({
      ...r,
      avgRating: ratingMap.get(r.id)?.avg ?? 0,
      ratingsCount: ratingMap.get(r.id)?.count ?? 0,
    }))

    return successResponse({ recipes: recipesWithRatings })
  } catch (error) {
    return handleError(error)
  }
}
