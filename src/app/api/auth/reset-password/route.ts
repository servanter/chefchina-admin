import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import {
  successResponse,
  errorResponse,
  handleError,
  ERROR_CODES,
} from '@/lib/api'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// 与 forgot-password 保持一致的邮箱 schema
const EmailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(
    z
      .string()
      .email('Please enter a valid email')
      .max(254, 'Email is too long'),
  )

// 密码规则与注册保持一致
const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

const ResetPasswordSchema = z.object({
  email: EmailSchema,
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
  newPassword: PasswordSchema,
})

const RESET_KEY_PREFIX = 'reset_pwd:'

// POST /api/auth/reset-password
export async function POST(req: NextRequest) {
  try {
    // 限流：防止暴力破解验证码
    const ip = getClientIp(req)
    const rl = await rateLimit(ip, {
      bucket: 'reset-password',
      limit: 5,
      windowSeconds: 60,
    })
    if (!rl.allowed) {
      return errorResponse(
        'Too many requests, please try again later',
        429,
        ERROR_CODES.RATE_LIMITED,
        { retryAfter: rl.retryAfter },
      )
    }

    const body = await req.json()
    const { email, code, newPassword } = ResetPasswordSchema.parse(body)

    // 从 Redis 取验证码
    const redisKey = `${RESET_KEY_PREFIX}${email}`
    const storedCode = await redis.get<string>(redisKey)

    // 验证码不存在（已过期或未请求）
    if (!storedCode) {
      return errorResponse(
        'Verification code has expired or does not exist. Please request a new one.',
        400,
        ERROR_CODES.BAD_REQUEST,
      )
    }

    // 验证码错误
    if (storedCode !== code) {
      return errorResponse(
        'Invalid verification code.',
        400,
        ERROR_CODES.BAD_REQUEST,
      )
    }

    // 验证通过：检查用户是否存在
    const user = await (prisma as any).user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (!user) {
      // 不应该发生（forgot-password 未发码给不存在的用户），但做兜底
      // 删除 Redis key 防止悬挂
      await redis.del(redisKey)
      return errorResponse('User not found.', 400, ERROR_CODES.BAD_REQUEST)
    }

    // hash 新密码（与注册接口保持一致的 salt rounds：12）
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // 更新用户密码
    await (prisma as any).user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // 删除已使用的验证码
    await redis.del(redisKey)

    console.log(`[reset-password] Password successfully reset for: ${email}`)

    return successResponse({
      message: 'Password has been reset successfully. Please log in with your new password.',
    })
  } catch (error) {
    return handleError(error)
  }
}
