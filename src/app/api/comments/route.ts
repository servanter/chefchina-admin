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
  images: z.array(z.string()).max(9).optional(), // 最多 9 张图片
  recipeId: z.string(),
  userId: z.string().optional(),
  parentId: z.string().optional(),
})

// GET /api/comments?recipeId=xxx&all=true (admin: show all including hidden)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const recipeId = searchParams.get('recipeId')
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    // When `all=true` is passed (admin view), return all comments regardless of visibility
    const showAll = searchParams.get('all') === 'true'

    if (!recipeId) return errorResponse('recipeId is required', 400)

    // Skip cache for admin "show all" queries to avoid stale hidden-comment data
    const fetchData = async () => {
      const { take, skip } = paginate(page, pageSize)
      const visibilityFilter = showAll ? {} : { isVisible: true }
      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where: { recipeId, parentId: null, ...visibilityFilter },
          take,
          skip,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            replies: {
              where: showAll ? {} : { isVisible: true },
              include: { user: { select: { id: true, name: true, avatar: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
        prisma.comment.count({ where: { recipeId, parentId: null, ...visibilityFilter } }),
      ])
      return { comments, pagination: { page, pageSize: take, total, totalPages: Math.ceil(total / take) } }
    }

    const cacheKey = `comments:${recipeId}:${page}`
    const result = showAll
      ? await fetchData()
      : await withCache(cacheKey, CACHE_TTL.recipes, fetchData)

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}

// POST /api/comments
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const body = await req.json()
    const parsed = CommentSchema.parse(body)
    const data = { ...parsed, userId }

    const comment = await prisma.comment.create({
      data,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Fire-and-forget: if this is a reply, notify the author of the parent comment.
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
              fromUserId: userId,
            },
          })
        }
      } catch (err) {
        console.warn('[notifications] COMMENT_REPLY create failed', err)
      }
    }

    await invalidateCache([`comments:${data.recipeId}:*`])
    return successResponse(comment, 201)
  } catch (error) {
    return handleError(error)
  }
}
