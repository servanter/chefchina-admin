/**
 * 修复订阅日期脚本
 * 
 * 问题：部分订阅的 currentPeriodStart 和 currentPeriodEnd 时间完全一样
 * 原因：Stripe Webhook 处理时，如果 Stripe 没返回时间戳，使用了 new Date()
 * 解决：从 Stripe API 获取正确时间，更新数据库
 * 
 * 使用方法：
 *   npx tsx scripts/fix-subscription-dates.ts [--dry-run] [--verbose]
 */

import { PrismaClient } from '../src/generated/prisma';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// 从环境变量读取 Stripe Secret Key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY 环境变量未设置');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia',
});

// 命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

interface BrokenSubscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  status: string;
  planType: string;
}

interface FixResult {
  subscriptionId: string;
  userId: string;
  oldStart: string | null;
  oldEnd: string | null;
  newStart: string;
  newEnd: string;
  status: 'success' | 'error';
  error?: string;
}

async function findBrokenSubscriptions(): Promise<BrokenSubscription[]> {
  console.log('🔍 正在查找有问题的订阅记录...\n');

  const subscriptions = await prisma.subscription.findMany({
    where: {
      AND: [
        { currentPeriodStart: { not: null } },
        { currentPeriodEnd: { not: null } },
        { stripeSubscriptionId: { not: null } },
        {
          OR: [
            { status: 'ACTIVE' },
            { status: 'TRIAL' },
          ],
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      stripeSubscriptionId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      status: true,
      planType: true,
    },
  });

  // 筛选出 start === end 的记录
  const broken = subscriptions.filter((sub) => {
    if (!sub.currentPeriodStart || !sub.currentPeriodEnd) return false;
    const diff = Math.abs(
      sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()
    );
    return diff < 1000; // 时间差小于 1 秒，认为是同一时间
  });

  console.log(`📊 找到 ${broken.length} 条有问题的订阅记录（共 ${subscriptions.length} 条）\n`);

  if (isVerbose && broken.length > 0) {
    console.log('详细列表：');
    broken.forEach((sub) => {
      console.log(`  - ID: ${sub.id}`);
      console.log(`    User: ${sub.userId}`);
      console.log(`    Stripe Sub: ${sub.stripeSubscriptionId}`);
      console.log(`    Start: ${sub.currentPeriodStart?.toISOString()}`);
      console.log(`    End: ${sub.currentPeriodEnd?.toISOString()}`);
      console.log(`    Status: ${sub.status} | Plan: ${sub.planType}\n`);
    });
  }

  return broken;
}

async function fixSubscription(sub: BrokenSubscription): Promise<FixResult> {
  if (!sub.stripeSubscriptionId) {
    return {
      subscriptionId: sub.id,
      userId: sub.userId,
      oldStart: sub.currentPeriodStart?.toISOString() || null,
      oldEnd: sub.currentPeriodEnd?.toISOString() || null,
      newStart: '',
      newEnd: '',
      status: 'error',
      error: 'No Stripe Subscription ID',
    };
  }

  try {
    // 从 Stripe 获取正确时间
    const stripeSubscription = await stripe.subscriptions.retrieve(
      sub.stripeSubscriptionId
    );

    if (!stripeSubscription.current_period_start || !stripeSubscription.current_period_end) {
      throw new Error('Stripe 返回的订阅没有时间戳');
    }

    const correctStart = new Date(stripeSubscription.current_period_start * 1000);
    const correctEnd = new Date(stripeSubscription.current_period_end * 1000);

    if (isVerbose) {
      console.log(`  ✓ 从 Stripe 获取到正确时间:`);
      console.log(`    Start: ${correctStart.toISOString()}`);
      console.log(`    End: ${correctEnd.toISOString()}`);
    }

    // 更新数据库
    if (!isDryRun) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodStart: correctStart,
          currentPeriodEnd: correctEnd,
        },
      });
    }

    return {
      subscriptionId: sub.id,
      userId: sub.userId,
      oldStart: sub.currentPeriodStart?.toISOString() || null,
      oldEnd: sub.currentPeriodEnd?.toISOString() || null,
      newStart: correctStart.toISOString(),
      newEnd: correctEnd.toISOString(),
      status: 'success',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ 修复失败: ${errorMessage}`);
    return {
      subscriptionId: sub.id,
      userId: sub.userId,
      oldStart: sub.currentPeriodStart?.toISOString() || null,
      oldEnd: sub.currentPeriodEnd?.toISOString() || null,
      newStart: '',
      newEnd: '',
      status: 'error',
      error: errorMessage,
    };
  }
}

async function main() {
  console.log('🔧 订阅日期修复脚本\n');
  console.log(`模式: ${isDryRun ? '🔍 Dry Run (不会实际修改)' : '✏️  实际修复模式'}\n`);

  try {
    // 1. 查找有问题的订阅
    const brokenSubs = await findBrokenSubscriptions();

    if (brokenSubs.length === 0) {
      console.log('✅ 没有发现需要修复的订阅记录！');
      return;
    }

    // 2. 修复每一条记录
    console.log(`${isDryRun ? '🔍 模拟' : '🔧 开始'}修复 ${brokenSubs.length} 条记录...\n`);

    const results: FixResult[] = [];
    for (let i = 0; i < brokenSubs.length; i++) {
      const sub = brokenSubs[i];
      console.log(`[${i + 1}/${brokenSubs.length}] 处理订阅 ${sub.id}...`);
      const result = await fixSubscription(sub);
      results.push(result);
    }

    // 3. 汇总结果
    const succeeded = results.filter((r) => r.status === 'success');
    const failed = results.filter((r) => r.status === 'error');

    console.log('\n========== 修复结果汇总 ==========\n');
    console.log(`✅ 成功: ${succeeded.length}`);
    console.log(`❌ 失败: ${failed.length}`);

    if (isDryRun) {
      console.log('\n⚠️  这是 Dry Run，数据库未被修改');
      console.log('移除 --dry-run 参数以实际执行修复');
    } else {
      console.log('\n✅ 数据库已更新！');
    }

    if (failed.length > 0) {
      console.log('\n失败的记录：');
      failed.forEach((r) => {
        console.log(`  - 订阅 ${r.subscriptionId}: ${r.error}`);
      });
    }
  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
