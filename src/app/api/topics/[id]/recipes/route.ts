import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleError, paginate } from '@/lib/api';
import { getUserIdFromToken } from '@/lib/auth';

// GET /api/topics/[id]/recipes - 获取话题下的菜谱列表
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'latest'; // latest | hot
    const userId = await getUserIdFromToken(request);

    // 排序逻辑
    let orderBy: any;
    if (sort === 'hot') {
      // 热门排序：综合浏览量、点赞数、收藏数
      orderBy = [
        { viewCount: 'desc' },
        { createdAt: 'desc' }
      ];
    } else {
      // 最新排序
      orderBy = { createdAt: 'desc' };
    }

    const [recipeTopics, total] = await Promise.all([
      prisma.recipeTopics.findMany({
        where: { topicId: id },
        include: {
          recipe: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              },
              category: {
                select: {
                  id: true,
                  nameEn: true,
                  nameZh: true
                }
              },
              _count: {
                select: {
                  likes: true,
                  favorites: true,
                  comments: true
                }
              },
              ...(userId ? {
                likes: {
                  where: { userId },
                  select: { id: true }
                },
                favorites: {
                  where: { userId },
                  select: { id: true }
                }
              } : {})
            }
          }
        },
        orderBy: orderBy,
        ...paginate(page, limit)
      }),
      prisma.recipeTopics.count({
        where: { topicId: id }
      })
    ]);

    // 转换数据格式
    const recipes = recipeTopics.map(rt => ({
      ...rt.recipe,
      userStatus: userId ? {
        liked: rt.recipe.likes?.length > 0,
        favorited: rt.recipe.favorites?.length > 0
      } : null
    }));

    return NextResponse.json(successResponse({
      recipes,
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
