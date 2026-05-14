import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache, invalidateCache, CACHE_TTL } from '@/lib/redis'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'
import { createNotification } from '@/lib/notifications'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const CommentSchema = z.object({
  content: z.string().min(1).max(1000),
  rating: z.number().int().min(1).max(5).optional(),
  images: z.array(z.string()).max(9).optional(),
  recipeId: z.string(),
  userId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  replyToUserId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const recipeId = searchParams.get('recipeId')
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const showAll = searchParams.get('all') === 'true'
    const visibility = searchParams.get('visibility')
    const keyword = searchParams.get('keyword')?.trim()

    const { take, skip } = paginate(page, pageSize)

    const keywordFilter = keyword
      ? {
          OR: [
            { content: { contains: keyword, mode: 'insensitive' as const } },
            { user: { name: { contains: keyword, mode: 'insensitive' as const } } },
            { user: { email: { contains: keyword, mode: 'insensitive' as const } } },
          ],
        }
      : {}

    const visibilityFilter = showAll
      ? visibility === 'visible'
        ? { isVisible: true }
        : visibility === 'hidden'
          ? { isVisible: false }
          : {}
      : { isVisible: true }

    const where = {
      ...(recipeId ? { recipeId } : {}),
      parentId: null,
      ...visibilityFilter,
      ...keywordFilter,
    }

    const fetchData = async () => {
      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          take,
          skip,
          orderBy: { createdAt: 'asc' },
          include: {
            recipe: { select: { id: true, titleZh: true, titleEn: true } },
            user: { select: { id: true, name: true, avatar: true } },
            _count: {
              select: { likes: true },
            },
            replies: {
              where: showAll
                ? visibility === 'visible'
                  ? { isVisible: true }
                  : visibility === 'hidden'
                    ? { isVisible: false }
                    : {}
                : { isVisible: true },
              include: {
                user: { select: { id: true, name: true, avatar: true } },
                _count: {
                  select: { likes: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
        prisma.comment.count({ where }),
      ])
      return { comments, pagination: { page, pageSize: take, total, totalPages: Math.ceil(total / take) } }
    }

    if (!showAll && !recipeId) return errorResponse('recipeId is required', 400)

    const cacheKey = `comments:${recipeId ?? 'all'}:${page}:${visibility ?? 'default'}:${keyword ?? ''}`
    const result = showAll ? await fetchData() : await withCache(cacheKey, CACHE_TTL.recipes, fetchData)

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const body = await req.json()
    const parsed = CommentSchema.parse(body)
    const data = {
      ...parsed,
      userId,
      images: parsed.images ?? [],
      parentId: parsed.parentId ?? undefined,
      replyToUserId: parsed.replyToUserId ?? undefined,
    }

    if (data.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: data.parentId },
        select: { id: true, userId: true, recipeId: true },
      })
      if (!parent) {
        return errorResponse('Parent comment not found', 404)
      }
      if (parent.recipeId !== data.recipeId) {
        return errorResponse('parent comment does not belong to recipe', 400)
      }
    }

    const comment = await prisma.comment.create({
      data,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    })

    if (data.parentId) {
      try {
        const parent = await prisma.comment.findUnique({
          where: { id: data.parentId },
          select: { userId: true, recipeId: true },
        })
        if (parent && parent.userId !== userId) {
          const recipe = await prisma.recipe.findUnique({
            where: { id: parent.recipeId },
            select: { titleEn: true, titleZh: true },
          })
          const fromUser = comment.user?.name ?? 'Someone'
          const excerpt = data.content.length > 80
            ? `${data.content.slice(0, 80)}…`
            : data.content
          await createNotification({
            userId: parent.userId,
            type: 'COMMENT_REPLY',
            title: `${fromUser} replied to your comment`,
            body: excerpt,
            actorId: userId,
            resourceId: parent.recipeId,
            payload: {
              recipeId: parent.recipeId,
              recipeTitle: recipe?.titleEn ?? '',
              recipeTitleZh: recipe?.titleZh ?? '',
              commentId: comment.id,
              parentId: data.parentId,
              replyToUserId: data.replyToUserId ?? parent.userId,
              fromUserId: userId,
            },
          })
        }
      } catch (err) {
        console.warn('[notifications] COMMENT_REPLY create failed', err)
      }
    }

    await invalidateCache([`comments:${data.recipeId}:*`, 'comments:all:*', `recipe-detail-full:${data.recipeId}:*`])
    return successResponse(comment, 201)
  } catch (error) {
    return handleError(error)
  }
}
