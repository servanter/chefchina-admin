import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscription } from '@/lib/subscription';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 获取订阅信息
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return NextResponse.json({
        planType: 'FREE',
        status: 'ACTIVE',
        isPremium: false,
      });
    }

    return NextResponse.json({
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
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
