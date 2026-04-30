import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'

// GET /api/tags/[id]/recipes?page=1&limit=20
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const limit = Number(searchParams.get('limit') || 20)
    const { take, skip } = paginate(page, limit)

    const tag = await prisma.tag.findUnique({
      where: { id },
      select: { id: true, nameEn: true, nameZh: true },
    })

    if (!tag) return errorResponse('Tag not found', 404)

    const where = {
      isPublished: true,
      tags: {
        some: {
          tagId: id,
        },
      },
    }

    const total = await prisma.recipe.count({ where })
    const recipes = await prisma.recipe.findMany({
      where,
      take,
      skip,
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
        author: { select: { id: true, name: true, avatar: true } },
        tags: {
          include: {
            tag: {
              select: { id: true, nameEn: true, nameZh: true },
            },
          },
        },
        _count: { select: { likes: true, comments: true, favorites: true } },
      },
    })

    const recipeIds = recipes.map((recipe) => recipe.id)
    const ratingStats = recipeIds.length
      ? await prisma.comment.groupBy({
          by: ['recipeId'],
          _avg: { rating: true },
          _count: { rating: true },
          where: {
            recipeId: { in: recipeIds },
            rating: { not: null },
          },
        })
      : []

    const ratingMap = new Map(
      ratingStats.map((item) => [
        item.recipeId,
        { avg: item._avg.rating ?? 0, count: item._count.rating },
      ])
    )

    return successResponse({
      tag,
      data: recipes.map((recipe) => ({
        ...recipe,
        avgRating: ratingMap.get(recipe.id)?.avg ?? 0,
        ratingsCount: ratingMap.get(recipe.id)?.count ?? 0,
      })),
      pagination: {
        page: Math.max(page, 1),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
