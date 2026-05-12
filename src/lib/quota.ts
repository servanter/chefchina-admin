// src/lib/quota.ts
// AI 配额管理服务

import { prisma } from "@/lib/prisma";

// 配额配置
interface QuotaConfig {
  free: number;
  premium: number;
  resetPeriod: "daily" | "monthly";
}

const QUOTA_CONFIG = {
  analysis: { free: 3, premium: 20, resetPeriod: "daily" as const },
  generator: { free: 5, premium: 50, resetPeriod: "monthly" as const },
};

/**
 * 检查并更新配额
 * @param userId 用户 ID
 * @param feature AI 功能类型
 * @returns 配额检查结果
 */
export async function checkAndUpdateQuota(
  userId: string,
  feature: "analysis" | "generator"
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  // 1. 获取用户订阅状态
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  const isPremium =
    subscription?.status === "ACTIVE" && subscription.planType === "PREMIUM";

  // 2. 获取或创建配额记录
  let quota = await prisma.aiUsageQuota.findUnique({ where: { userId } });

  if (!quota) {
    quota = await prisma.aiUsageQuota.create({
      data: {
        userId,
        analysisUsedToday: 0,
        analysisResetAt: getNextMidnight(),
        generatorUsedThisMonth: 0,
        generatorResetAt: getFirstDayOfNextMonth(),
      },
    });
  }

  // 3. 检查是否需要重置
  const now = new Date();

  if (feature === "analysis" && now >= quota.analysisResetAt) {
    quota = await prisma.aiUsageQuota.update({
      where: { userId },
      data: {
        analysisUsedToday: 0,
        analysisResetAt: getNextMidnight(),
      },
    });
  }

  if (feature === "generator" && now >= quota.generatorResetAt) {
    quota = await prisma.aiUsageQuota.update({
      where: { userId },
      data: {
        generatorUsedThisMonth: 0,
        generatorResetAt: getFirstDayOfNextMonth(),
      },
    });
  }

  // 4. 检查配额
  const config = QUOTA_CONFIG[feature];
  const limit = isPremium ? config.premium : config.free;
  const used =
    feature === "analysis"
      ? quota.analysisUsedToday
      : quota.generatorUsedThisMonth;
  const allowed = used < limit;
  const resetAt =
    feature === "analysis" ? quota.analysisResetAt : quota.generatorResetAt;

  // 5. 如果允许，增加使用次数
  if (allowed) {
    await prisma.aiUsageQuota.update({
      where: { userId },
      data: {
        [feature === "analysis"
          ? "analysisUsedToday"
          : "generatorUsedThisMonth"]: used + 1,
      },
    });
  }

  return {
    allowed,
    remaining: Math.max(0, limit - used - (allowed ? 1 : 0)),
    resetAt,
  };
}

/**
 * 获取配额限制（不消耗）
 * @param userId 用户 ID
 * @returns 各功能的配额限制
 */
export async function getQuotaLimits(userId: string): Promise<{
  analysis: number;
  generator: number;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  const isPremium =
    subscription?.status === "ACTIVE" && subscription.planType === "PREMIUM";

  return {
    analysis: isPremium
      ? QUOTA_CONFIG.analysis.premium
      : QUOTA_CONFIG.analysis.free,
    generator: isPremium
      ? QUOTA_CONFIG.generator.premium
      : QUOTA_CONFIG.generator.free,
  };
}

/**
 * 获取明天 00:00
 */
function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * 获取下月 1 号 00:00
 */
function getFirstDayOfNextMonth(): Date {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}
