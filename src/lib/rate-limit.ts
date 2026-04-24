import { NextRequest } from 'next/server'
import { redis } from './redis'

// ─────────────────────────────────────────────────────────────
// IP 滑动窗口限流（BUG-20260422-03）
// ─────────────────────────────────────────────────────────────
//
// 使用 Upstash Redis 的 INCR + EXPIRE（固定窗口简化版，足够挡撞库）。
// key：`rl:{bucket}:{ip}`，例如 `rl:login:1.2.3.4`
// 策略示例：
//   - 登录：5 次 / 60 秒 / IP
//   - 注册：3 次 / 60 秒 / IP
//
// 返回值：
//   { allowed: true,  remaining: N }
//   { allowed: false, retryAfter: secondsUntilReset }
//
// 说明：
//   - 固定窗口比滑动窗口略宽松（窗口边缘可能双倍），但实现简单、
//     Upstash REST 的 round-trip 只有 1 次，对撞库场景已足够。
//   - Redis 不可用时 fail-open：记 warn 日志但放行，避免误伤真实用户。

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number // seconds
}

interface RateLimitConfig {
  bucket: string         // 分桶名（login / register 等）
  limit: number          // 窗口内最大请求数
  windowSeconds: number  // 窗口长度（秒）
}

export const RATE_LIMITS = {
  login: { bucket: 'login', limit: 5, windowSeconds: 60 },
  register: { bucket: 'register', limit: 3, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitConfig>

/**
 * 从请求头中提取客户端 IP。Vercel / Cloudflare / nginx 常见头都兜底一遍。
 * 拿不到时退回 "unknown"（全体未知客户端共享一个桶，弱保护但不至于 fail-open）。
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri.trim()
  const cfip = req.headers.get('cf-connecting-ip')
  if (cfip) return cfip.trim()
  return 'unknown'
}

/**
 * 检查并计数当前 IP 在某桶内的请求次数。
 * 超限返回 { allowed: false, retryAfter }，否则 { allowed: true, remaining }。
 */
export async function rateLimit(
  ip: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `rl:${config.bucket}:${ip}`

  try {
    // INCR 原子自增；第一次写入后再 EXPIRE 设置窗口
    const count = (await redis.incr(key)) as number
    if (count === 1) {
      await redis.expire(key, config.windowSeconds)
    }

    if (count > config.limit) {
      // 取剩余 TTL 作为 retryAfter；拿不到就退回整窗口
      let ttl = 0
      try {
        ttl = (await redis.ttl(key)) as number
      } catch {
        ttl = config.windowSeconds
      }
      const retryAfter = ttl > 0 ? ttl : config.windowSeconds
      return { allowed: false, remaining: 0, retryAfter }
    }

    return {
      allowed: true,
      remaining: Math.max(0, config.limit - count),
      retryAfter: 0,
    }
  } catch (e) {
    // Redis 不可达时 fail-open，避免登录全线挂掉
    console.warn('[rate-limit] redis unavailable, fail-open:', e)
    return { allowed: true, remaining: config.limit, retryAfter: 0 }
  }
}
