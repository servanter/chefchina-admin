import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'

// GET /api/users/[id]/recipes?tab=published|liked&page=1&limit=20
// REQ-16.1: 获取用户的菜谱列表（本人：所有菜谱；他人：仅已发布）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const tab = searchParams.get('tab') || 'published'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const skip = (page - 1) * limit

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!user) return errorResponse('User not found', 404)

    let recipes = []
    let total = 0

    if (tab === 'liked') {
      // 获取用户点赞的菜谱
      const likes = await prisma.like.findMany({
        where: { userId: id },
        select: { recipe: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      })
      recipes = likes.map((like) => like.recipe)
      total = await prisma.like.count({ where: { userId: id } })
    } else {
      // 获取用户发布的菜谱（默认 tab='published'）
      const where = {
        authorId: id,
        isPublished: true,
      }
      recipes = await prisma.recipe.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      })
      total = await prisma.recipe.count({ where })
    }

    return successResponse({
      data: recipes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + recipes.length < total,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
