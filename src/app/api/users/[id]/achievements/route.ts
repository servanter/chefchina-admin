import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'
import { requireSelfOrAdmin } from '@/lib/auth-guard'

// POST /api/users/[id]/achievements/check
// 检查并解锁新徽章，返回新解锁的徽章列表
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params

    // BUG-003 fix: JWT 鉴权
    const auth = requireSelfOrAdmin(_req, userId)
    if (auth instanceof Response) return auth

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            recipes: true,
            comments: true,
            likes: true,
            favorites: true,
            following: true,
          },
        },
      },
    })
    if (!user) {
      return successResponse({ newBadges: [] })
    }

    // 获取所有徽章
    const allBadges = await (prisma as any).badge.findMany()

    // 获取用户已解锁徽章
    const unlockedBadges = await (prisma as any).userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    })
    const unlockedSet = new Set(unlockedBadges.map((ub: any) => ub.badgeId))

    // 统计数据
    const recipesCount = await prisma.recipe.count({
      where: { authorId: userId, isPublished: true },
    })

    const totalLikesReceived = await prisma.like.count({
      where: { recipe: { authorId: userId } },
    })

    const followingCount = user._count?.following ?? 0
    const commentsCount = user._count?.comments ?? 0

    // 浏览数 — 从 view_history 聚合（如果存在）
    let viewedRecipesCount = 0
    try {
      const viewHistoryResult: any[] = await (prisma as any).$queryRaw`
        SELECT COUNT(DISTINCT "recipeId")::int as count FROM "view_history" WHERE "userId" = ${userId}
      `
      viewedRecipesCount = viewHistoryResult?.[0]?.count ?? 0
    } catch {
      // view_history 表可能不存在，忽略
    }

    // 用户注册序号
    const userRank = await prisma.user.count({
      where: { createdAt: { lte: user.createdAt } },
    })

    // 夜猫子检查：用户是否在凌晨（0-5 点）发布过菜谱
    let hasNightRecipe = false
    try {
      const nightRecipes: any[] = await (prisma as any).$queryRaw`
        SELECT COUNT(*)::int as count FROM "recipes"
        WHERE "authorId" = ${userId}
          AND "isPublished" = true
          AND EXTRACT(HOUR FROM "createdAt") >= 0
          AND EXTRACT(HOUR FROM "createdAt") < 5
      `
      hasNightRecipe = (nightRecipes?.[0]?.count ?? 0) > 0
    } catch {
      // 忽略
    }

    // 五星大厨检查：菜谱平均评分 5.0
    let hasFiveStar = false
    if (recipesCount > 0) {
      try {
        const avgResult: any[] = await (prisma as any).$queryRaw`
          SELECT AVG(c."rating")::float as avg_rating
          FROM "comments" c
          JOIN "recipes" r ON c."recipeId" = r."id"
          WHERE r."authorId" = ${userId}
            AND c."rating" IS NOT NULL
            AND c."rating" > 0
        `
        const avgRating = avgResult?.[0]?.avg_rating ?? 0
        hasFiveStar = avgRating >= 5.0 && avgRating > 0
      } catch {
        // 忽略
      }
    }

    // 徽章条件映射
    const conditionMap: Record<string, number> = {
      first_recipe: recipesCount,
      recipe_master: recipesCount,
      recipe_legend: recipesCount,
      first_like: totalLikesReceived,
      popular: totalLikesReceived,
      viral: totalLikesReceived,
      social_butterfly: followingCount,
      commenter: commentsCount,
      explorer: viewedRecipesCount,
      early_bird: userRank <= 100 ? 100 : 0,
      night_owl: hasNightRecipe ? 1 : 0,
      five_star: hasFiveStar ? 1 : 0,
    }

    // 检查并解锁
    const initialLevel = user.level ?? 1
    const newBadges: any[] = []
    for (const badge of allBadges) {
      if (unlockedSet.has(badge.id)) continue

      const currentValue = conditionMap[badge.key] ?? 0
      if (currentValue >= badge.threshold) {
        // 解锁
        try {
          await (prisma as any).userBadge.create({
            data: {
              userId,
              badgeId: badge.id,
            },
          })
          newBadges.push(badge)

          // 解锁徽章 +50 EXP
          await prisma.user.update({
            where: { id: userId },
            data: { exp: { increment: 50 } },
          })
        } catch {
          // unique constraint 说明已存在，跳过
        }
      }
    }

    // 全部徽章发完后，统一检查升级（BUG-001 fix）
    let leveledUp = false
    if (newBadges.length > 0) {
      const finalUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { exp: true, level: true },
      })
      if (finalUser) {
        const finalLevel = calculateLevel(finalUser.exp)
        if (finalLevel > initialLevel) {
          await prisma.user.update({
            where: { id: userId },
            data: { level: finalLevel },
          })
          leveledUp = true
        }
      }
    }

    return successResponse({ newBadges, leveledUp })
  } catch (error) {
    return handleError(error)
  }
}

function calculateLevel(exp: number): number {
  if (exp >= 5000) return 5
  if (exp >= 1500) return 4
  if (exp >= 500) return 3
  if (exp >= 100) return 2
  return 1
}
