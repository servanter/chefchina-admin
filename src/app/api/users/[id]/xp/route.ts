import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireSelfOrAdmin } from '@/lib/auth-guard'

function calculateLevel(exp: number): number {
  if (exp >= 5000) return 5
  if (exp >= 1500) return 4
  if (exp >= 500) return 3
  if (exp >= 100) return 2
  return 1
}

// POST /api/users/[id]/xp — 增加 EXP（内部调用），自动升级
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
      return errorResponse('Invalid EXP amount', 400)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { exp: { increment: amount } },
    })

    const newLevel = calculateLevel(user.exp)
    let leveledUp = false

    if (newLevel > user.level) {
      await prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      })
      leveledUp = true
    }

    return successResponse({
      exp: user.exp,
      level: leveledUp ? newLevel : user.level,
      leveledUp,
      reason: reason ?? null,
    })
  } catch (error) {
    return handleError(error)
  }
}
