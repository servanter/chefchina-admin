import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const CACHE_TTL = {
  recipes: 60 * 5,      // 5 min
  recipe: 60 * 10,      // 10 min
  categories: 60 * 60,  // 1 hr
  popular: 60 * 15,     // 15 min
}

export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get<T>(key)
    if (cached) return cached
  } catch {
    // Cache miss or error — fall through to fetcher
  }

  const data = await fetcher()

  try {
    await redis.set(key, JSON.stringify(data), { ex: ttl })
  } catch {
    // Non-critical — ignore cache write errors
  }

  return data
}

/**
 * Invalidate cache keys. Supports exact keys and simple wildcard patterns
 * (e.g. "recipes:*"). Wildcard patterns use Redis SCAN to find matching keys
 * and then delete them in bulk.
 */
export async function invalidateCache(patterns: string[]): Promise<void> {
  try {
    const exactKeys: string[] = []
    const wildcardPatterns: string[] = []

    for (const p of patterns) {
      if (p.includes('*')) {
        wildcardPatterns.push(p)
      } else {
        exactKeys.push(p)
      }
    }

    // Delete exact keys
    if (exactKeys.length > 0) {
      await redis.del(...exactKeys)
    }

    // For wildcard patterns, use SCAN to find matching keys then delete them
    for (const pattern of wildcardPatterns) {
      let cursor = 0
      const keysToDelete: string[] = []
      do {
        const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 })
        cursor = Number(nextCursor)
        keysToDelete.push(...(keys as string[]))
      } while (cursor !== 0)

      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete)
      }
    }
  } catch {
    // Non-critical
  }
}
