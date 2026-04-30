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
  prepTime: z.number().int().positive().optional().nullable(),
  cookTimeMin: z.number().int().positive().optional().nullable(),
  servings: z.number().int().positive().optional().nullable(),
  calories: z.number().int().nonnegative().optional().nullable(),
  // 营养成分字段 (REQ-4.4)
  protein: z.number().nonnegative().optional().nullable(),
  fat: z.number().nonnegative().optional().nullable(),
  carbs: z.number().nonnegative().optional().nullable(),
  fiber: z.number().nonnegative().optional().nullable(),
  sodium: z.number().nonnegative().optional().nullable(),
  sugar: z.number().nonnegative().optional().nullable(),
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
  topicIds: z.array(z.string()).optional(),  // REQ-12.3: 话题关联
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
    const sort = searchParams.get('sort') // 'hot' | 'latest' | 'recommended' | 'popular'
    const tagId = searchParams.get('tagId')
    const topicId = searchParams.get('topicId')  // REQ-12.3

    const cacheKey = `recipes:${page}:${pageSize}:${categoryId}:${difficulty}:${search}:${published}:${sort}:${tagId}:${topicId}`

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
        ...(topicId && { topics: { some: { topicId } } }),  // REQ-12.3
      }

      const orderBy =
        sort === 'popular' || sort === 'hot'
          ? [{ viewCount: 'desc' as const }, { createdAt: 'desc' as const }]
          : { createdAt: 'desc' as const }

      const include = {
        category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
        author: { select: { id: true, name: true, avatar: true } },
        tags: { include: { tag: true } },
        topics: { include: { topic: true } },  // REQ-12.3
        _count: { select: { likes: true, comments: true, favorites: true } },
      }

      const total = await prisma.recipe.count({ where })

      if (sort === 'recommended') {
        const rankedRecipes = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT r.id
          FROM "recipes" r
          LEFT JOIN (
            SELECT
              c."recipeId",
              COALESCE(AVG(c.rating), 0) AS "avgRating",
              COUNT(c.rating) AS "ratingsCount"
            FROM "comments" c
            WHERE c.rating IS NOT NULL
            GROUP BY c."recipeId"
          ) ratings ON ratings."recipeId" = r.id
          WHERE r."isPublished" = ${published}
            AND (${categoryId}::text IS NULL OR r."categoryId" = ${categoryId})
            AND (${difficulty}::text IS NULL OR r."difficulty" = ${difficulty}::"Difficulty")
            AND (
              ${search}::text IS NULL
              OR r."titleEn" ILIKE ${search ? `%${search}%` : null}
              OR r."titleZh" ILIKE ${search ? `%${search}%` : null}
            )
            AND (
              ${tagId}::text IS NULL
              OR EXISTS (
                SELECT 1 FROM "recipe_tags" rt
                WHERE rt."recipeId" = r.id AND rt."tagId" = ${tagId}
              )
            )
            AND (
              ${topicId}::text IS NULL
              OR EXISTS (
                SELECT 1 FROM "recipe_topics" rtp
                WHERE rtp."recipeId" = r.id AND rtp."topicId" = ${topicId}
              )
            )
          ORDER BY
            (
              COALESCE(r."viewCount", 0) * 1 +
              COALESCE((
                SELECT COUNT(*) FROM "favorites" f WHERE f."recipeId" = r.id
              ), 0) * 8 +
              COALESCE((
                SELECT COUNT(*) FROM "likes" l WHERE l."recipeId" = r.id
              ), 0) * 5 +
              COALESCE((
                SELECT COUNT(*) FROM "comments" c2 WHERE c2."recipeId" = r.id
              ), 0) * 6 +
              COALESCE(ratings."avgRating", 0) * 10 +
              COALESCE(ratings."ratingsCount", 0) * 2
            ) DESC,
            r."createdAt" DESC
          LIMIT ${take} OFFSET ${skip}
        `

        const rankedIds = rankedRecipes.map((item) => item.id)
        const recipes = rankedIds.length
          ? await prisma.recipe.findMany({
              where: { id: { in: rankedIds } },
              include,
            })
          : []

        const ratingStats = rankedIds.length > 0
          ? await prisma.comment.groupBy({
              by: ['recipeId'],
              _avg: { rating: true },
              _count: { rating: true },
              where: { recipeId: { in: rankedIds }, rating: { not: null } },
            })
          : []

        const ratingMap = new Map(
          ratingStats.map((s) => [s.recipeId, { avg: s._avg.rating ?? 0, count: s._count.rating }])
        )
        const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]))

        const data = rankedIds
          .map((id) => {
            const recipe = recipeMap.get(id)
            if (!recipe) return null
            return {
              ...recipe,
              avgRating: ratingMap.get(id)?.avg ?? 0,
              ratingsCount: ratingMap.get(id)?.count ?? 0,
            }
          })
          .filter(Boolean)
        return {
          recipes: data,
          data,
          pagination: {
            page,
            limit: take,
            pageSize: take,
            total,
            totalPages: Math.ceil(total / take),
            hasMore: skip + data.length < total,
          },
        }
      }

      const recipes = await prisma.recipe.findMany({
        where,
        take,
        skip,
        orderBy,
        include,
      })

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

      const data = recipes.map((r) => ({
        ...r,
        avgRating: ratingMap.get(r.id)?.avg ?? 0,
        ratingsCount: ratingMap.get(r.id)?.count ?? 0,
      }))

      return {
        recipes: data,
        data,
        pagination: {
          page,
          limit: take,
          pageSize: take,
          total,
          totalPages: Math.ceil(total / take),
          hasMore: skip + data.length < total,
        },
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
    const normalizedBody = {
      ...body,
      prepTime: body.prepTime ?? null,
      cookTimeMin: body.cookTimeMin ?? body.cookTime ?? null,
      difficulty: body.difficulty ?? null,
    }
    const data = RecipeCreateSchema.parse(normalizedBody)
    const { steps, ingredients, tagIds, topicIds, ...recipeData } = data

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
        ...(topicIds && {
          topics: { create: topicIds.map(topicId => ({ topicId })) },
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
