import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { invalidateCache } from '@/lib/redis'

// POST /api/comments/[id]/like - Toggle 评论点赞
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub
    const { id: commentId } = await params

    // 检查评论是否存在
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, recipeId: true },
    })

    if (!comment) {
      return errorResponse('Comment not found', 404)
    }

    // 检查是否已点赞
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    })

    let liked: boolean

    if (existingLike) {
      // 取消点赞
      await prisma.commentLike.delete({
        where: {
          userId_commentId: {
            userId,
            commentId,
          },
        },
      })
      liked = false
    } else {
      // 点赞
      await prisma.commentLike.create({
        data: {
          userId,
          commentId,
        },
      })
      liked = true
    }

    // 获取最新点赞数
    const likesCount = await prisma.commentLike.count({
      where: { commentId },
    })

    // 失效评论缓存
    await invalidateCache([
      `comments:${comment.recipeId}:*`,
      'comments:all:*',
    ])

    return successResponse({ liked, likesCount })
  } catch (error) {
    return handleError(error)
  }
}

// GET /api/comments/[id]/like - 查询当前用户是否已点赞该评论
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub
    const { id: commentId } = await params

    const like = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    })

    const likesCount = await prisma.commentLike.count({
      where: { commentId },
    })

    return successResponse({ liked: !!like, likesCount })
  } catch (error) {
    return handleError(error)
  }
}
