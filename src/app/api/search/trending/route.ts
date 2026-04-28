import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleError } from '@/lib/api';

// GET /api/search/trending - 获取热门搜索词
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // 获取最近 24 小时的数据
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await prisma.searchTrending.findMany({
      where: {
        hourWindow: {
          gte: oneDayAgo
        }
      },
      orderBy: [
        { score: 'desc' },
        { searchCount: 'desc' }
      ],
      take: limit,
      distinct: ['keyword'] // 去重，同一关键词只取最新的
    });

    // 计算趋势类型
    const trendingWithType = await Promise.all(
      trending.map(async (item) => {
        const trendingType = await calculateTrendingType(item.keyword);
        return {
          keyword: item.keyword,
          searchCount: item.searchCount,
          clickRate: item.clickRate,
          score: item.score,
          trendingType
        };
      })
    );

    return NextResponse.json(successResponse({
      trending: trendingWithType,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    return handleError(error);
  }
}

// 计算趋势类型
async function calculateTrendingType(keyword: string): Promise<'hot' | 'rising' | 'new'> {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

  // 检查是否是持续热门（连续 3 小时 Top 10）
  const hotCount = await prisma.searchTrending.count({
    where: {
      keyword,
      hourWindow: {
        gte: threeHoursAgo
      }
    }
  });

  if (hotCount >= 3) {
    return 'hot';
  }

  // 检查是否是上升趋势（1 小时内搜索量增长 >50%）
  const [recentData, olderData] = await Promise.all([
    prisma.searchTrending.findFirst({
      where: {
        keyword,
        hourWindow: {
          gte: oneHourAgo
        }
      },
      orderBy: { hourWindow: 'desc' }
    }),
    prisma.searchTrending.findFirst({
      where: {
        keyword,
        hourWindow: {
          lt: oneHourAgo,
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
        }
      },
      orderBy: { hourWindow: 'desc' }
    })
  ]);

  if (recentData && olderData) {
    const growthRate = (recentData.searchCount - olderData.searchCount) / olderData.searchCount;
    if (growthRate > 0.5) {
      return 'rising';
    }
  }

  // 否则标记为新鲜热词
  return 'new';
}
