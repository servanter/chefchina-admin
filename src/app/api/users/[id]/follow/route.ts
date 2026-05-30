import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { createNotification, hasRecentNotification, DAY_MS } from '@/lib/notifications'

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

    // 查询关注者信息（用于通知正文）
    const followerUser = await prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true },
    })
    const followerName = followerUser?.name || '有人'

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

    // 关注成功后，给被关注者发通知（24h 内同一对关注者/被关注者不重复推送）
    const alreadyNotified = await hasRecentNotification({
      userId: followingId,
      type: 'NEW_FOLLOWER',
      windowMs: DAY_MS,
      actorId: followerId,
      resourceId: followerId,
    })

    if (!alreadyNotified) {
      await createNotification({
        userId: followingId,
        type: 'NEW_FOLLOWER',
        title: '有新粉丝关注了你',
        body: `${followerName} 关注了你`,
        actorId: followerId,
        resourceId: followerId,
        payload: { followerId },
      })
    }

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
