import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'

// GET /api/users/[id]/followers - 获取粉丝列表
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const { take, skip } = paginate(page, pageSize)

    const { id } = await params
    const userId = id

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              avatar: true,
              bio: true,
            },
          },
        },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ])

    const data = followers.map(f => f.follower)
    const result = {
      followers: data,
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
