import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// Feed 动态类型
type FeedItem = {
  id: string
  type: 'recipe' | 'comment' | 'favorite'
  createdAt: Date
  user: {
    id: string
    name: string | null
    avatar: string | null
  }
  recipe?: any
  comment?: any
}

// GET /api/feed - 获取关注用户的最新动态流（菜谱、评论、收藏）
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = Number(searchParams.get('limit') || 20)

    // 获取当前用户关注的所有用户 ID
    const followingUsers = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })

    const followingIds = followingUsers.map(f => f.followingId)

    // 如果没有关注任何人，返回空列表
    if (followingIds.length === 0) {
      return successResponse({
        items: [],
        nextCursor: null,
      })
    }

    const cursorDate = cursor ? new Date(cursor) : new Date()

    // 并行查询三种动态
    const [recipes, comments, favorites] = await Promise.all([
      // 1. 菜谱动态
      prisma.recipe.findMany({
        where: {
          authorId: { in: followingIds },
          isPublished: true,
          createdAt: { lt: cursorDate },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          category: {
            select: {
              id: true,
              nameEn: true,
              nameZh: true,
              slug: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              favorites: true,
            },
          },
        },
      }),

      // 2. 评论动态
      prisma.comment.findMany({
        where: {
          userId: { in: followingIds },
          isVisible: true,
          parentId: null, // 只显示顶层评论
          createdAt: { lt: cursorDate },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          recipe: {
            select: {
              id: true,
              titleEn: true,
              titleZh: true,
              coverImage: true,
              isPublished: true,
              category: {
                select: {
                  nameEn: true,
                  nameZh: true,
                },
              },
            },
          },
          _count: {
            select: { likes: true },
          },
        },
      }),

      // 3. 收藏动态
      prisma.favorite.findMany({
        where: {
          userId: { in: followingIds },
          createdAt: { lt: cursorDate },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          recipe: {
            select: {
              id: true,
              titleEn: true,
              titleZh: true,
              coverImage: true,
              isPublished: true,
              category: {
                select: {
                  nameEn: true,
                  nameZh: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                  favorites: true,
                },
              },
            },
          },
        },
      }),
    ])

    // 合并三种动态，按时间排序，过滤未发布菜谱
    const feedItems: FeedItem[] = [
      ...recipes.map(r => ({
        id: `recipe_${r.id}`,
        type: 'recipe' as const,
        createdAt: r.createdAt,
        user: r.author,
        recipe: r,
      })),
      ...comments.map(c => ({
        id: `comment_${c.id}`,
        type: 'comment' as const,
        createdAt: c.createdAt,
        user: c.user,
        comment: c,
      })),
      ...favorites.map(f => ({
        id: `favorite_${f.userId}_${f.recipeId}`,
        type: 'favorite' as const,
        createdAt: f.createdAt,
        user: f.user,
        recipe: f.recipe,
      })),
    ]
      .filter(item => {
        // 过滤掉关联未发布菜谱的 comment 和 favorite
        if (item.type === 'comment' && item.comment?.recipe?.isPublished === false) return false
        if (item.type === 'favorite' && item.recipe?.isPublished === false) return false
        return true
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)

    // 计算 nextCursor
    const nextCursor =
      feedItems.length === limit
        ? feedItems[feedItems.length - 1].createdAt.toISOString()
        : null

    return successResponse({
      items: feedItems,
      nextCursor,
    })
  } catch (error) {
    return handleError(error)
  }
}
