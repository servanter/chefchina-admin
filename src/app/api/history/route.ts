import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const UpsertHistorySchema = z.object({
  recipeId: z.string().min(1),
})

const DeleteHistorySchema = z.object({
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
      prisma.$queryRaw<Array<{
        recipeId: string
        viewedAt: Date
      }>>`
        SELECT "recipeId", MAX("createdAt") AS "viewedAt"
        FROM "share_logs"
        WHERE "userId" = ${auth.sub} AND "channel" = 'view_history'
        GROUP BY "recipeId"
        ORDER BY MAX("createdAt") DESC
        LIMIT ${take} OFFSET ${skip}
      `,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT 1
          FROM "share_logs"
          WHERE "userId" = ${auth.sub} AND "channel" = 'view_history'
          GROUP BY "recipeId"
        ) t
      `,
    ])

    const recipeIds = items.map((item) => item.recipeId)
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
          viewedAt: item.viewedAt,
          avgRating: 0,
          ratingsCount: 0,
        }
      })
      .filter(Boolean)

    const totalValue = Number(total[0]?.count ?? 0)

    return successResponse({
      items: history,
      pagination: {
        page,
        pageSize: take,
        total: totalValue,
        totalPages: Math.max(1, Math.ceil(totalValue / take)),
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

    await prisma.shareLog.create({
      data: {
        userId: auth.sub,
        recipeId,
        channel: 'view_history',
      },
    })

    return successResponse({ ok: true }, 201)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const body = await req.json().catch(() => ({}))
    const { recipeId, clearAll } = DeleteHistorySchema.parse(body)

    if (clearAll) {
      const result = await prisma.shareLog.deleteMany({
        where: {
          userId: auth.sub,
          channel: 'view_history',
        },
      })
      return successResponse({ deleted: result.count })
    }

    if (!recipeId) {
      return successResponse({ deleted: 0 })
    }

    const latest = await prisma.shareLog.findFirst({
      where: {
        userId: auth.sub,
        recipeId,
        channel: 'view_history',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (!latest) return successResponse({ deleted: 0 })

    await prisma.shareLog.deleteMany({
      where: {
        userId: auth.sub,
        recipeId,
        channel: 'view_history',
      },
    })

    return successResponse({ deleted: 1 })
  } catch (error) {
    return handleError(error)
  }
}
