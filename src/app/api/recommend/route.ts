import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError, paginate } from '@/lib/api'
import { extractAuth } from '@/lib/auth-guard'

// GET /api/recommend - 个性化推荐
export async function GET(request: NextRequest) {
  try {
    // 从 JWT token 获取 userId（可选）
    const auth = extractAuth(request)
    const userId = auth?.sub

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!userId) {
      // 匿名用户，返回全站热门
      const start = (page - 1) * limit
      const [hotRecipes, total] = await Promise.all([
        prisma.recipe.findMany({
          where: { isPublished: true },
          include: {
            author: {
              select: { id: true, name: true, avatar: true, level: true }
            },
            category: {
              select: { id: true, nameEn: true, nameZh: true }
            },
            _count: {
              select: { likes: true, favorites: true, comments: true }
            }
          },
          orderBy: [
            { viewCount: 'desc' },
            { createdAt: 'desc' }
          ],
          take: limit,
          skip: start
        }),
        prisma.recipe.count({ where: { isPublished: true } })
      ])

      return NextResponse.json(successResponse({
        recipes: hotRecipes.map(r => ({ ...r, reason: 'hot' })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }))
    }

    // 1. 获取用户浏览历史（最近 30 条）
    const browseHistory = await prisma.browseHistory.findMany({
      where: { userId },
      select: { recipeId: true },
      orderBy: { createdAt: 'desc' },
      take: 30
    })

    // 2. 获取用户收藏的菜谱
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { recipeId: true },
      take: 20
    })

    // 3. 获取用户关注的作者
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    })

    const browsedRecipeIds = browseHistory.map(h => h.recipeId)
    const favoritedRecipeIds = favorites.map(f => f.recipeId)
    const followingIds = following.map(f => f.followingId)

    // 4. 基于浏览历史的分类和标签
    let categoryIds: string[] = []
    let tagIds: string[] = []

    if (browsedRecipeIds.length > 0) {
      const browsedRecipes = await prisma.recipe.findMany({
        where: { id: { in: browsedRecipeIds } },
        select: { 
          categoryId: true,
          tags: {
            select: { tagId: true }
          }
        }
      })

      categoryIds = [...new Set(browsedRecipes.map(r => r.categoryId))]
      tagIds = [...new Set(browsedRecipes.flatMap(r => r.tags.map(t => t.tagId)))]
    }

    // 5. 构建推荐查询（排除已浏览和已收藏）
    const excludeIds = [...new Set([...browsedRecipeIds, ...favoritedRecipeIds])]

    // 混合推荐策略：
    // - 40%: 关注的作者的新菜谱
    // - 30%: 相似分类的热门菜谱
    // - 20%: 相似标签的菜谱
    // - 10%: 全站热门菜谱

    const [followingRecipes, categoryRecipes, tagRecipes, hotRecipes] = await Promise.all([
      // 关注作者的菜谱
      followingIds.length > 0 ? prisma.recipe.findMany({
        where: {
          authorId: { in: followingIds, not: userId },
          id: { notIn: excludeIds },
          isPublished: true
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true, level: true }
          },
          category: {
            select: { id: true, nameEn: true, nameZh: true }
          },
          _count: {
            select: { likes: true, favorites: true, comments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit * 0.4)
      }) : [],

      // 相似分类的热门菜谱
      categoryIds.length > 0 ? prisma.recipe.findMany({
        where: {
          categoryId: { in: categoryIds },
          authorId: { not: userId },
          id: { notIn: excludeIds },
          isPublished: true
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true, level: true }
          },
          category: {
            select: { id: true, nameEn: true, nameZh: true }
          },
          _count: {
            select: { likes: true, favorites: true, comments: true }
          }
        },
        orderBy: { viewCount: 'desc' },
        take: Math.ceil(limit * 0.3)
      }) : [],

      // 相似标签的菜谱
      tagIds.length > 0 ? prisma.recipe.findMany({
        where: {
          tags: {
            some: {
              tagId: { in: tagIds }
            }
          },
          authorId: { not: userId },
          id: { notIn: excludeIds },
          isPublished: true
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true, level: true }
          },
          category: {
            select: { id: true, nameEn: true, nameZh: true }
          },
          _count: {
            select: { likes: true, favorites: true, comments: true }
          }
        },
        orderBy: { viewCount: 'desc' },
        take: Math.ceil(limit * 0.2)
      }) : [],

      // 全站热门（兜底）
      prisma.recipe.findMany({
        where: {
          authorId: { not: userId },
          id: { notIn: excludeIds },
          isPublished: true
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true, level: true }
          },
          category: {
            select: { id: true, nameEn: true, nameZh: true }
          },
          _count: {
            select: { likes: true, favorites: true, comments: true }
          }
        },
        orderBy: [
          { viewCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: Math.ceil(limit * 0.1)
      })
    ])

    // 合并并打乱
    let recommended = [
      ...followingRecipes.map(r => ({ ...r, reason: 'following' })),
      ...categoryRecipes.map(r => ({ ...r, reason: 'category' })),
      ...tagRecipes.map(r => ({ ...r, reason: 'tags' })),
      ...hotRecipes.map(r => ({ ...r, reason: 'hot' }))
    ]

    // 去重（可能有重叠）
    const uniqueMap = new Map()
    recommended.forEach(r => {
      if (!uniqueMap.has(r.id)) {
        uniqueMap.set(r.id, r)
      }
    })
    recommended = Array.from(uniqueMap.values())

    // 洗牌算法
    for (let i = recommended.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [recommended[i], recommended[j]] = [recommended[j], recommended[i]]
    }

    // 分页
    const start = (page - 1) * limit
    const paginatedRecipes = recommended.slice(start, start + limit)

    // 计算评分
    const recipesWithRatings = await Promise.all(
      paginatedRecipes.map(async (recipe) => {
        const ratings = await prisma.comment.findMany({
          where: { recipeId: recipe.id, rating: { not: null } },
          select: { rating: true }
        })
        
        const avgRating = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
          : null
        
        return {
          ...recipe,
          avgRating,
          ratingsCount: ratings.length
        }
      })
    )

    return NextResponse.json(successResponse({
      recipes: recipesWithRatings,
      pagination: {
        page,
        limit,
        total: recommended.length,
        totalPages: Math.ceil(recommended.length / limit)
      }
    }))
  } catch (error) {
    return handleError(error)
  }
}
