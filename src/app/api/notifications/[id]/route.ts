import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth, requireSelfOrAdmin } from '@/lib/auth-guard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notif = (prisma as any).notification

// PATCH /api/notifications/[id] — mark as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 先鉴权：必须登录
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const existing = await notif.findUnique({ where: { id } })
    if (!existing) return errorResponse('Notification not found', 404)

    // 只有通知的接收者或 ADMIN 能改
    const guard = requireSelfOrAdmin(req, existing.userId, auth)
    if (guard instanceof Response) return guard

    const updated = await notif.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    })
    return successResponse(updated)
  } catch (error) {
    return handleError(error)
  }
}

// DELETE /api/notifications/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const existing = await notif.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })
    if (!existing) return errorResponse('Notification not found', 404)

    const guard = requireSelfOrAdmin(req, existing.userId, auth)
    if (guard instanceof Response) return guard

    await notif.delete({ where: { id } })
    return successResponse({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
