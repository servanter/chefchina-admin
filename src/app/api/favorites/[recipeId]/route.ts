import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { createNotification, hasRecentNotification, DAY_MS } from '@/lib/notifications'
import { addUserExp } from '@/lib/exp'  // REQ-12.9
import { requireAuth } from '@/lib/auth-guard'
import { invalidateCache } from '@/lib/redis'

// POST /api/favorites/[recipeId] — toggle favorite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { recipeId } = await params

    const existing = await prisma.favorite.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    })

    if (existing) {
      await prisma.favorite.delete({ where: { userId_recipeId: { userId, recipeId } } })
      // 清除该用户的详情页缓存
      await invalidateCache([`recipe:detail-full:${recipeId}:${userId}`])
      return successResponse({ favorited: false })
    } else {
      await prisma.favorite.create({ data: { userId, recipeId } })
      // 清除该用户的详情页缓存
      await invalidateCache([`recipe:detail-full:${recipeId}:${userId}`])

      // Notify recipe author (de-duped by 24h/liker/recipe combo)
      try {
        const recipe = await prisma.recipe.findUnique({
          where: { id: recipeId },
          select: { authorId: true, titleEn: true, titleZh: true },
        })
        if (recipe && recipe.authorId !== userId) {
          // REQ-12.9: 作者获得经验值
          await addUserExp(recipe.authorId, 'get_favorite')
          
          // 四元组去重：(actorId, recipientId, type, resourceId)
          const recentlyNotified = await hasRecentNotification({
            userId: recipe.authorId,
            type: 'RECIPE_FAVORITED',
            actorId: userId,
            resourceId: recipeId,
            windowMs: DAY_MS,
          })
          if (!recentlyNotified) {
            const fromUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true },
            })
            const fromName = fromUser?.name ?? 'Someone'
            await createNotification({
              userId: recipe.authorId,
              type: 'RECIPE_FAVORITED',
              title: `${fromName} saved your recipe`,
              body: recipe.titleEn,
              actorId: userId,
              resourceId: recipeId,
              payload: {
                recipeId,
                recipeTitle: recipe.titleEn,
                recipeTitleZh: recipe.titleZh,
                fromUserId: userId,
              },
            })
          }
        }
      } catch (err) {
        console.warn('[notifications] RECIPE_FAVORITED create failed', err)
      }

      return successResponse({ favorited: true })
    }
  } catch (error) {
    return handleError(error)
  }
}

// GET /api/favorites/[recipeId]?userId=xxx
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params
    const userId = new URL(req.url).searchParams.get('userId')
    if (!userId) return errorResponse('userId is required', 400)

    const favorite = await prisma.favorite.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    })

    return successResponse({ favorited: !!favorite })
  } catch (error) {
    return handleError(error)
  }
}
