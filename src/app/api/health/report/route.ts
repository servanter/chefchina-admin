import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/health/report?weekStart=2026-05-05 — 获取周报告
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { searchParams } = new URL(req.url)
    const weekStartParam = searchParams.get('weekStart')

    // 计算周一和周日
    let weekStart: Date
    if (weekStartParam) {
      weekStart = new Date(weekStartParam)
    } else {
      weekStart = new Date()
      const day = weekStart.getDay()
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1) // 调整到本周一
      weekStart.setDate(diff)
    }
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // 获取用户健康档案
    const profile = await prisma.userHealthProfile.findUnique({
      where: { userId },
    })

    // 获取本周摄入记录
    const weekIntakes = await prisma.dailyIntake.findMany({
      where: {
        userId,
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // 按天分组统计
    const dailyStats: Record<
      string,
      { calories: number; protein: number; fat: number; carbs: number }
    > = {}

    weekIntakes.forEach((intake) => {
      const dateKey = intake.date.toISOString().split('T')[0]
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { calories: 0, protein: 0, fat: 0, carbs: 0 }
      }
      dailyStats[dateKey].calories += intake.calories
      dailyStats[dateKey].protein += intake.protein
      dailyStats[dateKey].fat += intake.fat
      dailyStats[dateKey].carbs += intake.carbs
    })

    // 计算周总计
    const weekTotal = weekIntakes.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        fat: acc.fat + item.fat,
        carbs: acc.carbs + item.carbs,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    )

    // 计算达标天数
    const goalCalories = profile?.dailyCalories || 2000
    let daysOnTarget = 0
    Object.values(dailyStats).forEach((day) => {
      const diff = Math.abs(day.calories - goalCalories)
      if (diff < goalCalories * 0.1) {
        // 误差在 10% 以内算达标
        daysOnTarget++
      }
    })

    // Mock AI 建议（暂不实现真实 AI）
    const aiAdvice = generateMockAdvice(daysOnTarget, profile)

    // 生成报告数据
    const reportData = {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      dailyStats,
      weekTotal,
      weekAverage: {
        calories: Math.round(weekTotal.calories / 7),
        protein: Math.round(weekTotal.protein / 7),
        fat: Math.round(weekTotal.fat / 7),
        carbs: Math.round(weekTotal.carbs / 7),
      },
      daysOnTarget,
      daysRecorded: Object.keys(dailyStats).length,
    }

    // 检查是否已有报告
    const existingReport = await prisma.nutritionReport.findFirst({
      where: {
        userId,
        weekStart,
      },
    })

    let report
    if (existingReport) {
      report = existingReport
    } else {
      // 创建新报告（仅当有数据时）
      if (weekIntakes.length > 0) {
        report = await prisma.nutritionReport.create({
          data: {
            userId,
            weekStart,
            weekEnd,
            reportData,
            aiAdvice,
          },
        })
      }
    }

    return successResponse({
      report: report || null,
      reportData,
      aiAdvice,
    })
  } catch (error) {
    return handleError(error)
  }
}

// 生成 Mock AI 建议
function generateMockAdvice(
  daysOnTarget: number,
  profile: { goal: string } | null
): string {
  if (daysOnTarget >= 5) {
    return '太棒了！本周你有 ${daysOnTarget} 天达到了目标，保持这个节奏！💪'
  } else if (daysOnTarget >= 3) {
    return '不错的进步！本周有 ${daysOnTarget} 天达标，继续努力！'
  } else {
    const goal = profile?.goal || 'maintain'
    const tips: Record<string, string> = {
      weight_loss: '建议：尝试增加高蛋白低热量食物，如鸡胸肉、鱼类和豆腐。',
      muscle_gain: '建议：增加蛋白质摄入，推荐多吃瘦肉、鸡蛋和乳制品。',
      maintain: '建议：保持均衡饮食，多样化食材选择。',
    }
    return `本周记录了 ${daysOnTarget} 天。${tips[goal] || tips.maintain}`
  }
}
