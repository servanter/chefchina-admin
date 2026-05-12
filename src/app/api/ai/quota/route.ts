// src/app/api/ai/quota/route.ts
// AI 配额查询 API

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. 认证
    const authResult = requireAuth(req);
    if (authResult instanceof Response) {
      return authResult; // 401
    }
    const userId = authResult.sub;

    // 2. 获取用户订阅状态
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    const isPremium =
      subscription?.status === "ACTIVE" &&
      subscription.planType === "PREMIUM";

    // 3. 获取配额记录
    let quota = await prisma.aiUsageQuota.findUnique({ where: { userId } });

    if (!quota) {
      // 创建默认配额记录
      const nextMidnight = new Date();
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);

      quota = await prisma.aiUsageQuota.create({
        data: {
          userId,
          analysisUsedToday: 0,
          analysisResetAt: nextMidnight,
          generatorUsedThisMonth: 0,
          generatorResetAt: nextMonth,
        },
      });
    }

    // 4. 检查是否需要重置
    const now = new Date();
    if (now >= quota.analysisResetAt) {
      const nextMidnight = new Date(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      quota = await prisma.aiUsageQuota.update({
        where: { userId },
        data: {
          analysisUsedToday: 0,
          analysisResetAt: nextMidnight,
        },
      });
    }

    if (now >= quota.generatorResetAt) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);

      quota = await prisma.aiUsageQuota.update({
        where: { userId },
        data: {
          generatorUsedThisMonth: 0,
          generatorResetAt: nextMonth,
        },
      });
    }

    // 5. 返回配额信息
    const analysisLimit = isPremium ? 20 : 3;
    const generatorLimit = isPremium ? 50 : 5;

    return NextResponse.json({
      success: true,
      data: {
        isPremium,
        analysis: {
          used: quota.analysisUsedToday,
          limit: analysisLimit,
          remaining: Math.max(0, analysisLimit - quota.analysisUsedToday),
          resetAt: quota.analysisResetAt.toISOString(),
        },
        generator: {
          used: quota.generatorUsedThisMonth,
          limit: generatorLimit,
          remaining: Math.max(0, generatorLimit - quota.generatorUsedThisMonth),
          resetAt: quota.generatorResetAt.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("AI quota query error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
