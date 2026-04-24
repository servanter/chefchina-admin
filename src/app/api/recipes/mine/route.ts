import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const status = searchParams.get('status')

    const { take, skip } = paginate(page, pageSize)

    const where = {
      authorId: auth.sub,
      ...(status === 'published' ? { isPublished: true } : {}),
      ...(status === 'draft' ? { isPublished: false } : {}),
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        take,
        skip,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
          author: { select: { id: true, name: true, avatar: true } },
          tags: { include: { tag: true } },
          _count: { select: { likes: true, comments: true, favorites: true } },
        },
      }),
      prisma.recipe.count({ where }),
    ])

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

    const items = recipes.map((r) => ({
      ...r,
      avgRating: ratingMap.get(r.id)?.avg ?? 0,
      ratingsCount: ratingMap.get(r.id)?.count ?? 0,
      status: r.isPublished ? 'published' : 'draft',
    }))

    return successResponse({
      recipes: items,
      pagination: { page, pageSize: take, total, totalPages: Math.ceil(total / take) },
    })
  } catch (error) {
    return handleError(error)
  }
}
