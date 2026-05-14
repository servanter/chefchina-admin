import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { createNotification, hasRecentNotification, DAY_MS } from '@/lib/notifications'
import { addUserExp } from '@/lib/exp'  // REQ-12.9
import { requireAuth, extractAuth } from '@/lib/auth-guard'
import { invalidateCache } from '@/lib/redis'

// POST /api/likes/[recipeId]  — toggle like
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { recipeId } = await params

    const existing = await prisma.like.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    })

    if (existing) {
      await prisma.like.delete({ where: { userId_recipeId: { userId, recipeId } } })
      const count = await prisma.like.count({ where: { recipeId } })
      // 清除该用户的详情页缓存
      await invalidateCache([`recipe:detail-full:${recipeId}:${userId}`])
      return successResponse({ liked: false, count })
    } else {
      await prisma.like.create({ data: { userId, recipeId } })
      const count = await prisma.like.count({ where: { recipeId } })
      // 清除该用户的详情页缓存
      await invalidateCache([`recipe:detail-full:${recipeId}:${userId}`])

      // Notify recipe author (but not the author themself, and de-dupe within 24h)
      try {
        const recipe = await prisma.recipe.findUnique({
          where: { id: recipeId },
          select: { authorId: true, titleEn: true, titleZh: true },
        })
        if (recipe && recipe.authorId !== userId) {
          // REQ-12.9: 作者获得经验值
          await addUserExp(recipe.authorId, 'get_like')
          
          // 四元组去重：(actorId, recipientId, type, resourceId)
          // → A 对 B 的多个不同菜谱点赞，每条都能收到；但 24h 内对同一菜谱重复 toggle 只发一条
          const recentlyNotified = await hasRecentNotification({
            userId: recipe.authorId,
            type: 'RECIPE_LIKED',
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
              type: 'RECIPE_LIKED',
              title: `${fromName} liked your recipe`,
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
        console.warn('[notifications] RECIPE_LIKED create failed', err)
      }

      return successResponse({ liked: true, count })
    }
  } catch (error) {
    return handleError(error)
  }
}

// GET /api/likes/[recipeId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params
    // 从 JWT token 获取 userId（可选）
    const auth = extractAuth(req)
    const userId = auth?.sub

    const [count, liked] = await Promise.all([
      prisma.like.count({ where: { recipeId } }),
      userId
        ? prisma.like.findUnique({ where: { userId_recipeId: { userId, recipeId } } })
        : null,
    ])

    return successResponse({ count, liked: !!liked })
  } catch (error) {
    return handleError(error)
  }
}
