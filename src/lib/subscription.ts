import { prisma } from '@/lib/prisma';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import Stripe from 'stripe';

export type PlanType = 'monthly' | 'yearly' | 'first-month';

/**
 * 创建 Stripe Checkout Session
 */
export async function createCheckoutSession(
  userId: string,
  planType: PlanType,
  successUrl: string,
  cancelUrl: string
) {
  console.log('[Subscription] Creating checkout session:', { userId, planType });

  if (!stripe) {
    console.error('[Subscription] Stripe is not configured');
    throw new Error('Stripe is not configured');
  }
  
  // 获取用户信息
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
  } catch (dbError) {
    console.error('[Subscription] Database error fetching user:', dbError);
    throw new Error('Database error: Failed to fetch user');
  }

  if (!user) {
    console.error('[Subscription] User not found:', userId);
    throw new Error('User not found');
  }

  console.log('[Subscription] User found:', { 
    id: user.id, 
    email: user.email,
    hasSubscription: !!user.subscription,
    customerId: user.subscription?.stripeCustomerId 
  });

  // 获取 Price ID
  let priceId: string;
  let trialDays = 14;

  switch (planType) {
    case 'monthly':
      priceId = STRIPE_PRICES.PREMIUM_MONTHLY;
      break;
    case 'yearly':
      priceId = STRIPE_PRICES.PREMIUM_YEARLY;
      break;
    case 'first-month':
      priceId = STRIPE_PRICES.PREMIUM_FIRST_MONTH;
      trialDays = 0;
      break;
    default:
      console.error('[Subscription] Invalid plan type:', planType);
      throw new Error('Invalid plan type');
  }

  console.log('[Subscription] Price configuration:', { priceId, trialDays });

  // 创建或获取 Stripe Customer
  let customerId = user.subscription?.stripeCustomerId;

  if (!customerId) {
    console.log('[Subscription] Creating new Stripe customer');
    try {
      const customer = await stripe!.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
      console.log('[Subscription] Stripe customer created:', customerId);
    } catch (stripeError) {
      console.error('[Subscription] Error creating Stripe customer:', stripeError);
      throw new Error(
        `Failed to create Stripe customer: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`
      );
    }

    // 更新用户订阅记录
    try {
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          planType: 'FREE',
          status: 'ACTIVE',
          stripeCustomerId: customerId,
        },
        update: {
          stripeCustomerId: customerId,
        },
      });
      console.log('[Subscription] Subscription record updated with customer ID');
    } catch (dbError) {
      console.error('[Subscription] Error updating subscription record:', dbError);
      // 不抛出错误，因为客户已经创建了，我们仍然可以继续
      console.warn('[Subscription] Continuing despite database update error');
    }
  } else {
    console.log('[Subscription] Using existing Stripe customer:', customerId);
  }

  // 创建 Checkout Session
  console.log('[Subscription] Creating Stripe checkout session');
  let session;
  try {
    session = await stripe!.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data:
        trialDays > 0
          ? {
              trial_period_days: trialDays,
            }
          : undefined,
      metadata: {
        userId: user.id,
        planType,
      },
    });
  } catch (stripeError) {
    console.error('[Subscription] Error creating checkout session:', stripeError);
    throw new Error(
      `Failed to create Stripe checkout session: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`
    );
  }

  console.log('[Subscription] Checkout session created successfully:', {
    sessionId: session.id,
    url: session.url,
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * 处理 Stripe Webhook 事件
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutComplete(session: any) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('No subscription ID in session');
    return;
  }

  // 获取订阅详情
  const subscription = await stripe!.subscriptions.retrieve(subscriptionId) as any;

  // 将 Unix 时间戳（秒）转换为 Date 对象（毫秒）
  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date();
  const trialStart = subscription.trial_start
    ? new Date(subscription.trial_start * 1000)
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  await prisma.subscription.update({
    where: { userId },
    data: {
      stripeSubscriptionId: subscriptionId,
      planType: 'PREMIUM',
      status: subscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
    },
  });

  // 记录支付交易
  await prisma.paymentTransaction.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      stripePaymentId: session.payment_intent as string,
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      status: 'SUCCEEDED',
      paymentMethod: session.payment_method_types?.[0] || null,
      metadata: {
        sessionId: session.id,
        planType: session.metadata?.planType,
      },
    },
  });
}

async function handleSubscriptionUpdate(subscription: any) {
  const customerId = subscription.customer as string;
  const customer = await stripe!.customers.retrieve(customerId);

  if (customer.deleted) {
    console.error('Customer was deleted');
    return;
  }

  const userId = customer.metadata?.userId;
  if (!userId) {
    console.error('No userId in customer metadata');
    return;
  }

  // 将 Unix 时间戳（秒）转换为 Date 对象（毫秒）
  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date();
  const trialStart = subscription.trial_start
    ? new Date(subscription.trial_start * 1000)
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  await prisma.subscription.update({
    where: { userId },
    data: {
      stripeSubscriptionId: subscription.id,
      planType: 'PREMIUM',
      status: subscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
    },
  });
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer as string;
  const customer = await stripe!.customers.retrieve(customerId);

  if (customer.deleted) {
    console.error('Customer was deleted');
    return;
  }

  const userId = customer.metadata?.userId;
  if (!userId) {
    console.error('No userId in customer metadata');
    return;
  }

  await prisma.subscription.update({
    where: { userId },
    data: {
      planType: 'FREE',
      status: 'CANCELLED',
    },
  });
}

async function handlePaymentSuccess(invoice: any) {
  const customerId = invoice.customer as string;
  const customer = await stripe!.customers.retrieve(customerId);

  if (customer.deleted) {
    console.error('Customer was deleted');
    return;
  }

  const userId = customer.metadata?.userId;
  if (!userId) {
    console.error('No userId in customer metadata');
    return;
  }

  await prisma.paymentTransaction.create({
    data: {
      userId,
      subscriptionId: invoice.subscription as string,
      stripePaymentId: invoice.payment_intent as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'SUCCEEDED',
      receiptUrl: invoice.hosted_invoice_url || null,
      metadata: {
        invoiceId: invoice.id,
      },
    },
  });
}

async function handlePaymentFailed(invoice: any) {
  const customerId = invoice.customer as string;
  const customer = await stripe!.customers.retrieve(customerId);

  if (customer.deleted) {
    console.error('Customer was deleted');
    return;
  }

  const userId = customer.metadata?.userId;
  if (!userId) {
    console.error('No userId in customer metadata');
    return;
  }

  await prisma.paymentTransaction.create({
    data: {
      userId,
      subscriptionId: invoice.subscription as string,
      stripePaymentId: invoice.payment_intent as string,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'FAILED',
      errorMessage: invoice.last_finalization_error?.message || 'Payment failed',
      metadata: {
        invoiceId: invoice.id,
      },
    },
  });
}

/**
 * 获取用户订阅状态
 */
export async function getUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return null;
  }

  // 检查试用期和订阅期是否过期
  const now = new Date();
  let isPremium = false;

  if (subscription.status === 'TRIAL' && subscription.trialEnd) {
    isPremium = subscription.trialEnd > now;
  } else if (subscription.status === 'ACTIVE' && subscription.currentPeriodEnd) {
    isPremium = subscription.currentPeriodEnd > now;
  }

  // 修复：强制序列化 Date 为 ISO 字符串，避免序列化时的时区问题
  return {
    ...subscription,
    isPremium,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
    trialStart: subscription.trialStart?.toISOString(),
    trialEnd: subscription.trialEnd?.toISOString(),
  };
}

/**
 * 检查用户是否为 Premium
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription?.isPremium || false;
}
