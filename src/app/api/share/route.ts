import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shareLog = (prisma as any).shareLog

const CreateSchema = z.object({
  recipeId: z.string(),
  userId: z.string().optional().nullable(),
  channel: z.string().max(40).optional().nullable(),
})

// POST /api/share  — record a share event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateSchema.parse(body)

    const log = await shareLog.create({
      data: {
        recipeId: data.recipeId,
        userId: data.userId ?? null,
        channel: data.channel ?? null,
      },
    })

    return successResponse(log, 201)
  } catch (error) {
    return handleError(error)
  }
}

// GET /api/share?recipeId=xxx  — aggregate stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const recipeId = searchParams.get('recipeId')
    if (!recipeId) return errorResponse('recipeId is required', 400)

    const [total, byChannel] = await Promise.all([
      shareLog.count({ where: { recipeId } }),
      shareLog.groupBy({
        by: ['channel'],
        where: { recipeId },
        _count: { channel: true },
      }),
    ])

    return successResponse({
      total,
      byChannel: byChannel.map((b: { channel: string | null; _count: { channel: number } }) => ({
        channel: b.channel ?? 'unknown',
        count: b._count.channel,
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}
