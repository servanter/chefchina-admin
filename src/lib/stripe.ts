import Stripe from 'stripe';

// Stripe 配置（在构建时可能为空）
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
    })
  : null;

// Stripe Price IDs (需要在 Stripe Dashboard 中创建)
export const STRIPE_PRICES = {
  PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
  PREMIUM_YEARLY: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly',
  PREMIUM_FIRST_MONTH: process.env.STRIPE_PRICE_PREMIUM_FIRST_MONTH || 'price_premium_first_month',
};

// 价格配置
export const PRICING = {
  PREMIUM_MONTHLY: {
    amount: 499, // $4.99 in cents
    currency: 'usd',
    interval: 'month',
    trialDays: 14,
  },
  PREMIUM_YEARLY: {
    amount: 4999, // $49.99 in cents
    currency: 'usd',
    interval: 'year',
    trialDays: 14,
  },
  PREMIUM_FIRST_MONTH: {
    amount: 299, // $2.99 in cents
    currency: 'usd',
    interval: 'month',
    trialDays: 0,
  },
} as const;
