import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import {
  successResponse,
  errorResponse,
  handleError,
  ERROR_CODES,
} from '@/lib/api'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// BUG-20260422-02 风格：transform 先于校验，允许含前后空格 / 大写邮箱
const EmailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(
    z
      .string()
      .email('Please enter a valid email')
      .max(254, 'Email is too long'),
  )

const ForgotPasswordSchema = z.object({
  email: EmailSchema,
})

// 验证码有效期：15 分钟
const RESET_CODE_TTL_SECONDS = 15 * 60

// Redis key 前缀
const RESET_KEY_PREFIX = 'reset_pwd:'

// 生成 6 位数字验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  try {
    // 限流：每个 IP 每分钟最多 3 次，防止暴力枚举
    const ip = getClientIp(req)
    const rl = await rateLimit(ip, {
      bucket: 'forgot-password',
      limit: 3,
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
    const { email } = ForgotPasswordSchema.parse(body)

    // 查询用户是否存在（不存在也返回 200，防止邮箱枚举攻击）
    const user = await (prisma as any).user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })

    // 只有用户存在时才生成验证码并"发送"邮件
    if (user) {
      const code = generateCode()
      const redisKey = `${RESET_KEY_PREFIX}${email}`

      // 将验证码存入 Redis，有效期 15 分钟
      await redis.set(redisKey, code, { ex: RESET_CODE_TTL_SECONDS })

      // TODO: 接入 Resend / SendGrid 发送真实邮件
      // 示例（Resend）:
      //   import { Resend } from 'resend'
      //   const resend = new Resend(process.env.RESEND_API_KEY)
      //   await resend.emails.send({
      //     from: 'no-reply@chefchina.app',
      //     to: email,
      //     subject: 'Your ChefChina password reset code',
      //     html: `<p>Your reset code is <strong>${code}</strong>. It expires in 15 minutes.</p>`,
      //   })
      console.log(
        `[forgot-password] Reset code for ${email}: ${code} (expires in ${RESET_CODE_TTL_SECONDS}s)`,
      )
    }

    // 无论用户是否存在，始终返回相同的成功响应（防止邮箱枚举）
    return successResponse({
      message: 'If this email exists, a reset code has been sent.',
    })
  } catch (error) {
    return handleError(error)
  }
}
