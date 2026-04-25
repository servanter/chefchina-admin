import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

const UpdateReportSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']).optional(),
  adminNote: z.string().max(1000).optional(),
})

// PATCH /api/reports/[id] — 后台审核更新举报状态（需 ADMIN）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const body = await req.json()
    const data = UpdateReportSchema.parse(body)

    const existing = await (prisma as any).report.findUnique({ where: { id } })
    if (!existing) return errorResponse('Report not found', 404)

    const updateData: any = { ...data }
    if (data.status === 'RESOLVED' || data.status === 'DISMISSED') {
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = auth.sub
    }

    const report = await (prisma as any).report.update({
      where: { id },
      data: updateData,
      include: {
        reporter: { select: { id: true, name: true, email: true, avatar: true } },
      },
    })

    return successResponse(report)
  } catch (error) {
    return handleError(error)
  }
}

// GET /api/reports/[id] — 获取单条举报详情（需 ADMIN）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.role !== 'ADMIN') return errorResponse('Forbidden', 403)

    const report = await (prisma as any).report.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true, avatar: true } },
      },
    })

    if (!report) return errorResponse('Report not found', 404)

    return successResponse(report)
  } catch (error) {
    return handleError(error)
  }
}
