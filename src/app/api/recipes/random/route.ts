import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

/**
 * GET /api/recipes/random?count=1&categoryId=xxx&difficulty=EASY
 * 随机返回 count 条已发布菜谱（默认 1 条）
 * 可选：categoryId 限定分类、difficulty 限定难度
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const count = Math.min(Number(searchParams.get('count') || 1), 10)
    const categoryId = searchParams.get('categoryId')
    const difficulty = searchParams.get('difficulty')

    const where: Record<string, unknown> = { isPublished: true }
    if (categoryId) where.categoryId = categoryId
    if (difficulty) where.difficulty = difficulty as 'EASY' | 'MEDIUM' | 'HARD'

    // 先拿总数，然后随机 skip
    const total = await prisma.recipe.count({ where })
    if (total === 0) {
      return successResponse({ recipes: [] })
    }

    const include = {
      category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
      tags: { include: { tag: true } },
      _count: { select: { likes: true, comments: true, favorites: true } },
    }

    // 随机选 count 条（用多次随机 skip 保证分散）
    const recipes = []
    const seen = new Set<string>()
    const maxAttempts = count * 3 // 防止死循环

    for (let attempt = 0; attempt < maxAttempts && recipes.length < count; attempt++) {
      const skip = Math.floor(Math.random() * total)
      const items = await prisma.recipe.findMany({
        where,
        include,
        skip,
        take: 1,
      })
      if (items.length > 0 && !seen.has(items[0].id)) {
        seen.add(items[0].id)

        // 补充 rating 聚合
        const ratingStats = await prisma.comment.aggregate({
          _avg: { rating: true },
          _count: { rating: true },
          where: { recipeId: items[0].id, rating: { not: null } },
        })

        recipes.push({
          ...items[0],
          avgRating: ratingStats._avg.rating ?? 0,
          ratingsCount: ratingStats._count.rating ?? 0,
        })
      }
    }

    return successResponse({ recipes })
  } catch (error) {
    return handleError(error)
  }
}
