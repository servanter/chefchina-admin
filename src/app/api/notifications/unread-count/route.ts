import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth, requireSelfOrAdmin } from '@/lib/auth-guard'
import { NotificationType } from '@prisma/client'

// GET /api/notifications/unread-count?userId=xxx&type=all|like|comment|system
// REQ-16.2: 获取未读数量（按类型分组）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'all'

    if (!userId) return errorResponse('userId is required', 400)

    // 鉴权：必须登录，且 userId 必须是本人（或 ADMIN）
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const guard = requireSelfOrAdmin(req, userId, auth)
    if (guard instanceof Response) return guard

    // 定义类型映射
    const typeMap: Record<string, NotificationType[]> = {
      all: ['COMMENT_REPLY', 'RECIPE_LIKED', 'RECIPE_FAVORITED', 'SUBMISSION_APPROVED', 'SYSTEM'],
      like: ['RECIPE_LIKED', 'RECIPE_FAVORITED'],
      comment: ['COMMENT_REPLY'],
      system: ['SUBMISSION_APPROVED', 'SYSTEM'],
    }

    const types = typeMap[type] || typeMap.all

    // 批量查询各类型的未读数量
    const [allCount, likeCount, commentCount, systemCount] = await Promise.all([
      prisma.notification.count({
        where: { userId, readAt: null },
      }),
      prisma.notification.count({
        where: {
          userId,
          readAt: null,
          type: { in: ['RECIPE_LIKED', 'RECIPE_FAVORITED'] },
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          readAt: null,
          type: 'COMMENT_REPLY',
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          readAt: null,
          type: { in: ['SUBMISSION_APPROVED', 'SYSTEM'] },
        },
      }),
    ])

    return successResponse({
      all: allCount,
      like: likeCount,
      comment: commentCount,
      system: systemCount,
    })
  } catch (error) {
    return handleError(error)
  }
}
