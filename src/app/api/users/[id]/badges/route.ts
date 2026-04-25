import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'

// GET /api/users/[id]/badges — 返回用户已解锁徽章（公开）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params
    const userBadges = await (prisma as any).userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' },
    })
    return successResponse({
      badges: userBadges.map((ub: any) => ({
        ...ub.badge,
        unlockedAt: ub.unlockedAt,
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}
