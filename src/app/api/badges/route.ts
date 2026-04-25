import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

// GET /api/badges — 返回所有徽章列表（公开）
export async function GET(_req: NextRequest) {
  try {
    const badges = await (prisma as any).badge.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return successResponse({ badges })
  } catch (error) {
    return handleError(error)
  }
}
