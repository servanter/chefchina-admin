import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'

// GET /api/recipes/[id]/share-config
// REQ-16.3: 获取菜谱分享配置（图片/标题/作者/URL）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    if (!recipe) return errorResponse('Recipe not found', 404)

    // 计算平均评分（从评论中获取）
    const comments = await prisma.comment.findMany({
      where: { recipeId: id, rating: { not: null } },
      select: { rating: true },
    })

    const avgRating = comments.length > 0
      ? comments.reduce((sum, c) => sum + (c.rating || 0), 0) / comments.length
      : 0

    return successResponse({
      id: recipe.id,
      title: recipe.titleZh || recipe.titleEn,
      coverImage: recipe.coverImage,
      author: recipe.author.name || 'Anonymous',
      authorAvatar: recipe.author.avatar,
      cookTimeMin: recipe.cookTimeMin,
      difficulty: recipe.difficulty,
      likeCount: recipe._count.likes,
      rating: Math.round(avgRating * 10) / 10,
      // Deep Link URL（前端会生成二维码）
      shareUrl: `chefchina://recipe/${recipe.id}`,
      // Web URL（备用）
      webUrl: `https://chefchina.app/recipe/${recipe.id}`,
    })
  } catch (error) {
    return handleError(error)
  }
}
