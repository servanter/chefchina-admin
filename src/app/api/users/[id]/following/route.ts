import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'

// GET /api/users/[id]/following - 获取关注列表
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const { take, skip } = paginate(page, pageSize)

    const { id } = await params
    const userId = id

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              avatar: true,
              bio: true,
            },
          },
        },
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ])

    const data = following.map(f => f.following)
    const result = {
      following: data,
      data,
      pagination: {
        page,
        limit: take,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
        hasMore: skip + data.length < total,
      },
    }

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}
