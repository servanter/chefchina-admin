import Stripe from 'stripe';

const isDevelopment = process.env.NODE_ENV === 'development';

// 环境变量兼容层：支持多种变量名
function getEnvVar(primaryKey: string, fallbackKeys: string[] = []): string | undefined {
  // 首先检查主键
  if (process.env[primaryKey]) {
    return cleanEnvValue(process.env[primaryKey]!);
  }
  
  // 然后检查备用键
  for (const key of fallbackKeys) {
    if (process.env[key]) {
      if (isDevelopment) {
        console.warn(`[Stripe Config] Using fallback env var ${key} instead of ${primaryKey}`);
      }
      return cleanEnvValue(process.env[key]!);
    }
  }
  
  return undefined;
}

/**
 * 清理环境变量值：移除多余的引号和空格
 * 修复 Vercel 环境变量配置时可能出现的引号问题
 */
function cleanEnvValue(value: string): string {
  const original = value;
  
  // 移除首尾空格
  value = value.trim();
  
  // 移除首尾的单引号或双引号
  value = value.replace(/^["']|["']$/g, '');
  
  // 如果值被改变了，在开发环境中警告
  if (isDevelopment && original !== value) {
    console.warn(`[Stripe Config] Cleaned env value: "${original}" -> "${value}"`);
    console.warn('  ⚠️  Please remove quotes from environment variable in Vercel dashboard');
  }
  
  return value;
}

// 获取 Stripe Secret Key（支持多种变量名）
const STRIPE_SECRET_KEY = getEnvVar('STRIPE_SECRET_KEY', ['STRIPE_API_KEY', 'STRIPE_KEY']);

// Stripe 配置（在构建时可能为空）
export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
    })
  : null;

// Stripe Price IDs (需要在 Stripe Dashboard 中创建)
// 支持多种环境变量命名方式
export const STRIPE_PRICES = {
  PREMIUM_MONTHLY: 
    getEnvVar('STRIPE_PRICE_PREMIUM_MONTHLY', [
      'STRIPE_PRICE_ID_MONTHLY',
      'STRIPE_MONTHLY_PRICE_ID'
    ]) || 'price_premium_monthly',
  PREMIUM_YEARLY: 
    getEnvVar('STRIPE_PRICE_PREMIUM_YEARLY', [
      'STRIPE_PRICE_ID_YEARLY',
      'STRIPE_YEARLY_PRICE_ID'
    ]) || 'price_premium_yearly',
  PREMIUM_FIRST_MONTH: 
    getEnvVar('STRIPE_PRICE_PREMIUM_FIRST_MONTH', [
      'STRIPE_PRICE_ID_FIRST_MONTH',
      'STRIPE_FIRST_MONTH_PRICE_ID'
    ]) || 'price_premium_first_month',
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

// 启动时配置检查（仅开发环境）
if (isDevelopment) {
  console.log('\n[Stripe Config] Configuration check:');
  console.log('  Secret Key:', STRIPE_SECRET_KEY ? `✓ Set (${STRIPE_SECRET_KEY.substring(0, 7)}...)` : '✗ Not set');
  console.log('  Prices:');
  
  Object.entries(STRIPE_PRICES).forEach(([key, value]) => {
    const isDefault = value.startsWith('price_premium_');
    const status = isDefault ? '⚠ Using default (NOT REAL)' : '✓ Set';
    console.log(`    ${key}: ${status} (${value})`);
    
    // 检查是否包含引号（不应该有）
    if (value.includes('"') || value.includes("'")) {
      console.error(`    ❌ ${key} contains quotes! This will cause Stripe API errors.`);
      console.error(`       Please remove quotes from the environment variable.`);
    }
  });
  
  // 警告：如果使用默认值
  const hasDefaultPrices = Object.values(STRIPE_PRICES).some(v => v.startsWith('price_premium_'));
  if (hasDefaultPrices) {
    console.warn('\n⚠️  WARNING: Some Price IDs are using DEFAULT values!');
    console.warn('   These are NOT real Stripe Price IDs.');
    console.warn('   Please set the following environment variables:');
    console.warn('     - STRIPE_PRICE_PREMIUM_MONTHLY');
    console.warn('     - STRIPE_PRICE_PREMIUM_YEARLY');
    console.warn('     - STRIPE_PRICE_PREMIUM_FIRST_MONTH\n');
  }
  
  if (!STRIPE_SECRET_KEY) {
    console.warn('\n⚠️  WARNING: STRIPE_SECRET_KEY is not set!');
    console.warn('   Stripe functionality will not work.\n');
  }
}

/**
 * 验证 Stripe 配置是否完整
 */
export function validateStripeConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY is not configured');
  } else if (!STRIPE_SECRET_KEY.startsWith('sk_test_') && !STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    errors.push('STRIPE_SECRET_KEY has invalid format (should start with sk_test_ or sk_live_)');
  }
  
  // 检查 Price IDs 是否是真实的（不是默认占位符）
  Object.entries(STRIPE_PRICES).forEach(([key, value]) => {
    if (value.startsWith('price_premium_')) {
      errors.push(`${key} is using a default placeholder value, not a real Stripe Price ID`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
