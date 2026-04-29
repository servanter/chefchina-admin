import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleError } from '@/lib/api';
import { getUserIdFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/search/history
 * 记录搜索历史
 * 
 * 功能：
 * - 记录用户搜索关键词
 * - 用于统计热门搜索
 * - 支持未登录用户（userId 为 null）
 */
export async function POST(req: NextRequest) {
  try {
    const { keyword } = await req.json();

    if (!keyword || keyword.trim().length === 0) {
      return errorResponse('Keyword is required', 400);
    }

    // 获取用户 ID（可能为 null）
    const userId = await getUserIdFromToken(req).catch(() => null);

    // 如果没有登录，不记录历史
    if (!userId) {
      return successResponse({});
    }

    // 记录搜索历史
    await prisma.searchHistory.create({
      data: {
        userId,
        query: keyword.trim(),
      },
    });

    return successResponse({});
  } catch (error) {
    console.error('[Search History Error]', error);
    return handleError(error);
  }
}
