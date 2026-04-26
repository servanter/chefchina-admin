import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 50)
    const search = searchParams.get('search')?.trim()
    const { take, skip } = paginate(page, pageSize)

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
      prisma.user.count({ where }),
    ])

    return successResponse({
      users,
      pagination: { page, pageSize: take, total, totalPages: Math.ceil(total / take) },
    })
  } catch (error) {
    return handleError(error)
  }
}
