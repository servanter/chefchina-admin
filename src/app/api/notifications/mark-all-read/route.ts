import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth, requireSelfOrAdmin } from '@/lib/auth-guard'

// POST /api/notifications/mark-all-read?type=all|like|comment|system
// REQ-16.2: 批量标记已读
export async function POST(req: NextRequest) {
  try {
    // 鉴权：从 JWT token 获取 userId
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all'

    // 定义类型映射
    const typeMap: Record<string, string[] | undefined> = {
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
