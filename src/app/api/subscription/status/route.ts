import { NextRequest } from 'next/server';
import { getUserSubscription } from '@/lib/subscription';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { successResponse, errorResponse } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    // 从 JWT token 获取 userId，移除 query 参数依赖
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const userId = auth.sub;

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // 获取订阅信息
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return successResponse({
        planType: 'FREE',
        status: 'ACTIVE',
        isPremium: false,
      });
    }

    return successResponse({
      planType: subscription.planType,
      status: subscription.status,
      isPremium: subscription.isPremium,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return errorResponse('Failed to get subscription status', 500);
  }
}
