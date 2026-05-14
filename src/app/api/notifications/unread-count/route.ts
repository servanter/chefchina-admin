import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth, requireSelfOrAdmin } from '@/lib/auth-guard'

// GET /api/notifications/unread-count?type=all|like|comment|system
// REQ-16.2: 获取未读数量（按类型分组）
export async function GET(req: NextRequest) {
  try {
    // 鉴权：从 JWT token 获取 userId
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all'

    // 定义类型映射
    const typeMap: Record<string, string[]> = {
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
