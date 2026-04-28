import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth, requireSelfOrAdmin } from '@/lib/auth-guard'
import { NotificationType } from '@prisma/client'

// POST /api/notifications/mark-all-read?userId=xxx&type=all|like|comment|system
// REQ-16.2: 批量标记已读
export async function POST(req: NextRequest) {
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
    const typeMap: Record<string, NotificationType[] | undefined> = {
      all: undefined, // undefined 表示所有类型
      like: ['RECIPE_LIKED', 'RECIPE_FAVORITED'],
      comment: ['COMMENT_REPLY'],
      system: ['SUBMISSION_APPROVED', 'SYSTEM'],
    }

    const types = typeMap[type]

    // 批量更新
    const where: any = { userId, readAt: null }
    if (types) {
      where.type = { in: types }
    }

    const result = await prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    })

    return successResponse({
      updated: result.count,
    })
  } catch (error) {
    return handleError(error)
  }
}
