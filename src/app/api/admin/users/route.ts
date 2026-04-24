import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'

// GET /api/admin/users — admin-only user list
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 50)
    const { take, skip } = paginate(page, pageSize)

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          locale: true,
          bio: true,
          createdAt: true,
          _count: { select: { recipes: true, comments: true, favorites: true } },
        },
      }),
      prisma.user.count(),
    ])

    return successResponse({
      users,
      pagination: { page, pageSize: take, total, totalPages: Math.ceil(total / take) },
    })
  } catch (error) {
    return handleError(error)
  }
}
