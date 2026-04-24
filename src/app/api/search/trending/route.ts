import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { successResponse, handleError } from '@/lib/api'

// FEAT · /api/search/trending
//
// 聚合最近 7 天 SearchLog 的 TOP 10 关键词（频次降序）。
// - Redis 缓存 5 分钟（降低 DB 聚合压力 + 配合 App 热词刷新）
// - Redis 挂掉不阻断，走 DB
// - 与老的 Redis ZSET 版 /api/search-trending 并存；
//   老接口下线前两者会短暂返回相似但不完全相同的结果，是预期行为。

const CACHE_KEY = 'search:trending:sqlv1:7d:top10'
const CACHE_TTL = 60 * 5 // 5 分钟
const TOP_N = 10
const WINDOW_DAYS = 7

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const searchLog = (prisma as any).searchLog

interface TrendingItem {
  query: string
  count: number
}

export async function GET(_req: NextRequest) {
  try {
    // 1. 尝试读缓存
    try {
      const cached = await redis.get<TrendingItem[]>(CACHE_KEY)
      if (cached && Array.isArray(cached)) {
        return successResponse({ items: cached, window: '7d' })
      }
    } catch {
      // 忽略缓存读失败
    }

    // 2. DB 聚合
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)

    // Prisma groupBy：按 keyword 聚合，取 count desc，limit 10
    const grouped = await searchLog.groupBy({
      by: ['keyword'],
      where: { createdAt: { gte: since } },
      _count: { keyword: true },
      orderBy: { _count: { keyword: 'desc' } },
      take: TOP_N,
    })

    const items: TrendingItem[] = grouped.map(
      (g: { keyword: string; _count: { keyword: number } }) => ({
        query: g.keyword,
        count: g._count.keyword,
      }),
    )

    // 3. 回写缓存（失败仅忽略，不影响响应）
    // BUG-009 修复：Upstash Redis 客户端会自动对非字符串 value 做 JSON 序列化，
    // 再 JSON.stringify 一次会导致读出时多一层字符串嵌套（或 get<T>() 反序列化失败）。
    try {
      await redis.set(CACHE_KEY, items, { ex: CACHE_TTL })
    } catch {
      // ignore
    }

    return successResponse({ items, window: '7d' })
  } catch (error) {
    return handleError(error)
  }
}
