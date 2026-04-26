import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache, invalidateCache, CACHE_TTL } from '@/lib/redis'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const UpdateSchema = z.object({
  titleEn: z.string().min(1).optional(),
  titleZh: z.string().min(1).optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  coverImage: z.string().url().optional().nullable(),
  // 需求 15：以下四个字段均可留空（App 详情页按 null 隐藏对应 icon）
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().nullable(),
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
  isPublished: z.boolean().optional(),
  categoryId: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
  steps: z.array(z.object({
    stepNumber: z.number().int().positive(),
    titleEn: z.string().optional(),
    titleZh: z.string().optional(),
    contentEn: z.string().min(1),
    contentZh: z.string().min(1),
    image: z.string().url().optional().or(z.literal('')).transform((v) => v || undefined),
    durationMin: z.number().int().optional().nullable(),
  })).optional(),
  ingredients: z.array(z.object({
    nameEn: z.string().min(1),
    nameZh: z.string().min(1),
    amount: z.string().min(1),
    unit: z.string().optional(),
    isOptional: z.boolean().default(false),
  })).optional(),
  tagIds: z.array(z.string()).optional(),
  topicIds: z.array(z.string()).optional(),  // REQ-12.3
})

// GET /api/recipes/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const recipe = await withCache(`recipe:${id}`, CACHE_TTL.recipe, () =>
      prisma.recipe.findUnique({
        where: { id },
        include: {
          category: true,
          author: { select: { id: true, name: true, avatar: true, bio: true } },
          steps: { orderBy: { stepNumber: 'asc' } },
          ingredients: true,
          tags: { include: { tag: true } },
          topics: { include: { topic: true } },  // REQ-12.3
          _count: { select: { likes: true, comments: true, favorites: true } },
        },
      })
    )

    if (!recipe) return errorResponse('Recipe not found', 404)

    // Increment view count (fire and forget)
    prisma.recipe.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {})

    // Compute avg rating
    const ratingAgg = await prisma.comment.aggregate({
      where: { recipeId: id, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    })

    const recipeWithRating = {
      ...recipe,
      avgRating: ratingAgg._avg.rating ?? 0,
      ratingsCount: ratingAgg._count.rating ?? 0,
    }

    return successResponse(recipeWithRating)
  } catch (error) {
    return handleError(error)
  }
}

// PATCH /api/recipes/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 鉴权：必须登录，且必须是菜谱作者本人或 ADMIN
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    // 先查出 authorId 和 updatedAt，再做权限判断
    const existing = await prisma.recipe.findUnique({ where: { id }, select: { authorId: true, updatedAt: true } })
    if (!existing) return errorResponse('Recipe not found', 404)
    if (existing.authorId !== auth.sub && auth.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const body = await req.json()
    const data = UpdateSchema.parse(body)
    const { steps, ingredients, tagIds, topicIds, updatedAt: clientUpdatedAt, ...recipeData } = data

    // BUG-002: 乐观锁 — 客户端传入 updatedAt 与数据库比对
    if (clientUpdatedAt) {
      const dbTime = existing.updatedAt.toISOString()
      if (clientUpdatedAt !== dbTime) {
        return errorResponse('Conflict: recipe was modified by another user. Please refresh and try again.', 409)
      }
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ...(steps ? {
          steps: {
            deleteMany: {},
            create: steps.map((step) => ({
              ...step,
              durationMin: step.durationMin ?? undefined,
            })),
          },
        } : {}),
        ...(ingredients ? {
          ingredients: {
            deleteMany: {},
            create: ingredients,
          },
        } : {}),
        ...(tagIds ? {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        } : {}),
        ...(topicIds ? {
          topics: {
            deleteMany: {},
            create: topicIds.map((topicId) => ({ topicId })),
          },
        } : {}),
      },
      include: {
        category: true,
        author: { select: { id: true, name: true, avatar: true } },
        steps: { orderBy: { stepNumber: 'asc' } },
        ingredients: true,
        tags: { include: { tag: true } },
        topics: { include: { topic: true } },  // REQ-12.3
      },
    })

    await invalidateCache([`recipe:${id}`, 'recipes:*'])
    return successResponse(recipe)
  } catch (error) {
    return handleError(error)
  }
}

// DELETE /api/recipes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 鉴权：必须登录，且必须是菜谱作者本人或 ADMIN
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    // 先查出 authorId，再做权限判断
    const existing = await prisma.recipe.findUnique({ where: { id }, select: { authorId: true } })
    if (!existing) return errorResponse('Recipe not found', 404)
    if (existing.authorId !== auth.sub && auth.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    await prisma.recipe.delete({ where: { id } })
    await invalidateCache([`recipe:${id}`, 'recipes:*'])
    return successResponse({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
