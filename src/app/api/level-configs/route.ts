import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

// GET /api/level-configs - 获取等级配置
export async function GET() {
  try {
    const configs = await prisma.levelConfig.findMany({
      orderBy: { level: 'asc' }
    })

    return NextResponse.json(successResponse({ configs }))
  } catch (error) {
    return handleError(error)
  }
}
