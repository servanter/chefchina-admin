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
    const userId = searchParams.get('userId') // 可选，用于查询点赞/收藏状态

    // 缓存 2 分钟（匿名用户可共享缓存）
    const cacheKey = userId ? `recipe:detail-full:${id}:${userId}` : `recipe:detail-full:${id}`
    
    const data = await withCache(cacheKey, CACHE_TTL.recipe, async () => {
      // 1. 菜谱详情 + 作者信息
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

      if (userId) {
        const [like, favorite] = await Promise.all([
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
        ])

        userStatus = {
          liked: !!like,
          favorited: !!favorite,
        }
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
