import { NextResponse } from 'next/server';

/**
 * 配置验证端点
 * 返回环境变量配置状态（不暴露真实值）
 * 用于诊断 Stripe 配置问题
 */
export async function GET() {
  const config = {
    stripe: {
      secretKey: !!process.env.STRIPE_SECRET_KEY,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'missing',
      prices: {
        monthly: !!process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
        monthlyValue: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'not set',
        yearly: !!process.env.STRIPE_PRICE_PREMIUM_YEARLY,
        yearlyValue: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'not set',
        firstMonth: !!process.env.STRIPE_PRICE_PREMIUM_FIRST_MONTH,
        firstMonthValue: process.env.STRIPE_PRICE_PREMIUM_FIRST_MONTH || 'not set',
      },
    },
    nextauth: {
      url: !!process.env.NEXTAUTH_URL,
      urlValue: process.env.NEXTAUTH_URL || 'not set',
    },
    environment: process.env.NODE_ENV || 'unknown',
  };

  // 检查是否有配置问题
  const issues: string[] = [];

  if (!config.stripe.secretKey) {
    issues.push('STRIPE_SECRET_KEY is not set');
  } else if (
    !config.stripe.secretKeyPrefix.startsWith('sk_test_') &&
    !config.stripe.secretKeyPrefix.startsWith('sk_live_')
  ) {
    issues.push('STRIPE_SECRET_KEY has invalid format (should start with sk_test_ or sk_live_)');
  }

  if (!config.stripe.prices.monthly) {
    issues.push('STRIPE_PRICE_PREMIUM_MONTHLY is not set');
  } else if (!config.stripe.prices.monthlyValue.startsWith('price_')) {
    issues.push(
      `STRIPE_PRICE_PREMIUM_MONTHLY has invalid format: ${config.stripe.prices.monthlyValue} (should start with price_)`
    );
  }

  if (!config.stripe.prices.yearly) {
    issues.push('STRIPE_PRICE_PREMIUM_YEARLY is not set');
  } else if (!config.stripe.prices.yearlyValue.startsWith('price_')) {
    issues.push(
      `STRIPE_PRICE_PREMIUM_YEARLY has invalid format: ${config.stripe.prices.yearlyValue} (should start with price_)`
    );
  }

  if (!config.stripe.prices.firstMonth) {
    issues.push('STRIPE_PRICE_PREMIUM_FIRST_MONTH is not set');
  } else if (!config.stripe.prices.firstMonthValue.startsWith('price_')) {
    issues.push(
      `STRIPE_PRICE_PREMIUM_FIRST_MONTH has invalid format: ${config.stripe.prices.firstMonthValue} (should start with price_)`
    );
  }

  if (!config.nextauth.url) {
    issues.push('NEXTAUTH_URL is not set');
  }

  return NextResponse.json({
    status: issues.length === 0 ? 'ok' : 'error',
    config,
    issues,
    timestamp: new Date().toISOString(),
  });
}
