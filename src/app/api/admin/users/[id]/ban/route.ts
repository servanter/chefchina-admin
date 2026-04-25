import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

type RouteParams = {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/users/[id]/ban — Ban a user
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const { id } = await params
    const { reason } = await req.json()

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: reason || 'No reason provided',
      },
      select: {
        id: true,
        email: true,
        name: true,
        isBanned: true,
        bannedAt: true,
        bannedReason: true,
      },
    })

    return successResponse({ user })
  } catch (error) {
    return handleError(error)
  }
}
