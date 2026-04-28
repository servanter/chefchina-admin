import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'

// GET /api/search?q=xxx&type=all|recipe|user|topic&difficulty=easy|medium|hard&cookTime=<15|15-30|>30&sort=relevance|latest|popular&page=1&limit=20
// REQ-16.7: 搜索结果页优化（多类型 + 筛选）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const type = searchParams.get('type') || 'all'
    const difficulty = searchParams.get('difficulty')
    const cookTime = searchParams.get('cookTime')
    const sort = searchParams.get('sort') || 'relevance'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const skip = (page - 1) * limit

    if (!q) {
      return successResponse({
        recipes: [],
        users: [],
        topics: [],
        total: 0,
      })
    }

    const results: any = {
      recipes: [],
      users: [],
      topics: [],
      total: 0,
    }

    // 搜索菜谱
    if (type === 'all' || type === 'recipe') {
      const recipeWhere: any = {
        isPublished: true,
        OR: [
          { titleEn: { contains: q, mode: 'insensitive' } },
          { titleZh: { contains: q, mode: 'insensitive' } },
          { descriptionEn: { contains: q, mode: 'insensitive' } },
          { descriptionZh: { contains: q, mode: 'insensitive' } },
        ],
      }

      // REQ-16.7: 添加筛选条件
      if (difficulty) {
        recipeWhere.difficulty = difficulty.toUpperCase()
      }
      if (cookTime) {
        if (cookTime === '<15') {
          recipeWhere.cookTimeMin = { lt: 15 }
        } else if (cookTime === '15-30') {
          recipeWhere.cookTimeMin = { gte: 15, lte: 30 }
        } else if (cookTime === '>30') {
          recipeWhere.cookTimeMin = { gt: 30 }
        }
      }

      // 排序
      let orderBy: any = { createdAt: 'desc' }
      if (sort === 'latest') {
        orderBy = { createdAt: 'desc' }
      } else if (sort === 'popular') {
        orderBy = { viewCount: 'desc' }
      }

      results.recipes = await prisma.recipe.findMany({
        where: recipeWhere,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          category: {
            select: {
              id: true,
              nameEn: true,
              nameZh: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              favorites: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      })

      if (type === 'recipe') {
        results.total = await prisma.recipe.count({ where: recipeWhere })
      }
    }

    // 搜索用户
    if (type === 'all' || type === 'user') {
      const userWhere: any = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
        ],
      }

      results.users = await prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
          _count: {
            select: {
              recipes: true,
              followers: true,
            },
          },
        },
        skip: type === 'user' ? skip : 0,
        take: type === 'user' ? limit : 5,
      })

      if (type === 'user') {
        results.total = await prisma.user.count({ where: userWhere })
      }
    }

    // 搜索话题
    if (type === 'all' || type === 'topic') {
      const topicWhere: any = {
        OR: [
          { nameEn: { contains: q, mode: 'insensitive' } },
          { nameZh: { contains: q, mode: 'insensitive' } },
          { descriptionEn: { contains: q, mode: 'insensitive' } },
          { descriptionZh: { contains: q, mode: 'insensitive' } },
        ],
      }

      results.topics = await prisma.topic.findMany({
        where: topicWhere,
        include: {
          _count: {
            select: {
              recipes: true,
              followers: true,
            },
          },
        },
        skip: type === 'topic' ? skip : 0,
        take: type === 'topic' ? limit : 5,
      })

      if (type === 'topic') {
        results.total = await prisma.topic.count({ where: topicWhere })
      }
    }

    // 计算总数（type=all 时）
    if (type === 'all') {
      results.total = results.recipes.length + results.users.length + results.topics.length
    }

    return successResponse({
      ...results,
      pagination: {
        page,
        limit,
        total: results.total,
        totalPages: Math.ceil(results.total / limit),
        hasMore: skip + (results.recipes.length || results.users.length || results.topics.length) < results.total,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
