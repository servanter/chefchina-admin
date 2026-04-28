import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleError, paginate } from '@/lib/api';
import { getUserIdFromToken } from '@/lib/auth';

// GET /api/me/followed-topics - 获取我关注的话题列表
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const [topicFollowers, total] = await Promise.all([
      prisma.topicFollower.findMany({
        where: { userId },
        include: {
          topic: {
            include: {
              _count: {
                select: { recipes: true }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        ...paginate(page, limit)
      }),
      prisma.topicFollower.count({
        where: { userId }
      })
    ]);

    // 获取每个话题的关注人数
    const topicsWithFollowerCount = await Promise.all(
      topicFollowers.map(async (tf) => {
        const followerCount = await prisma.topicFollower.count({
          where: { topicId: tf.topicId }
        });
        return {
          ...tf.topic,
          followerCount,
          followedAt: tf.createdAt
        };
      })
    );

    return NextResponse.json(successResponse({
      topics: topicsWithFollowerCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }));
  } catch (error) {
    return handleError(error);
  }
}
