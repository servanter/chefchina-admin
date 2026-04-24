import { NextRequest } from 'next/server'
import { z } from 'zod'
import { redis } from '@/lib/redis'
import { successResponse, handleError } from '@/lib/api'

// FEAT-20260422-23: 返回 TOP N 热门搜索词。
// window: 24h（默认）| 7d
// 过滤 score < 3 防噪声（单个用户刷 1-2 次不上榜）。
const WindowSchema = z.enum(['24h', '7d']).default('24h')

const KEY_MAP = {
  '24h': 'search_trending:24h',
  '7d': 'search_trending:7d',
} as const

const MIN_SCORE = 3
const TOP_N = 20

// GET /api/search-trending?window=24h|7d
export async function GET(req: NextRequest) {
  try {
    const windowParam = req.nextUrl.searchParams.get('window') ?? '24h'
    const parsed = WindowSchema.safeParse(windowParam)
    const win = parsed.success ? parsed.data : '24h'
    const key = KEY_MAP[win]

    let items: { query: string; count: number }[] = []

    try {
      // Upstash Redis：ZRANGE + rev + withScores 取倒序 TOP 20
      // 返回格式是扁平数组 [member, score, member, score, ...]
      const raw = (await redis.zrange(key, 0, TOP_N - 1, {
        rev: true,
        withScores: true,
      })) as (string | number)[]

      for (let i = 0; i < raw.length; i += 2) {
        const query = String(raw[i])
        const count = Number(raw[i + 1])
        if (!Number.isFinite(count) || count < MIN_SCORE) continue
        items.push({ query, count })
      }
    } catch (e) {
      // Redis 挂掉时返回空数组，前端空态兜底。
      console.warn('[search-trending] redis failed', e)
      items = []
    }

    return successResponse({ items, window: win })
  } catch (error) {
    return handleError(error)
  }
}
