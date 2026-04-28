import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleError } from '@/lib/api';
import { getUserIdFromToken } from '@/lib/auth';
import { z } from 'zod';

const SearchRecordSchema = z.object({
  query: z.string().min(1).max(200),
  resultCount: z.number().int().min(0).default(0),
  clicked: z.boolean().default(false)
});

// POST /api/search/record - 记录搜索行为
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromToken(request);
    const body = await request.json();
    const validated = SearchRecordSchema.parse(body);

    // 如果用户已登录，记录到 search_history
    if (userId) {
      await prisma.searchHistory.create({
        data: {
          userId,
          query: validated.query,
          resultCount: validated.resultCount,
          clicked: validated.clicked
        }
      });
    }

    // 异步更新热门搜索词统计（不阻塞响应）
    updateTrendingStats(validated.query, validated.clicked).catch(err => {
      console.error('Failed to update trending stats:', err);
    });

    return NextResponse.json(successResponse({ recorded: true }));
  } catch (error) {
    return handleError(error);
  }
}

// 更新热门搜索词统计（异步）
async function updateTrendingStats(keyword: string, clicked: boolean) {
  const now = new Date();
  const hourWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

  // 查找当前小时的记录
  const existing = await prisma.searchTrending.findFirst({
    where: {
      keyword,
      hourWindow
    }
  });

  if (existing) {
    // 更新已有记录
    const newSearchCount = existing.searchCount + 1;
    const newClickCount = clicked ? (existing.clickRate * existing.searchCount + 1) : (existing.clickRate * existing.searchCount);
    const newClickRate = newClickCount / newSearchCount;
    const newScore = newSearchCount * 0.7 + newClickRate * 100 * 0.3;

    await prisma.searchTrending.update({
      where: { id: existing.id },
      data: {
        searchCount: newSearchCount,
        clickRate: newClickRate,
        score: newScore,
        updatedAt: now
      }
    });
  } else {
    // 创建新记录
    const clickRate = clicked ? 1.0 : 0.0;
    const score = 1 * 0.7 + clickRate * 100 * 0.3;

    await prisma.searchTrending.create({
      data: {
        keyword,
        searchCount: 1,
        clickRate,
        score,
        hourWindow,
        trendingType: 'new'
      }
    });
  }
}
