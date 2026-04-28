import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api'
import { requireAuth, requireSelfOrAdmin } from '@/lib/auth-guard'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notif = (prisma as any).notification

const CreateSchema = z.object({
  userId: z.string(),
  type: z.enum(['COMMENT_REPLY', 'RECIPE_LIKED', 'RECIPE_FAVORITED', 'SUBMISSION_APPROVED', 'SYSTEM']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  payload: z.record(z.string(), z.any()).optional().nullable(),
})

// GET /api/notifications?userId=xxx&unreadOnly=true&tab=all|like|comment|system&page=1&pageSize=20
// REQ-16.2: 增加 tab 参数支持分类查询
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const tab = searchParams.get('tab') || 'all'
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)

    if (!userId) return errorResponse('userId is required', 400)

    // 鉴权：必须登录，且 userId 必须是本人（或 ADMIN）
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const guard = requireSelfOrAdmin(req, userId, auth)
    if (guard instanceof Response) return guard

    // REQ-16.2: 定义类型映射
    const typeMap: Record<string, string[] | undefined> = {
      all: undefined, // undefined 表示所有类型
      like: ['RECIPE_LIKED', 'RECIPE_FAVORITED'],
      comment: ['COMMENT_REPLY'],
      system: ['SUBMISSION_APPROVED', 'SYSTEM'],
    }

    const types = typeMap[tab]

    const { take, skip } = paginate(page, pageSize)
    const where: any = { userId }
    if (unreadOnly) {
      where.readAt = null
    }
    if (types) {
      where.type = { in: types }
    }

    const [notifications, total, unreadCount] = await Promise.all([
      notif.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      notif.count({ where }),
      notif.count({ where: { userId, readAt: null } }),
    ])

    return successResponse({
      notifications,
      unreadCount,
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

// POST /api/notifications  (internal — ADMIN only from HTTP; server code calls createNotification() 直接跳过此路由)
export async function POST(req: NextRequest) {
  try {
    // 鉴权：HTTP 入口只允许 ADMIN。server 侧内部触发请直接调 createNotification()，
    // 不走这条路由。
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') {
      console.warn('[AUTH] POST /api/notifications forbidden for non-admin sub=%s', auth.sub)
      return errorResponse('Forbidden', 403)
    }

    const body = await req.json()
    const data = CreateSchema.parse(body)

    const notification = await notif.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        payload: data.payload ?? undefined,
      },
    })

    // TODO: integrate Expo Push API here (expo-server-sdk) once the service is wired up.
    // Fetch user.expoPushToken and send a silent notification with the same payload.

    return successResponse(notification, 201)
  } catch (error) {
    return handleError(error)
  }
}
