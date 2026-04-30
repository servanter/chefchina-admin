import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'

const getOrderBy = (sort: string) => {
  switch (sort) {
    case 'newest':
      return [{ createdAt: 'desc' as const }]
    case 'favorites':
      return [{ favorites: { _count: 'desc' as const } }, { createdAt: 'desc' as const }]
    case 'popular':
    default:
      return [{ viewCount: 'desc' as const }, { createdAt: 'desc' as const }]
  }
}

// GET /api/categories/[id]/recipes?page=1&limit=20&sort=newest|popular|favorites
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const limit = Number(searchParams.get('limit') || 20)
    const sort = searchParams.get('sort') || 'popular'
    const { take, skip } = paginate(page, limit)

    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        nameEn: true,
        nameZh: true,
        image: true,
        _count: { select: { recipes: true } },
      },
    })

    if (!category) return errorResponse('Category not found', 404)

    const where = {
      isPublished: true,
      categoryId: id,
    }

    const total = await prisma.recipe.count({ where })
    const recipes = await prisma.recipe.findMany({
      where,
      take,
      skip,
      orderBy: getOrderBy(sort),
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
      category: {
        id: category.id,
        nameEn: category.nameEn,
        nameZh: category.nameZh,
        icon: category.image,
        recipeCount: category._count.recipes,
      },
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
