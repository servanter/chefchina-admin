import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'
import { z } from 'zod'

const UserUpsertSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
  locale: z.string().default('en'),
})

// GET /api/users — list users with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 50)
    const search = searchParams.get('search')
    const { take, skip } = paginate(page, pageSize)

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

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

// POST /api/users — upsert (used on login/register)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = UserUpsertSchema.parse(body)

    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: { name: data.name, avatar: data.avatar },
      create: data,
    })

    return successResponse(user, 201)
  } catch (error) {
    return handleError(error)
  }
}
