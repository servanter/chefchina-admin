import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      console.error('[Checkout Status API] Stripe not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: isDevelopment 
            ? 'Stripe not configured' 
            : 'Payment service unavailable' 
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      console.error('[Checkout Status API] Missing session_id parameter');
      return NextResponse.json(
        { success: false, error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    console.log('[Checkout Status API] Checking status for session:', sessionId);

    // 1. 查询 Stripe Session 状态
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      console.error('[Checkout Status API] Stripe API error:', stripeError);
      return NextResponse.json(
        {
          success: false,
          error: isDevelopment
            ? `Stripe error: ${stripeError instanceof Error ? stripeError.message : 'Unknown'}`
            : 'Failed to retrieve payment status',
        },
        { status: 500 }
      );
    }

    console.log('[Checkout Status API] Stripe session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      subscription: session.subscription,
    });

    // 2. 如果支付未完成，返回 pending 状态
    if (session.payment_status !== 'paid') {
      console.log('[Checkout Status API] Payment not completed yet');
      return NextResponse.json({
        success: true,
        data: {
          status: 'pending',
        },
      });
    }

    // 3. 支付成功，查询订阅信息
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      console.error('[Checkout Status API] No subscription ID in session');
      return NextResponse.json(
        {
          success: false,
          error: 'No subscription found in session',
        },
        { status: 500 }
      );
    }

    // 4. 从数据库查询订阅详情
    let subscription;
    try {
      subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });
    } catch (dbError) {
      console.error('[Checkout Status API] Database error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: isDevelopment
            ? `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown'}`
            : 'Failed to retrieve subscription',
        },
        { status: 500 }
      );
    }

    if (!subscription) {
      console.warn('[Checkout Status API] Subscription not found in database (might be processing)');
      // Webhook 可能还没处理完，返回 pending
      return NextResponse.json({
        success: true,
        data: {
          status: 'pending',
        },
      });
    }

    console.log('[Checkout Status API] Subscription found:', {
      id: subscription.id,
      planType: subscription.planType,
      status: subscription.status,
    });

    // 5. 返回完整订阅信息
    return NextResponse.json({
      success: true,
      data: {
        status: 'complete',
        subscription: {
          planType: subscription.planType,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('[Checkout Status API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (isDevelopment && errorStack) {
      console.error('[Checkout Status API] Error stack:', errorStack);
    }

    return NextResponse.json(
      {
        success: false,
        error: isDevelopment
          ? `Unexpected error: ${errorMessage}`
          : 'Failed to check payment status',
      },
      { status: 500 }
    );
  }
}
