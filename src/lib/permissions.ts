import { NextRequest, NextResponse } from 'next/server';
import { isPremiumUser } from './subscription';
import { prisma } from './prisma';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
}

/**
 * 检查用户是否为 Premium
 */
export async function requirePremium(request: AuthenticatedRequest) {
  const userId = request.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isPremium = await isPremiumUser(userId);

  if (!isPremium) {
    return NextResponse.json(
      {
        error: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
        message: 'This feature requires a Premium subscription',
      },
      { status: 403 }
    );
  }

  return null; // 通过验证
}

/**
 * 检查免费用户收藏上限
 */
export async function checkFavoritesLimit(userId: string): Promise<boolean> {
  const isPremium = await isPremiumUser(userId);

  if (isPremium) {
    return true; // Premium 无限制
  }

  // 免费用户检查收藏数量
  const favoritesCount = await prisma.favorite.count({
    where: { userId },
  });

  return favoritesCount < 20; // 免费用户最多 20 条
}

/**
 * 获取用户历史数据（考虑免费用户的 30 天限制）
 */
export async function getUserHistoryQuery(userId: string) {
  const isPremium = await isPremiumUser(userId);

  if (isPremium) {
    return {}; // Premium 无限制
  }

  // 免费用户只返回最近 30 天的数据
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return {
    createdAt: {
      gte: thirtyDaysAgo,
    },
  };
}

/**
 * 清理免费用户的过期历史数据（定时任务）
 */
export async function cleanupFreeUserHistory() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 获取所有免费用户
  const freeUsers = await prisma.subscription.findMany({
    where: {
      OR: [{ planType: 'FREE' }, { status: 'EXPIRED' }, { status: 'CANCELLED' }],
    },
    select: { userId: true },
  });

  const freeUserIds = freeUsers.map((s) => s.userId);

  // 删除过期的浏览历史
  const deletedBrowseHistory = await prisma.browseHistory.deleteMany({
    where: {
      userId: { in: freeUserIds },
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  // 删除过期的搜索历史
  const deletedSearchHistory = await prisma.searchHistory.deleteMany({
    where: {
      userId: { in: freeUserIds },
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  // 删除过期的每日摄入记录
  const deletedDailyIntakes = await prisma.dailyIntake.deleteMany({
    where: {
      userId: { in: freeUserIds },
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  console.log('Cleanup completed:', {
    browseHistory: deletedBrowseHistory.count,
    searchHistory: deletedSearchHistory.count,
    dailyIntakes: deletedDailyIntakes.count,
  });

  return {
    browseHistory: deletedBrowseHistory.count,
    searchHistory: deletedSearchHistory.count,
    dailyIntakes: deletedDailyIntakes.count,
  };
}
