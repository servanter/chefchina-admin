import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const CreateReportSchema = z.object({
  targetType: z.enum(['RECIPE', 'COMMENT']),
  targetId: z.string().min(1),
  reason: z.enum(['SPAM', 'INAPPROPRIATE', 'COPYRIGHT', 'HARMFUL', 'OTHER']),
  description: z.string().max(500).optional(),
})

// POST /api/reports — 用户提交举报（需鉴权）
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    // BUG-005: 举报接口限流 — 5 次/分钟（IP + userId 维度）
    const ip = getClientIp(req)
    const rlResult = await rateLimit(ip, { bucket: `report:${auth.sub}`, limit: 5, windowSeconds: 60 })
    if (!rlResult.allowed) {
      return errorResponse(`Too many reports. Please try again in ${rlResult.retryAfter} seconds.`, 429)
    }

    const body = await req.json()
    const data = CreateReportSchema.parse(body)

    // 校验目标存在性 + 自举报拦截
    if (data.targetType === 'RECIPE') {
      const recipe = await prisma.recipe.findUnique({ where: { id: data.targetId }, select: { id: true, authorId: true } })
      if (!recipe) return errorResponse('Recipe not found', 404)
      if (recipe.authorId === auth.sub) return errorResponse('Cannot report your own content', 400)
    } else {
      const comment = await prisma.comment.findUnique({ where: { id: data.targetId }, select: { id: true, userId: true } })
      if (!comment) return errorResponse('Comment not found', 404)
      if (comment.userId === auth.sub) return errorResponse('Cannot report your own content', 400)
    }

    // 防止重复举报（同一人对同一目标只能举报一次）
    const existing = await (prisma as any).report.findFirst({
      where: {
        reporterId: auth.sub,
        targetType: data.targetType,
        targetId: data.targetId,
      },
    })
    if (existing) {
      return errorResponse('You have already reported this content', 409)
    }

    const report = await (prisma as any).report.create({
      data: {
        reporterId: auth.sub,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        description: data.description,
      },
    })

    return successResponse(report, 201)
  } catch (error) {
    return handleError(error)
  }
}

// GET /api/reports — 后台管理列表（需 ADMIN）
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20')
    const status = searchParams.get('status') // PENDING | REVIEWED | RESOLVED | DISMISSED
    const targetType = searchParams.get('targetType') // RECIPE | COMMENT

    const where: any = {}
    if (status) where.status = status
    if (targetType) where.targetType = targetType

    const { take, skip } = paginate(page, pageSize)

    const [reports, total] = await Promise.all([
      (prisma as any).report.findMany({
        where,
        include: {
          reporter: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      (prisma as any).report.count({ where }),
    ])

    return successResponse({
      reports,
      pagination: {
        page,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
