import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { getUserIdFromToken } from '@/lib/auth'
import { z } from 'zod'

const TopicUpdateSchema = z.object({
  nameEn: z.string().min(1).optional(),
  nameZh: z.string().min(1).optional(),
  descEn: z.string().optional(),
  descZh: z.string().optional(),
  icon: z.string().optional(),
  coverImage: z.string().optional(),
  isHot: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

// GET /api/topics/[id] - 获取单个话题
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserIdFromToken(request);

    const [topic, followerCount, isFollowing] = await Promise.all([
      prisma.topic.findUnique({
        where: { id },
        include: {
          _count: {
            select: { recipes: true }
          }
        }
      }),
      prisma.topicFollower.count({
        where: { topicId: id }
      }),
      userId ? prisma.topicFollower.findUnique({
        where: {
          topicId_userId: {
            topicId: id,
            userId
          }
        }
      }) : null
    ]);

    if (!topic) {
      return NextResponse.json(
        errorResponse('Topic not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse({
      ...topic,
      followerCount,
      isFollowing: !!isFollowing
    }));
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/topics/[id] - 更新话题
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = TopicUpdateSchema.parse(body)

    const topic = await prisma.topic.update({
      where: { id },
      data: validated,
      include: {
        _count: {
          select: { recipes: true }
        }
      }
    })

    return NextResponse.json(successResponse(topic))
  } catch (error) {
    return handleError(error)
  }
}

// DELETE /api/topics/[id] - 删除话题
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.topic.delete({
      where: { id }
    })

    return NextResponse.json(successResponse({ deleted: true }))
  } catch (error) {
    return handleError(error)
  }
}
