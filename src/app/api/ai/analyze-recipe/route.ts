// src/app/api/ai/analyze-recipe/route.ts
// AI 菜谱适配分析 API

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { checkAndUpdateQuota } from "@/lib/quota";
import { callLLM, buildAnalysisPrompt } from "@/lib/llm";

// ✅ FIX: Set timeout to 30 seconds (Next.js 15 route config)
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // 1. 认证
    const authResult = requireAuth(req);
    if (authResult instanceof Response) {
      return authResult; // 401
    }
    const userId = authResult.sub;

    // 2. 解析请求
    const { recipeId, language = 'zh' } = await req.json(); // ✅ FIX: 接收 language 参数
    console.log('[AI Analysis] Received language:', language, 'recipeId:', recipeId);
    if (!recipeId) {
      return NextResponse.json(
        { success: false, error: "RECIPE_ID_REQUIRED" },
        { status: 400 }
      );
    }

    // 3. 检查用户健康档案
    const profile = await prisma.userHealthProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "PROFILE_REQUIRED",
          message: "请先设置健康档案",
        },
        { status: 400 }
      );
    }

    // 4. 检查配额
    const quota = await checkAndUpdateQuota(userId, "analysis");
    if (!quota.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "QUOTA_EXCEEDED",
          resetAt: quota.resetAt,
        },
        { status: 429 }
      );
    }

    // 5. 查询菜谱（包含食材）
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: "RECIPE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 验证营养数据完整性
    if (!recipe.calories || !recipe.protein || !recipe.fat || !recipe.carbs) {
      return NextResponse.json(
        {
          success: false,
          error: "NUTRITION_DATA_MISSING",
          message: "该菜谱缺少营养数据，无法分析",
        },
        { status: 400 }
      );
    }

    // 6. 检查缓存（7天内有效）
    const cached = await prisma.aiRecipeAnalysis.findFirst({
      where: {
        userId,
        recipeId,
        expiresAt: { gte: new Date() },
      },
    });

    if (cached) {
      return NextResponse.json({
        success: true,
        data: {
          analysisId: cached.id,
          matchScore: cached.matchScore,
          summary: cached.summary,
          pros: cached.pros,
          cons: cached.cons,
          modifications: cached.modifications,
          alternatives: cached.alternatives,
        },
        quotaRemaining: quota.remaining,
        cached: true,
      });
    }

    // 7. 调用 AI 分析
    const prompt = buildAnalysisPrompt(
      {
        titleZh: recipe.titleZh,
        calories: recipe.calories!,
        protein: recipe.protein!,
        fat: recipe.fat!,
        carbs: recipe.carbs!,
        sodium: recipe.sodium,
        sugar: recipe.sugar,
        fiber: recipe.fiber,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
      },
      profile,
      language as 'zh' | 'en' // ✅ FIX: 传递 language 参数
    );
    const analysis = await callLLM(prompt, { 
      temperature: 0.7,
      language: language as 'zh' | 'en' // ✅ FIX: 传递 language 参数到 callLLM
    });

    // 验证结果格式
    if (
      typeof analysis.matchScore !== "number" ||
      analysis.matchScore < 0 ||
      analysis.matchScore > 100
    ) {
      throw new Error("Invalid AI response: matchScore");
    }

    // 8. 保存结果（过期时间：7天）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const saved = await prisma.aiRecipeAnalysis.create({
      data: {
        userId,
        recipeId,
        matchScore: analysis.matchScore,
        summary: analysis.summary,
        pros: analysis.pros || [],
        cons: analysis.cons || [],
        modifications: analysis.modifications || [],
        alternatives: [],
        expiresAt,
      },
    });

    // 9. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        analysisId: saved.id,
        matchScore: saved.matchScore,
        summary: saved.summary,
        pros: saved.pros,
        cons: saved.cons,
        modifications: saved.modifications,
        alternatives: saved.alternatives,
      },
      quotaRemaining: quota.remaining,
    });
  } catch (error) {
    console.error("AI analyze-recipe error:", error);

    // 区分不同类型的错误
    if (error instanceof Error) {
      if (error.message.includes("AI_RATE_LIMIT")) {
        return NextResponse.json(
          {
            success: false,
            error: "AI_SERVICE_BUSY",
            message: "AI 服务繁忙，请稍后再试",
          },
          { status: 503 }
        );
      }
      if (error.message.includes("AI_SERVICE_ERROR")) {
        return NextResponse.json(
          { success: false, error: "AI_SERVICE_ERROR", message: "AI 服务异常" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
