import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const UpsertHistorySchema = z.object({
  recipeId: z.string().min(1),
})

const DeleteHistorySchema = z.object({
  historyId: z.string().min(1).optional(),
  recipeId: z.string().min(1).optional(),
  clearAll: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const { take, skip } = paginate(page, pageSize)

    const [items, total] = await Promise.all([
      prisma.shareLog.findMany({
        where: {
          userId: auth.sub,
          channel: 'view_history',
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        skip,
      }),
      prisma.shareLog.count({
        where: {
          userId: auth.sub,
          channel: 'view_history',
        },
      }),
    ])

    const recipeIds = Array.from(new Set(items.map((item) => item.recipeId)))
    const recipes = recipeIds.length
      ? await prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
          include: {
            category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
            tags: { include: { tag: true } },
            _count: { select: { likes: true, comments: true, favorites: true } },
          },
        })
      : []

    const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]))

    const history = items
      .map((item) => {
        const recipe = recipeMap.get(item.recipeId)
        if (!recipe) return null
        return {
          ...recipe,
          historyId: item.id,
          viewedAt: item.createdAt,
          avgRating: 0,
          ratingsCount: 0,
        }
      })
      .filter(Boolean)

    return successResponse({
      items: history,
      pagination: {
        page,
        pageSize: take,
        total,
        totalPages: Math.max(1, Math.ceil(total / take)),
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const body = await req.json()
    const { recipeId } = UpsertHistorySchema.parse(body)

    const history = await prisma.shareLog.create({
      data: {
        userId: auth.sub,
        recipeId,
        channel: 'view_history',
      },
      select: { id: true, recipeId: true, createdAt: true },
    })

    return successResponse({ ok: true, history }, 201)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const body = await req.json().catch(() => ({}))
    const { historyId, recipeId, clearAll } = DeleteHistorySchema.parse(body)

    if (clearAll) {
      const result = await prisma.shareLog.deleteMany({
        where: {
          userId: auth.sub,
          channel: 'view_history',
        },
      })
      return successResponse({ deleted: result.count })
    }

    if (historyId) {
      const result = await prisma.shareLog.deleteMany({
        where: {
          id: historyId,
          userId: auth.sub,
          channel: 'view_history',
        },
      })
      return successResponse({ deleted: result.count })
    }

    // 兼容旧客户端：如果还只传 recipeId，则只删最新一条，避免整道菜历史被批量清空。
    if (recipeId) {
      const latest = await prisma.shareLog.findFirst({
        where: {
          userId: auth.sub,
          recipeId,
          channel: 'view_history',
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      })

      if (!latest) return successResponse({ deleted: 0 })

      const result = await prisma.shareLog.deleteMany({
        where: {
          id: latest.id,
          userId: auth.sub,
          channel: 'view_history',
        },
      })

      return successResponse({ deleted: result.count })
    }

    return successResponse({ deleted: 0 })
  } catch (error) {
    return handleError(error)
  }
}
