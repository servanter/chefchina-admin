import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

// POST /api/users/[id]/follow - 关注用户
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const followerId = auth.sub
    const { id } = await params
    const followingId = id

    // 不能关注自己
    if (followerId === followingId) {
      return errorResponse('Cannot follow yourself', 400)
    }

    // 检查被关注的用户是否存在
    const targetUser = await prisma.user.findUnique({ where: { id: followingId } })
    if (!targetUser) {
      return errorResponse('User not found', 404)
    }

    // 使用 upsert 避免重复关注（利用唯一索引）
    const follow = await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      create: {
        followerId,
        followingId,
      },
      update: {}, // 已存在则不做任何操作
    })

    return successResponse({ message: 'Followed successfully', follow }, 201)
  } catch (error) {
    return handleError(error)
  }
}

// DELETE /api/users/[id]/follow - 取消关注
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    if (auth instanceof Response) return auth
    const followerId = auth.sub
    const { id } = await params
    const followingId = id

    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    })

    return successResponse({ message: 'Unfollowed successfully' })
  } catch (error) {
    return handleError(error)
  }
}
