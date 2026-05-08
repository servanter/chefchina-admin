import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { generateWeeklyAdvice } from '@/services/aiNutritionAdvice'

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

    // 生成 AI 建议
    const aiAdvice = profile
      ? await generateWeeklyAdvice(
          {
            goal: profile.goal,
            dailyCalories: profile.dailyCalories,
            proteinPercent: profile.proteinPercent,
            fatPercent: profile.fatPercent,
            carbsPercent: profile.carbsPercent,
          },
          {
            weekTotal,
            daysOnTarget,
            daysRecorded: Object.keys(dailyStats).length,
          }
        )
      : '请先设置健康档案'

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
      // ✅ 更新旧报告的 AI 建议
      report = await prisma.nutritionReport.update({
        where: { id: existingReport.id },
        data: {
          reportData,
          aiAdvice, // 使用最新生成的 AI 建议
        },
      })
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

    // 转换为前端期望的格式
    const dailyData: Array<{
      date: string
      calories: number
      protein: number
      onTrack: boolean
    }> = []

    // 生成迗七天的数据点
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      const stats = dailyStats[dateKey] || { calories: 0, protein: 0 }
      const diff = Math.abs(stats.calories - goalCalories)
      const onTrack = stats.calories > 0 && diff < goalCalories * 0.1

      dailyData.push({
        date: dateKey,
        calories: stats.calories,
        protein: stats.protein,
        onTrack,
      })
    }

    // 找出最佳/最差天
    const nonZeroDays = dailyData.filter((d) => d.calories > 0)
    let bestDay = weekStart.toISOString().split('T')[0]
    let worstDay = weekStart.toISOString().split('T')[0]

    if (nonZeroDays.length > 0) {
      // 最佳 = 最接近目标
      bestDay = nonZeroDays.sort(
        (a, b) =>
          Math.abs(a.calories - goalCalories) - Math.abs(b.calories - goalCalories)
      )[0].date

      // 最差 = 离目标最远
      worstDay = nonZeroDays.sort(
        (a, b) =>
          Math.abs(b.calories - goalCalories) - Math.abs(a.calories - goalCalories)
      )[0].date
    }

    return successResponse({
      summary: {
        daysOnTrack: daysOnTarget,
        avgCalories: Math.round(weekTotal.calories / Math.max(Object.keys(dailyStats).length, 1)),
        avgProtein: Math.round(weekTotal.protein / Math.max(Object.keys(dailyStats).length, 1)),
        bestDay,
        worstDay,
      },
      dailyData,
      aiSuggestions: aiAdvice ? [
        {
          content: typeof aiAdvice === 'string' ? aiAdvice : aiAdvice.content,
          source: typeof aiAdvice === 'string' ? 'rule' : aiAdvice.source
        }
      ] : [],
    })
  } catch (error) {
    return handleError(error)
  }
}
