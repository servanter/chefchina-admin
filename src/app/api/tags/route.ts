import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

// GET /api/tags — return all tags
export async function GET(_req: NextRequest) {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: [
        { recipes: { _count: 'desc' } },
        { nameEn: 'asc' },
      ],
      include: {
        _count: { select: { recipes: true } },
      },
    })

    return successResponse({ tags })
  } catch (error) {
    return handleError(error)
  }
}
