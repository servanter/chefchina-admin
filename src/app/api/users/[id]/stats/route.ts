import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'

// GET /api/users/[id]/stats
// REQ-16.1: 获取用户统计数据（发布菜谱数/获赞数/粉丝数/关注数）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!user) return errorResponse('User not found', 404)

    // 批量查询统计数据（避免 N+1 查询）
    const [recipeCount, totalLikes, followingCount, followerCount] = await Promise.all([
      // 发布的菜谱数量（仅已发布）
      prisma.recipe.count({
        where: { authorId: id, isPublished: true },
      }),
      // 所有菜谱的总点赞数
      prisma.like.count({
        where: {
          recipe: {
            authorId: id,
          },
        },
      }),
      // 关注数（我关注的人）
      prisma.follow.count({
        where: { followerId: id },
      }),
      // 粉丝数（关注我的人）
      prisma.follow.count({
        where: { followingId: id },
      }),
    ])

    return successResponse({
      recipeCount,
      totalLikes,
      followingCount,
      followerCount,
    })
  } catch (error) {
    return handleError(error)
  }
}
