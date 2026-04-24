import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const Schema = z.object({
  expoPushToken: z.string().min(1).max(500),
})

// PATCH /api/users/[id]/push-token  (same handler used for PUT below)
async function handleUpdate(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 鉴权：push-token 属于设备敏感凭证 —— 只有 token 所有者本人可写，
    // 即便是 ADMIN 也不放行（避免管理员误覆盖/劫持他人推送）。
    // 通知相关接口仍然允许 ADMIN 代操作（见 notifications 路由）。
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    if (auth.sub !== id) {
      console.warn(
        '[AUTH] push-token forbidden: sub=%s role=%s target=%s url=%s',
        auth.sub,
        auth.role,
        id,
        req.url,
      )
      return errorResponse('Forbidden', 403)
    }

    const body = await req.json()
    const { expoPushToken } = Schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return errorResponse('User not found', 404)

    // Use `any` for the update payload until `prisma generate` adds `expoPushToken`
    // to the User update type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await prisma.user.update({
      where: { id },
      data: { expoPushToken } as any,
      select: { id: true },
    })
    return successResponse({ ...user, expoPushToken })
  } catch (error) {
    return handleError(error)
  }
}

export const PATCH = handleUpdate
// 兼容部分客户端用 PUT 的情况（如老 Expo build 走过 PUT）
export const PUT = handleUpdate
