import { NextRequest } from 'next/server'
import { z } from 'zod'
import { redis } from '@/lib/redis'
import {
  successResponse,
  errorResponse,
  handleError,
  ERROR_CODES,
} from '@/lib/api'

// FEAT-20260422-23: search query normalization.
// - trim (leading/trailing spaces)
// - collapse internal whitespace → single space（"红烧   肉" → "红烧 肉"）
// - lowercase（ASCII；CJK 字符本身不区分大小写，但影响 "Kung Pao" vs "kung pao" 重复计数）
// - 长度约束：1-50（超过 50 基本是脏数据/攻击，直接 422）
const QuerySchema = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, ' ').toLowerCase())
  .pipe(
    z
      .string()
      .min(1, 'Query must not be empty')
      .max(50, 'Query is too long'),
  )

const BodySchema = z.object({
  query: QuerySchema,
  // userId 本轮只接收但不写入 Redis（脱敏）；留作未来按用户统计扩展点
  userId: z.string().optional().nullable(),
})

const KEY_24H = 'search_trending:24h'
const KEY_7D = 'search_trending:7d'
const TTL_24H = 60 * 60 * 24 // 86400
const TTL_7D = 60 * 60 * 24 * 7 // 604800

// POST /api/search-log
//
// 记录一次搜索，累加到 24h / 7d 两个滚动窗口的 ZSET。
// Upstash Redis 通过 REST 调用，失败时 fail-open：不阻断用户的搜索主流程。
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { query } = BodySchema.parse(body)

    try {
      // 两个窗口分别 ZINCRBY，然后 EXPIRE 刷新 TTL。
      // Upstash REST 不支持 MULTI/EXEC，这里顺序执行即可；
      // 即便第二个 expire 失败，数据也只是 TTL 稍旧，不影响 TOP 榜正确性。
      await redis.zincrby(KEY_24H, 1, query)
      await redis.expire(KEY_24H, TTL_24H)
      await redis.zincrby(KEY_7D, 1, query)
      await redis.expire(KEY_7D, TTL_7D)
    } catch (e) {
      // Redis 挂掉时不要让搜索主流程失败；只是埋点丢失。
      console.warn('[search-log] redis failed', e)
    }

    return successResponse({ success: true })
  } catch (error) {
    // Zod 校验错误由 handleError 统一走 422 + VALIDATION_FAILED。
    // 非法 JSON 会在 QuerySchema.parse 前被 transform 掉，落到通用 500。
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ZodError') {
      return handleError(error)
    }
    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON body', 400, ERROR_CODES.BAD_REQUEST)
    }
    return handleError(error)
  }
}
