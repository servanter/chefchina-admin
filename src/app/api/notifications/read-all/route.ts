import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth, requireSelfOrAdmin } from '@/lib/auth-guard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notif = (prisma as any).notification

// POST /api/notifications/read-all
export async function POST(req: NextRequest) {
  try {
    // 鉴权：从 JWT token 获取 userId
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const result = await notif.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })

    return successResponse({ updated: result.count })
  } catch (error) {
    return handleError(error)
  }
}
