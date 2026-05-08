import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/health/profile — 获取用户健康档案
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const profile = await prisma.userHealthProfile.findUnique({
      where: { userId },
    })

    if (!profile) {
      return successResponse({ profile: null })
    }

    return successResponse({ profile })
  } catch (error) {
    return handleError(error)
  }
}

// POST /api/health/profile — 保存/更新健康档案
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const body = await req.json()
    const {
      goal,
      dailyCalories,
      proteinPercent,
      fatPercent,
      carbsPercent,
      sodiumLimit,
      sugarLimit,
      fiberMin,
      restrictions,
    } = body

    // 基础验证
    if (!goal || !['weight_loss', 'muscle_gain', 'maintain'].includes(goal)) {
      return errorResponse('Invalid goal', 400)
    }

    if (!dailyCalories || dailyCalories < 1200 || dailyCalories > 3000) {
      return errorResponse('dailyCalories must be between 1200-3000', 400)
    }

    if (!proteinPercent || !fatPercent || !carbsPercent) {
      return errorResponse('Nutrition percentages are required', 400)
    }

    // 验证营养比例总和为 100%
    const total = proteinPercent + fatPercent + carbsPercent
    if (Math.abs(total - 100) > 1) {
      return errorResponse('Nutrition percentages must sum to 100%', 400)
    }

    const profile = await prisma.userHealthProfile.upsert({
      where: { userId },
      create: {
        userId,
        goal,
        dailyCalories,
        proteinPercent,
        fatPercent,
        carbsPercent,
        sodiumLimit: sodiumLimit || null,
        sugarLimit: sugarLimit || null,
        fiberMin: fiberMin || null,
        restrictions: restrictions || [],
      },
      update: {
        goal,
        dailyCalories,
        proteinPercent,
        fatPercent,
        carbsPercent,
        sodiumLimit: sodiumLimit || null,
        sugarLimit: sugarLimit || null,
        fiberMin: fiberMin || null,
        restrictions: restrictions || [],
        updatedAt: new Date(),
      },
    })

    return successResponse({ profile })
  } catch (error) {
    return handleError(error)
  }
}
