import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'

// GET /api/users/[id]/comments?page=1&limit=20
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

    const where = { userId: id, isVisible: true }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          recipe: {
            select: {
              id: true,
              titleEn: true,
              titleZh: true,
              coverImage: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ])

    return successResponse({
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + comments.length < total,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
