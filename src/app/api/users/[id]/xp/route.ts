import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireSelfOrAdmin } from '@/lib/auth-guard'

function calculateLevel(xp: number): number {
  if (xp >= 5000) return 5
  if (xp >= 1500) return 4
  if (xp >= 500) return 3
  if (xp >= 100) return 2
  return 1
}

// POST /api/users/[id]/xp — 增加 XP（内部调用），自动升级
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params

    // BUG-003 fix: JWT 鉴权
    const auth = requireSelfOrAdmin(req, userId)
    if (auth instanceof Response) return auth

    const body = await req.json()
    const { amount, reason } = body as { amount: number; reason?: string }

    if (!amount || amount <= 0) {
      return errorResponse('Invalid XP amount', 400)
    }

    // 用 as any 因 level/xp 字段未 prisma generate
    const user = await (prisma as any).user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
    })

    const newLevel = calculateLevel(user.xp)
    let leveledUp = false

    if (newLevel > user.level) {
      await (prisma as any).user.update({
        where: { id: userId },
        data: { level: newLevel },
      })
      leveledUp = true
    }

    return successResponse({
      xp: user.xp,
      level: leveledUp ? newLevel : user.level,
      leveledUp,
      reason: reason ?? null,
    })
  } catch (error) {
    return handleError(error)
  }
}
