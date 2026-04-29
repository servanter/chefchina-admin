import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const FeedbackSchema = z.object({
  content: z.string().min(1).max(2000),
  images: z.array(z.string().url()).max(5).optional(),
  email: z.string().email().optional(),
})

// POST /api/feedback - 提交用户反馈
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth

    const body = await req.json()
    const data = FeedbackSchema.parse(body)

    // 复用 Report 表，设置特殊的 targetType 和 reason
    const feedback = await prisma.report.create({
      data: {
        reporterId: auth.sub,
        targetType: 'RECIPE', // 占位值
        targetId: 'FEEDBACK', // 特殊标记表示这是反馈而非举报
        reason: 'OTHER',
        description: data.content,
        adminNote: data.email ? `Contact: ${data.email}` : undefined,
      },
    })

    // TODO: 可选 - 发送邮件通知管理员
    // await sendFeedbackEmail({ userId: auth.sub, content: data.content, images: data.images })

    return successResponse({ id: feedback.id, submitted: true })
  } catch (error) {
    return handleError(error)
  }
}
