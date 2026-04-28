import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleError } from '@/lib/api';
import { getUserIdFromToken } from '@/lib/auth';

// POST /api/topics/[id]/follow - 关注话题
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: topicId } = await params;
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }

    // 检查话题是否存在
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!topic) {
      return NextResponse.json(
        errorResponse('Topic not found'),
        { status: 404 }
      );
    }

    // 检查是否已关注
    const existing = await prisma.topicFollower.findUnique({
      where: {
        topicId_userId: {
          topicId,
          userId
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        errorResponse('Already following this topic'),
        { status: 400 }
      );
    }

    // 创建关注记录
    await prisma.topicFollower.create({
      data: {
        topicId,
        userId
      }
    });

    // 返回最新关注数
    const followerCount = await prisma.topicFollower.count({
      where: { topicId }
    });

    return NextResponse.json(successResponse({
      followed: true,
      followerCount
    }));
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/topics/[id]/follow - 取消关注话题
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: topicId } = await params;
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }

    // 删除关注记录
    await prisma.topicFollower.delete({
      where: {
        topicId_userId: {
          topicId,
          userId
        }
      }
    });

    // 返回最新关注数
    const followerCount = await prisma.topicFollower.count({
      where: { topicId }
    });

    return NextResponse.json(successResponse({
      followed: false,
      followerCount
    }));
  } catch (error) {
    return handleError(error);
  }
}
