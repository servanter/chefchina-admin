import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  handleError,
  ERROR_CODES,
} from '@/lib/api'
import { signAuthToken } from '@/lib/auth'
import { rateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'

// 密码：至少 8 位，最多 72 字节（bcrypt 上限），包含字母和数字
// BUG-20260422-06 修复：追加 .max(72)，防止 bcryptjs 静默截断导致行为不一致。
const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// BUG-20260422-02 修复：transform 先于校验，使 " A@B.COM " 也能通过。
// BUG-20260422-13 顺带修：email max(254)（RFC 5321）。
const EmailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(
    z
      .string()
      .email('Please enter a valid email')
      .max(254, 'Email is too long'),
  )

const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
})

// POST /api/auth/register
//
// 新增字段 passwordHash 在 migrate 执行前 Prisma Client 没有类型支持，
// 所以这里沿用仓库既有 `(prisma as any)` 模式；migrate + generate 后可去掉 cast。
export async function POST(req: NextRequest) {
  try {
    // BUG-20260422-03 修复：注册路由先做 IP 限流（3/分钟/IP），
    // 防止注册洪水 + 枚举。
    const ip = getClientIp(req)
    const rl = await rateLimit(ip, RATE_LIMITS.register)
    if (!rl.allowed) {
      return errorResponse(
        'Too many requests, please try again later',
        429,
        ERROR_CODES.RATE_LIMITED,
        { retryAfter: rl.retryAfter },
      )
    }

    const body = await req.json()
    const { email, password } = RegisterSchema.parse(body)

    const passwordHash = await bcrypt.hash(password, 12)

    // BUG-20260422-05 修复：去掉预查重 findUnique（非事务，并发下两请求会
    // 同时通过查重都进到 create），改为直接 create + 捕获 Prisma P2002。
    // 并发下第二请求会精确收到 409，而不是 500 泄漏原始 Prisma 错误。
    try {
      const user = await (prisma as any).user.create({
        data: {
          email,
          name: email.split('@')[0],
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          bio: true,
          role: true,
          locale: true,
          createdAt: true,
          _count: { select: { favorites: true, comments: true } },
        },
      })

      const token = signAuthToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      })

      return successResponse({ user, token }, 201)
    } catch (e: unknown) {
      // Prisma unique constraint violation
      const prismaErr = e as { code?: string }
      if (prismaErr && prismaErr.code === 'P2002') {
        return errorResponse(
          'Email already registered',
          409,
          ERROR_CODES.EMAIL_TAKEN,
        )
      }
      throw e
    }
  } catch (error) {
    return handleError(error)
  }
}
