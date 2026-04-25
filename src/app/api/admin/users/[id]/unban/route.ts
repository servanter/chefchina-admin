import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

type RouteParams = {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/users/[id]/unban — Unban a user
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
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
