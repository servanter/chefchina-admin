import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'
import { z } from 'zod'

const TopicSchema = z.object({
  nameEn: z.string().min(1),
  nameZh: z.string().min(1),
  descEn: z.string().optional(),
  descZh: z.string().optional(),
  icon: z.string().optional(),
  coverImage: z.string().optional(),
  isHot: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
})

// GET /api/topics - 获取话题列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const isHotParam = searchParams.get('isHot')

    const where: any = {}
    if (isHotParam !== null) {
      where.isHot = isHotParam === 'true'
    }

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        include: {
          _count: {
            select: { recipes: true }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ],
        ...paginate(page, limit)
      }),
      prisma.topic.count({ where })
    ])

    return NextResponse.json(successResponse({
      topics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }))
  } catch (error) {
    return handleError(error)
  }
}

// POST /api/topics - 创建话题
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = TopicSchema.parse(body)

    const topic = await prisma.topic.create({
      data: validated,
      include: {
        _count: {
          select: { recipes: true }
        }
      }
    })

    return NextResponse.json(successResponse(topic), { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
