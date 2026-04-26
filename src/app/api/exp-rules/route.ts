import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

// GET /api/exp-rules - 获取经验值规则
export async function GET() {
  try {
    const rules = await prisma.expRule.findMany({
      orderBy: { action: 'asc' }
    })

    return NextResponse.json(successResponse({ rules }))
  } catch (error) {
    return handleError(error)
  }
}

// POST /api/exp-rules - 创建/更新规则
export async function POST(request: Request) {
  try {
    const { action, exp, dailyLimit, description } = await request.json()

    const rule = await prisma.expRule.upsert({
      where: { action },
      update: { exp, dailyLimit, description },
      create: { action, exp, dailyLimit, description }
    })

    return NextResponse.json(successResponse(rule), { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
