import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/comments/like-status?commentIds=id1,id2,id3 - 批量查询评论点赞状态
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const userId = auth.sub

    const { searchParams } = new URL(req.url)
    const commentIdsParam = searchParams.get('commentIds')

    if (!commentIdsParam) {
      return errorResponse('commentIds parameter is required', 400)
    }

    const commentIds = commentIdsParam.split(',').filter((id) => id.trim().length > 0)

    if (commentIds.length === 0) {
      return successResponse({ status: {} })
    }

    // 批量查询当前用户对这些评论的点赞状态
    const likes = await prisma.commentLike.findMany({
      where: {
        userId,
        commentId: { in: commentIds },
      },
      select: {
        commentId: true,
      },
    })

    // 构建 { commentId: boolean } 映射
    const status: Record<string, boolean> = {}
    commentIds.forEach((id) => {
      status[id] = false
    })
    likes.forEach((like) => {
      status[like.commentId] = true
    })

    return successResponse({ status })
  } catch (error) {
    return handleError(error)
  }
}
