import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

type RouteParams = {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/users/[id]/unban — Unban a user
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const { id } = await params

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedReason: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isBanned: true,
      },
    })

    return successResponse({ user })
  } catch (error) {
    return handleError(error)
  }
}
