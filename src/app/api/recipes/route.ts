import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache, invalidateCache, CACHE_TTL } from '@/lib/redis'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const RecipeCreateSchema = z.object({
  titleEn: z.string().min(1),
  titleZh: z.string().min(1),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  coverImage: z.string().url().optional(),
  // 需求 15：4 个 meta 字段均允许未填（落 NULL）。
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().nullable(),
  cookTimeMin: z.number().int().positive().optional().nullable(),
  servings: z.number().int().positive().optional().nullable(),
  calories: z.number().int().nonnegative().optional().nullable(),
  isPublished: z.boolean().default(false),
  // authorId 由服务端从 token 注入，不再信任 body 传入的值
  categoryId: z.string(),
  steps: z.array(z.object({
    stepNumber: z.number().int().positive(),
    titleEn: z.string().optional(),
    titleZh: z.string().optional(),
    contentEn: z.string().min(1),
    contentZh: z.string().min(1),
    image: z.string().url().optional(),
    durationMin: z.number().int().optional(),
  })).optional(),
  ingredients: z.array(z.object({
    nameEn: z.string().min(1),
    nameZh: z.string().min(1),
    amount: z.string().min(1),
    unit: z.string().optional(),
    isOptional: z.boolean().default(false),
  })).optional(),
  tagIds: z.array(z.string()).optional(),
})

// GET /api/recipes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const categoryId = searchParams.get('categoryId')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search')
    const published = searchParams.get('published') !== 'false'
    const sort = searchParams.get('sort') // 'hot' | undefined
    const tagId = searchParams.get('tagId')

    const cacheKey = `recipes:${page}:${pageSize}:${categoryId}:${difficulty}:${search}:${published}:${sort}:${tagId}`

    const result = await withCache(cacheKey, CACHE_TTL.recipes, async () => {
      const { take, skip } = paginate(page, pageSize)
      const where = {
        ...(published && { isPublished: true }),
        ...(categoryId && { categoryId }),
        ...(difficulty && { difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD' }),
        ...(search && {
          OR: [
            { titleEn: { contains: search, mode: 'insensitive' as const } },
            { titleZh: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        ...(tagId && { tags: { some: { tagId } } }),
      }

      const [recipes, total] = await Promise.all([
        prisma.recipe.findMany({
          where,
          take,
          skip,
          orderBy: sort === 'hot'
            ? [{ viewCount: 'desc' }, { createdAt: 'desc' }]
            : { createdAt: 'desc' },
          include: {
            category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
            author: { select: { id: true, name: true, avatar: true } },
            tags: { include: { tag: true } },
            _count: { select: { likes: true, comments: true, favorites: true } },
          },
        }),
        prisma.recipe.count({ where }),
      ])

      // Compute avg ratings for all returned recipes
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

      return {
        recipes: recipesWithRatings,
        pagination: { page, pageSize: take, total, totalPages: Math.ceil(total / take) },
      }
    })

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}

// POST /api/recipes
export async function POST(req: NextRequest) {
  try {
    // 鉴权：必须登录；authorId 从 token 读，不信任 body
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const body = await req.json()
    const data = RecipeCreateSchema.parse(body)
    const { steps, ingredients, tagIds, ...recipeData } = data

    const recipe = await prisma.recipe.create({
      data: {
        ...recipeData,
        authorId: auth.sub,   // ← 强制使用已验证的身份，忽略 body 里任何 authorId
        ...(steps && {
          steps: { create: steps },
        }),
        ...(ingredients && {
          ingredients: { create: ingredients },
        }),
        ...(tagIds && {
          tags: { create: tagIds.map(tagId => ({ tagId })) },
        }),
      },
      include: {
        steps: true,
        ingredients: true,
        tags: { include: { tag: true } },
        category: true,
        author: { select: { id: true, name: true, avatar: true } },
      },
    })

    await invalidateCache(['recipes:*'])
    return successResponse(recipe, 201)
  } catch (error) {
    return handleError(error)
  }
}
