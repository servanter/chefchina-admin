import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { Prisma } from '../../../../generated/prisma'

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const search = searchParams.get('search')?.trim()
    const role = searchParams.get('role')?.trim()
    const status = searchParams.get('status')?.trim()
    const startDate = searchParams.get('startDate')?.trim()
    const endDate = searchParams.get('endDate')?.trim()
    const { take, skip } = paginate(page, pageSize)

    // Build where clause
    const where: Prisma.UserWhereInput = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search } },
      ]
    }

    if (role && (role === 'USER' || role === 'ADMIN')) {
      where.role = role
    }

    if (status === 'banned') {
      where.isBanned = true
    } else if (status === 'active') {
      where.isBanned = false
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

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
          isBanned: true,
          bannedAt: true,
          bannedReason: true,
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
