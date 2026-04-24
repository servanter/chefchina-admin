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
import {
  signAuthToken,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_MINUTES,
  DUMMY_PASSWORD_HASH,
} from '@/lib/auth'
import { rateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'

// BUG-20260422-02 修复：先 transform 再 .email() 校验，允许含前后空格 / 大写邮箱。
// BUG-20260422-13 顺带：email max(254)。
const EmailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(
    z
      .string()
      .email('Please enter a valid email')
      .max(254, 'Email is too long'),
  )

const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required').max(72),
})

const INVALID_CREDENTIALS = 'Invalid email or password'

// 新增字段 passwordHash / loginAttempts / lockedUntil 在 migrate 执行前
// Prisma Client 没有对应类型，这里沿用仓库既有 `(prisma as any)` 模式
// 让 TypeScript 通过；migrate + generate 后可以去掉 cast。
type UserRow = {
  id: string
  email: string
  name: string | null
  avatar: string | null
  bio: string | null
  role: 'USER' | 'ADMIN'
  locale: string
  passwordHash: string | null
  loginAttempts: number
  lockedUntil: Date | null
}

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    // BUG-20260422-03 修复：所有 login 路径都先走 IP 限流（5/分钟/IP），
    // 包括 !user / !passwordHash 分支 —— 它们同样消耗 IP 配额，
    // 避免攻击者无限枚举未注册邮箱。
    const ip = getClientIp(req)
    const rl = await rateLimit(ip, RATE_LIMITS.login)
    if (!rl.allowed) {
      return errorResponse(
        'Too many requests, please try again later',
        429,
        ERROR_CODES.RATE_LIMITED,
        { retryAfter: rl.retryAfter },
      )
    }

    const body = await req.json()
    const { email, password } = LoginSchema.parse(body)

    const user = (await (prisma as any).user.findUnique({
      where: { email },
    })) as UserRow | null

    // 不区分「用户不存在」和「密码错误」以防枚举
    // BUG-20260422-07 修复：NULL 密码 / 不存在用户分支也跑一次 bcrypt.compare
    // 匀化响应时延（~100ms），避免时序侧信道枚举"存在但未设密码"的老账号。
    if (!user || !user.passwordHash) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
      return errorResponse(
        INVALID_CREDENTIALS,
        401,
        ERROR_CODES.INVALID_CREDENTIALS,
      )
    }

    // 检查锁定
    // BUG-20260422-15 修复：去掉"还剩 N 分钟"对攻击者友好的精确情报，
    // 改为笼统文案 + ACCOUNT_LOCKED code，前端 i18n 统一文案。
    const now = new Date()
    if (user.lockedUntil && user.lockedUntil > now) {
      return errorResponse(
        'Account temporarily locked. Try again later.',
        423,
        ERROR_CODES.ACCOUNT_LOCKED,
      )
    }

    const matched = await bcrypt.compare(password, user.passwordHash)

    if (!matched) {
      const nextAttempts = user.loginAttempts + 1
      const shouldLock = nextAttempts >= LOGIN_MAX_ATTEMPTS
      await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          loginAttempts: shouldLock ? 0 : nextAttempts,
          lockedUntil: shouldLock
            ? new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60 * 1000)
            : user.lockedUntil,
        },
      })
      // 如果此次失败触发了锁定，直接返回 ACCOUNT_LOCKED 让前端给出"已锁定"提示；
      // 否则仍然返回统一 INVALID_CREDENTIALS 防枚举。
      if (shouldLock) {
        return errorResponse(
          'Account temporarily locked. Try again later.',
          423,
          ERROR_CODES.ACCOUNT_LOCKED,
        )
      }
      return errorResponse(
        INVALID_CREDENTIALS,
        401,
        ERROR_CODES.INVALID_CREDENTIALS,
      )
    }

    // 登录成功：清零计数 & 解锁
    const updated = await (prisma as any).user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
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
      sub: updated.id,
      email: updated.email,
      role: updated.role,
    })

    return successResponse({ user: updated, token })
  } catch (error) {
    return handleError(error)
  }
}
