// src/app/api/ai/generated-recipes/[id]/route.ts
// GET /api/ai/generated-recipes/:id - 获取生成的菜谱详情

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleError,
  ERROR_CODES,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/ai/generated-recipes/:id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 认证检查
    const { userId } = await requireAuth(req);

    // 2. 查询生成记录
    const generated = await prisma.aiGeneratedRecipe.findUnique({
      where: { id: params.id },
    });

    if (!generated) {
      return errorResponse("生成记录不存在", 404, ERROR_CODES.NOT_FOUND);
    }

    if (generated.userId !== userId) {
      return errorResponse("无权访问", 403, ERROR_CODES.FORBIDDEN);
    }

    // 3. 检查是否过期
    const isExpired = new Date() > generated.expiresAt;

    // 4. 格式化响应
    const data = generated.generatedData as any;

    return successResponse({
      id: generated.id,
      titleZh: data.titleZh,
      titleEn: data.titleEn,
      descriptionZh: data.descriptionZh,
      descriptionEn: data.descriptionEn,
      ingredients: data.ingredients,
      steps: data.steps,
      nutrition: data.nutrition,
      difficulty: data.difficulty,
      cookTime: data.cookTimeMin,
      servings: data.servings,
      tags: data.tags || [],
      isPublished: generated.isPublished,
      recipeId: generated.recipeId,
      createdAt: generated.createdAt.toISOString(),
      expiresAt: generated.expiresAt.toISOString(),
      isExpired,
      inputIngredients: generated.inputIngredients,
    });
  } catch (error) {
    console.error("[AI Generated Detail] Error:", error);
    return handleError(error);
  }
}
