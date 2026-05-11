import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/subscription';
import { prisma } from '@/lib/prisma';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Checkout API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { userId, planType } = body;

    console.log('[Checkout API] Request received:', { userId, planType });

    // 验证必需字段
    if (!userId || !planType) {
      console.error('[Checkout API] Missing required fields:', { userId, planType });
      return NextResponse.json(
        { error: 'Missing required fields: userId, planType' },
        { status: 400 }
      );
    }

    // 验证计划类型
    if (!['monthly', 'yearly', 'first-month'].includes(planType)) {
      console.error('[Checkout API] Invalid plan type:', planType);
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    // 检查 Stripe 配置
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Checkout API] STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        {
          error: isDevelopment
            ? 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
            : 'Payment service is not available',
        },
        { status: 503 }
      );
    }

    // 验证 Price IDs
    const priceEnvVars = {
      monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
      yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
      'first-month': process.env.STRIPE_PRICE_PREMIUM_FIRST_MONTH,
    };

    if (!priceEnvVars[planType as keyof typeof priceEnvVars]) {
      console.error(`[Checkout API] Stripe Price ID not configured for plan: ${planType}`);
      return NextResponse.json(
        {
          error: isDevelopment
            ? `Stripe Price ID not configured for ${planType} plan`
            : 'Payment configuration error',
        },
        { status: 503 }
      );
    }

    // 检查用户是否存在
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (dbError) {
      console.error('[Checkout API] Database error when finding user:', dbError);
      return NextResponse.json(
        {
          error: isDevelopment
            ? `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
            : 'Database error',
        },
        { status: 500 }
      );
    }

    if (!user) {
      console.error('[Checkout API] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[Checkout API] User found:', { id: user.id, email: user.email });

    // 创建成功和取消 URL（使用环境变量 PUBLIC_URL 或 NEXTAUTH_URL）
    const baseUrl = process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing`;

    console.log('[Checkout API] Creating checkout session with URLs:', {
      successUrl,
      cancelUrl,
    });

    // 创建 Checkout Session
    let session;
    try {
      session = await createCheckoutSession(userId, planType, successUrl, cancelUrl);
    } catch (checkoutError) {
      console.error('[Checkout API] Error in createCheckoutSession:', checkoutError);
      const errorMessage =
        checkoutError instanceof Error ? checkoutError.message : 'Unknown error';

      return NextResponse.json(
        {
          error: isDevelopment
            ? `Failed to create checkout session: ${errorMessage}`
            : 'Failed to create checkout session',
        },
        { status: 500 }
      );
    }

    console.log('[Checkout API] Checkout session created successfully:', {
      sessionId: session.sessionId,
      url: session.url,
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error) {
    console.error('[Checkout API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (isDevelopment && errorStack) {
      console.error('[Checkout API] Error stack:', errorStack);
    }

    return NextResponse.json(
      {
        error: isDevelopment
          ? `Unexpected error: ${errorMessage}`
          : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
