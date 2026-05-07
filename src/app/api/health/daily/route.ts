import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/health/daily?date=2026-05-07 — 获取每日统计
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')

    let targetDate: Date
    if (dateParam) {
      targetDate = new Date(dateParam)
    } else {
      targetDate = new Date()
    }
    targetDate.setHours(0, 0, 0, 0)

    // 获取用户健康档案
    const profile = await prisma.userHealthProfile.findUnique({
      where: { userId },
    })

    // 获取当日摄入记录
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const meals = await prisma.dailyIntake.findMany({
      where: {
        userId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: {
        recipe: {
          select: {
            id: true,
            titleEn: true,
            titleZh: true,
            coverImage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 计算当日总计
    const current = meals.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        fat: acc.fat + item.fat,
        carbs: acc.carbs + item.carbs,
        fiber: acc.fiber + (item.fiber || 0),
        sodium: acc.sodium + (item.sodium || 0),
        sugar: acc.sugar + (item.sugar || 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, sugar: 0 }
    )

    // 计算目标值（基于健康档案）
    let goal = null
    if (profile) {
      goal = {
        calories: profile.dailyCalories,
        protein: Math.round((profile.dailyCalories * profile.proteinPercent) / 100 / 4), // 1g 蛋白质 = 4 kcal
        fat: Math.round((profile.dailyCalories * profile.fatPercent) / 100 / 9), // 1g 脂肪 = 9 kcal
        carbs: Math.round((profile.dailyCalories * profile.carbsPercent) / 100 / 4), // 1g 碳水 = 4 kcal
        fiber: profile.fiberMin || null,
        sodium: profile.sodiumLimit || null,
        sugar: profile.sugarLimit || null,
      }
    }

    return successResponse({
      date: targetDate.toISOString().split('T')[0],
      goal,
      current,
      meals: meals.map((m) => ({
        id: m.id,
        mealType: m.mealType,
        servings: m.servings,
        calories: m.calories,
        protein: m.protein,
        fat: m.fat,
        carbs: m.carbs,
        fiber: m.fiber,
        sodium: m.sodium,
        sugar: m.sugar,
        recipe: m.recipe,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}
