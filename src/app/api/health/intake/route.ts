import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// POST /api/health/intake — 记录摄入
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const body = await req.json()
    const { recipeId, mealType, servings = 1.0 } = body

    // 验证
    if (!recipeId) {
      return errorResponse('recipeId is required', 400)
    }

    if (!mealType || !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      return errorResponse('Invalid mealType', 400)
    }

    if (servings <= 0 || servings > 10) {
      return errorResponse('servings must be between 0 and 10', 400)
    }

    // 获取菜谱营养数据
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        id: true,
        titleEn: true,
        titleZh: true,
        calories: true,
        protein: true,
        fat: true,
        carbs: true,
        fiber: true,
        sodium: true,
        sugar: true,
      },
    })

    if (!recipe) {
      return errorResponse('Recipe not found', 404)
    }

    // 检查营养数据是否完整
    if (!recipe.calories || !recipe.protein || !recipe.fat || !recipe.carbs) {
      return errorResponse('Recipe nutrition data is incomplete', 400)
    }

    // 计算营养值（考虑份数）
    const intake = await prisma.dailyIntake.create({
      data: {
        userId,
        date: new Date(),
        recipeId,
        mealType,
        servings,
        calories: recipe.calories * servings,
        protein: recipe.protein * servings,
        fat: recipe.fat * servings,
        carbs: recipe.carbs * servings,
        fiber: recipe.fiber ? recipe.fiber * servings : null,
        sodium: recipe.sodium ? recipe.sodium * servings : null,
        sugar: recipe.sugar ? recipe.sugar * servings : null,
      },
    })

    // 获取今日总计
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayIntakes = await prisma.dailyIntake.findMany({
      where: {
        userId,
        date: {
          gte: today,
        },
      },
    })

    const todayTotal = todayIntakes.reduce(
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

    return successResponse({
      intake,
      todayTotal,
    })
  } catch (error) {
    return handleError(error)
  }
}
