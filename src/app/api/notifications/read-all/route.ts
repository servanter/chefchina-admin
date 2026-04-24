import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth, requireSelfOrAdmin } from '@/lib/auth-guard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notif = (prisma as any).notification

// POST /api/notifications/read-all?userId=xxx
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    let userId = searchParams.get('userId')

    if (!userId) {
      try {
        const body = await req.json()
        userId = body?.userId ?? null
      } catch {
        // no body — ok
      }
    }

    if (!userId) return errorResponse('userId is required', 400)

    // 鉴权
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const guard = requireSelfOrAdmin(req, userId, auth)
    if (guard instanceof Response) return guard

    const result = await notif.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })

    return successResponse({ updated: result.count })
  } catch (error) {
    return handleError(error)
  }
}
