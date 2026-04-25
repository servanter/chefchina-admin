import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

type RouteParams = {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/users/[id]/ban — Ban a user
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
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
