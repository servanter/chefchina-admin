import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'
import { z } from 'zod'

// GET /api/dashboard - 运营数据看板
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // 验证日期参数
    const schema = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    })

    const validated = schema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate')
    })

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use ISO 8601 format (e.g., 2026-04-26T00:00:00Z)' },
        { status: 400 }
      )
    }

    const startDate = validated.data.startDate
      ? new Date(validated.data.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 默认最近30天
    const endDate = validated.data.endDate
      ? new Date(validated.data.endDate)
      : new Date()

    // 检查时间范围合理性
    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate must be before or equal to endDate' },
        { status: 400 }
      )
    }

    // 1. 用户统计
    const totalUsers = await prisma.user.count()
    const newUsersInPeriod = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 2. 菜谱统计
    const totalRecipes = await prisma.recipe.count({ where: { isPublished: true } })
    const newRecipesInPeriod = await prisma.recipe.count({
      where: {
        isPublished: true,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 3. 互动统计
    const totalLikes = await prisma.like.count()
    const totalFavorites = await prisma.favorite.count()
    const totalComments = await prisma.comment.count({ where: { isVisible: true } })

    const likesInPeriod = await prisma.like.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const favoritesInPeriod = await prisma.favorite.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const commentsInPeriod = await prisma.comment.count({
      where: {
        isVisible: true,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 4. 热门菜谱 Top 10
    const topRecipes = await prisma.recipe.findMany({
      where: { 
        isPublished: true,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { likes: true, favorites: true, comments: true }
        }
      },
      orderBy: { viewCount: 'desc' },
      take: 10
    })

    // 5. 活跃用户 Top 10（按发布菜谱数）
    const topAuthors = await prisma.user.findMany({
      where: {
        recipes: {
          some: {
            isPublished: true,
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      },
      include: {
        _count: {
          select: { 
            recipes: true,
            followers: true
          }
        }
      },
      orderBy: {
        recipes: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // 6. 每日统计（最近7天）
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const [users, recipes, likes, comments] = await Promise.all([
        prisma.user.count({
          where: { createdAt: { gte: date, lt: nextDate } }
        }),
        prisma.recipe.count({
          where: { 
            isPublished: true,
            createdAt: { gte: date, lt: nextDate } 
          }
        }),
        prisma.like.count({
          where: { createdAt: { gte: date, lt: nextDate } }
        }),
        prisma.comment.count({
          where: { 
            isVisible: true,
            createdAt: { gte: date, lt: nextDate } 
          }
        })
      ])

      last7Days.push({
        date: date.toISOString().split('T')[0],
        users,
        recipes,
        likes,
        comments
      })
    }

    // 7. 计算互动率
    const interactionRate = totalRecipes > 0 
      ? ((totalLikes + totalFavorites + totalComments) / totalRecipes).toFixed(2)
      : '0.00'

    return NextResponse.json(successResponse({
      overview: {
        totalUsers,
        newUsersInPeriod,
        totalRecipes,
        newRecipesInPeriod,
        totalLikes,
        likesInPeriod,
        totalFavorites,
        favoritesInPeriod,
        totalComments,
        commentsInPeriod,
        interactionRate
      },
      topRecipes,
      topAuthors,
      dailyStats: last7Days
    }))
  } catch (error) {
    return handleError(error)
  }
}
