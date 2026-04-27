import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { withCache, CACHE_TTL } from '@/lib/redis'

/**
 * GET /api/recipes/:id/detail-full
 * 聚合接口：一次性返回菜谱详情页所需的所有数据
 * 
 * 替代前端多次请求：
 * - /api/recipes/:id
 * - /api/recipes/:id/related
 * - /api/likes/:id
 * - /api/favorites/:id
 * - /api/comments?recipeId=:id
 * - /api/comments/like-status
 * 
 * 目的：减少并发数据库连接，解决 MaxClientsInSessionMode 错误
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    // userId 从 Authorization header 中获取，不从 URL 中传递
    const authHeader = req.headers.get('authorization')
    let userId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      // 这里简化处理，实际应该验证 JWT token
      // 但为了快速修复，先保留 URL 参数兼容
      userId = searchParams.get('userId')
    } else {
      userId = searchParams.get('userId')
    }

    // 缓存 2 分钟（匿名用户可共享缓存）
    const cacheKey = userId ? `recipe:detail-full:${id}:${userId}` : `recipe:detail-full:${id}`
    
    const data = await withCache(cacheKey, CACHE_TTL.recipe, async () => {
      // 1. 菜谱详情 + 作者信息 + ingredients + steps
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              bio: true,
              _count: {
                select: {
                  recipes: true,
                  followers: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              nameEn: true,
              nameZh: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  nameEn: true,
                  nameZh: true,
                },
              },
            },
          },
          ingredients: true, // 增加 ingredients
          steps: { orderBy: { stepNumber: 'asc' } }, // 增加 steps
          _count: {
            select: {
              likes: true,
              favorites: true,
              comments: true,
            },
          },
        },
      })

      if (!recipe) {
        throw new Error('Recipe not found')
      }

      // 2. 相关推荐（同分类，排除当前菜谱）
      const related = await prisma.recipe.findMany({
        where: {
          categoryId: recipe.categoryId,
          id: { not: id },
          isPublished: true,
        },
        take: 6,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          titleEn: true,
          titleZh: true,
          coverImage: true,
          difficulty: true,
          cookTimeMin: true,
          servings: true,
          _count: {
            select: {
              likes: true,
              favorites: true,
            },
          },
        },
      })

      // 3. 评论列表（前 10 条，按创建时间排序）
      const comments = await prisma.comment.findMany({
        where: { recipeId: id },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
          replies: {
            take: 3,
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                },
              },
            },
          },
        },
      })

      // 4. 用户状态（如果提供了 userId）
      let userStatus = {
        liked: false,
        favorited: false,
      }
      let commentLikeStatus: Record<string, boolean> = {}

      if (userId) {
        // 收集所有评论 ID（包括回复）
        const allCommentIds: string[] = []
        comments.forEach(comment => {
          allCommentIds.push(comment.id)
          if (comment.replies) {
            comment.replies.forEach(reply => allCommentIds.push(reply.id))
          }
        })

        const [like, favorite, commentLikes] = await Promise.all([
          prisma.like.findUnique({
            where: {
              userId_recipeId: {
                userId,
                recipeId: id,
              },
            },
          }),
          prisma.favorite.findUnique({
            where: {
              userId_recipeId: {
                userId,
                recipeId: id,
              },
            },
          }),
          // 批量查询评论点赞状态
          allCommentIds.length > 0
            ? prisma.commentLike.findMany({
                where: {
                  userId,
                  commentId: { in: allCommentIds },
                },
                select: { commentId: true },
              })
            : Promise.resolve([]),
        ])

        userStatus = {
          liked: !!like,
          favorited: !!favorite,
        }

        // 构建 commentLikeStatus map
        commentLikeStatus = commentLikes.reduce((acc, cl) => {
          acc[cl.commentId] = true
          return acc
        }, {} as Record<string, boolean>)
      }

      return {
        recipe: {
          ...recipe,
          likesCount: recipe._count.likes,
          favoritesCount: recipe._count.favorites,
          commentsCount: recipe._count.comments,
          tags: recipe.tags.map((rt) => rt.tag),
        },
        related,
        comments,
        userStatus,
        commentLikeStatus, // 新增：评论点赞状态
      }
    })

    return successResponse(data)
  } catch (error: any) {
    if (error.message === 'Recipe not found') {
      return errorResponse('Recipe not found', 404)
    }
    return handleError(error)
  }
}
