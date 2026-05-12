// src/app/api/ai/generate-recipe/route.ts
// POST /api/ai/generate-recipe - 生成菜谱 API

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleError,
  ERROR_CODES,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { checkAndUpdateQuota } from "@/lib/quota";
import { generateRecipe, GeneratorInput } from "@/services/aiRecipeGenerator";

// 输入验证 Schema
const GenerateRecipeSchema = z.object({
  ingredients: z
    .array(z.string().trim().min(1))
    .min(1, "至少需要 1 个食材")
    .max(10, "最多支持 10 个食材"),
  style: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  cookTime: z.number().int().min(5).max(300).optional(),
  servings: z.number().int().min(1).max(20).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
});

// POST /api/ai/generate-recipe
export async function POST(req: NextRequest) {
  try {
    // 1. 认证检查
    const { userId } = await requireAuth(req);

    // 2. 解析请求体
    const body = await req.json();
    const input = GenerateRecipeSchema.parse(body);

    // 3. 配额检查
    const quotaResult = await checkAndUpdateQuota(userId, "generator");
    if (!quotaResult.allowed) {
      return errorResponse(
        "QUOTA_EXCEEDED",
        403,
        ERROR_CODES.QUOTA_EXCEEDED,
        {
          resetAt: quotaResult.resetAt,
          remaining: quotaResult.remaining,
        }
      );
    }

    // 4. 调用 LLM 生成菜谱
    console.log("[AI Generate] Starting generation for user:", userId);
    console.log("[AI Generate] Input:", input);

    const generatedRecipe = await generateRecipe(input as GeneratorInput);

    console.log("[AI Generate] Generation successful");

    // 5. 保存到数据库（草稿状态）
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天后

    const saved = await prisma.aiGeneratedRecipe.create({
      data: {
        userId,
        inputIngredients: input.ingredients,
        style: input.style,
        difficulty: input.difficulty,
        generatedData: generatedRecipe as any, // Prisma Json type
        isPublished: false,
        expiresAt,
      },
    });

    console.log("[AI Generate] Saved to database:", saved.id);

    // 6. 返回结果
    return successResponse({
      generatedId: saved.id,
      title: generatedRecipe.titleZh,
      description: generatedRecipe.descriptionZh,
      ingredients: generatedRecipe.ingredients,
      steps: generatedRecipe.steps,
      cookTime: generatedRecipe.cookTimeMin,
      servings: generatedRecipe.servings,
      difficulty: generatedRecipe.difficulty,
      nutrition: generatedRecipe.nutrition,
      expiresAt: saved.expiresAt.toISOString(),
      quotaRemaining: quotaResult.remaining,
    });
  } catch (error: any) {
    console.error("[AI Generate] Error:", error);

    // 错误分类
    if (error.message === "QUOTA_EXCEEDED") {
      return errorResponse("配额已用尽", 403, ERROR_CODES.QUOTA_EXCEEDED);
    }
    if (error.message === "AI_INVALID_RESPONSE") {
      return errorResponse(
        "AI 生成失败，请重试",
        500,
        ERROR_CODES.AI_SERVICE_ERROR
      );
    }
    if (error.message === "AI_SERVICE_ERROR") {
      return errorResponse(
        "AI 服务暂时不可用",
        503,
        ERROR_CODES.AI_SERVICE_ERROR
      );
    }

    return handleError(error);
  }
}
