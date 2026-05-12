// src/app/api/ai/generated-recipes/route.ts
// GET /api/ai/generated-recipes - 获取生成历史列表

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/ai/generated-recipes
export async function GET(req: NextRequest) {
  try {
    // 1. 认证检查
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;
    const userId = auth.sub;

    // 2. 查询用户的生成历史
    const items = await prisma.aiGeneratedRecipe.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        generatedData: true,
        isPublished: true,
        recipeId: true,
        createdAt: true,
        expiresAt: true,
        inputIngredients: true,
      },
      take: 50, // 最多返回 50 条
    });

    // 3. 格式化响应
    const formattedItems = items.map((item) => {
      const data = item.generatedData as any;
      const isExpired = new Date() > item.expiresAt;

      return {
        id: item.id,
        title: data?.titleZh || "未命名菜谱",
        isPublished: item.isPublished,
        recipeId: item.recipeId,
        createdAt: item.createdAt.toISOString(),
        expiresAt: item.expiresAt.toISOString(),
        isExpired,
        inputIngredients: item.inputIngredients,
      };
    });

    return successResponse({
      items: formattedItems,
      nextCursor: null, // 暂不支持分页
    });
  } catch (error) {
    console.error("[AI History] Error:", error);
    return handleError(error);
  }
}
