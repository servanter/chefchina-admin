import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'

// GET /api/users/[id]/favorites?page=1&limit=20
// REQ-16.1: 获取用户的收藏列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const skip = (page - 1) * limit

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!user) return errorResponse('User not found', 404)

    const favorites = await prisma.favorite.findMany({
      where: { userId: id },
      include: {
        recipe: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    const total = await prisma.favorite.count({ where: { userId: id } })

    return successResponse({
      data: favorites.map((fav) => fav.recipe),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + favorites.length < total,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
