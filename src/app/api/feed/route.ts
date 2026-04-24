import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/feed - 获取关注用户的最新菜谱动态流
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const { take, skip } = paginate(page, pageSize)

    // 获取当前用户关注的所有用户 ID
    const followingUsers = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })

    const followingIds = followingUsers.map(f => f.followingId)

    // 如果没有关注任何人，返回空列表
    if (followingIds.length === 0) {
      return successResponse({
        recipes: [],
        pagination: { page, pageSize: take, total: 0, totalPages: 0 },
      })
    }

    // 获取关注用户发布的最新菜谱
    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where: {
          authorId: { in: followingIds },
          isPublished: true,
        },
        take,
        skip,
        orderBy: { createdAt: 'desc' },
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
              slug: true,
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
      }),
      prisma.recipe.count({
        where: {
          authorId: { in: followingIds },
          isPublished: true,
        },
      }),
    ])

    const result = {
      recipes,
      pagination: {
        page,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    }

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}
