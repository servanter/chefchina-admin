import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { extractAuth } from '@/lib/auth-guard'

// FEAT · Recipe 全文搜索（轻量版）
//
// - 参数：q / cursor / limit（默认 20，上限 50）
// - 匹配：Recipe.titleEn / titleZh（contains, insensitive） +
//         Ingredient.nameEn / nameZh（contains, insensitive）
// - 只返回 isPublished=true
// - cursor 用 recipe.id（createdAt + id 复合排序，这里简化为 id 游标）
// - 成功后异步写一条 SearchLog（不阻塞响应；失败仅 warn）
//
// 响应：{ success, data: { items, pagination: { nextCursor, total? } } }

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

// normalize：trim + collapse whitespace + lowercase（与 /api/search-log 对齐）
const normalize = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ').toLowerCase()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const searchLog = (prisma as any).searchLog

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawQ = searchParams.get('q') ?? ''
    const q = normalize(rawQ)
    const cursor = searchParams.get('cursor') || undefined
    const limitParam = Number(searchParams.get('limit') || DEFAULT_LIMIT)
    const category = searchParams.get('category')?.trim() || undefined
    const tag = searchParams.get('tag')?.trim() || undefined
    const rawSort = searchParams.get('sort')?.trim() || 'newest'
    const sort = rawSort === 'relevance' ? 'newest' : rawSort
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : DEFAULT_LIMIT, 1), MAX_LIMIT)
    // BUG-002 修复：userId 不再从 query 取（防止伪造污染 SearchLog），
    // 改从 JWT payload 抽取；匿名用户（未登录）仍可搜，userId 写 null。
    const payload = extractAuth(req)
    const userId = payload?.sub ?? null

    if (q.length === 0) {
      return successResponse({
        items: [],
        pagination: { nextCursor: null, total: 0 },
      })
    }
    if (q.length > 100) {
      return errorResponse('Query is too long', 422)
    }

    // Prisma where：OR 分支覆盖 title + ingredient
    const where = {
      isPublished: true,
      ...(category
        ? {
            category: {
              OR: [
                { nameEn: { contains: category, mode: 'insensitive' as const } },
                { nameZh: { contains: category, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
      ...(tag
        ? {
            tags: {
              some: {
                tag: {
                  OR: [
                    { nameEn: { contains: tag, mode: 'insensitive' as const } },
                    { nameZh: { contains: tag, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          }
        : {}),
      OR: [
        { titleEn: { contains: q, mode: 'insensitive' as const } },
        { titleZh: { contains: q, mode: 'insensitive' as const } },
        {
          descriptionEn: { contains: q, mode: 'insensitive' as const },
        },
        {
          descriptionZh: { contains: q, mode: 'insensitive' as const },
        },
        {
          ingredients: {
            some: {
              OR: [
                { nameEn: { contains: q, mode: 'insensitive' as const } },
                { nameZh: { contains: q, mode: 'insensitive' as const } },
              ],
            },
          },
        },
        {
          tags: {
            some: {
              tag: {
                OR: [
                  { nameEn: { contains: q, mode: 'insensitive' as const } },
                  { nameZh: { contains: q, mode: 'insensitive' as const } },
                ],
              },
            },
          },
        },
      ],
    }

    // 多取 1 条用来判断是否还有下一页
    const items = await prisma.recipe.findMany({
      where,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy:
        sort === 'latest' || sort === 'newest'
          ? [{ createdAt: 'desc' }, { id: 'desc' }]
          : sort === 'hot' || sort === 'popular'
            ? [{ viewCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
            : [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        category: { select: { id: true, nameEn: true, nameZh: true, slug: true } },
        tags: { include: { tag: true } },
        _count: { select: { likes: true, comments: true, favorites: true } },
      },
    })

    let nextCursor: string | null = null
    if (items.length > limit) {
      const last = items.pop()!
      nextCursor = last.id
    }

    // total 只在首次无 cursor 时算一次，避免每页都 count
    let total: number | undefined
    if (!cursor) {
      try {
        total = await prisma.recipe.count({ where })
      } catch {
        total = undefined
      }
    }

    // fire-and-forget：只在首次页（无 cursor）记录一次，避免下拉加载反复写。
    // BUG-008：不 await，避免阻塞响应；错误仅 warn。
    if (!cursor) {
      searchLog
        .create({
          data: {
            userId: userId ?? null,
            keyword: q,
          },
        })
        .catch((err: unknown) =>
          console.warn('[search-log] write failed:', err),
        )
    }

    return successResponse({
      items,
      pagination: { nextCursor, ...(total !== undefined ? { total } : {}) },
    })
  } catch (error) {
    return handleError(error)
  }
}
