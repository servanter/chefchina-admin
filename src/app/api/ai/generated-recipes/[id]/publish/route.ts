// src/app/api/ai/generated-recipes/[id]/publish/route.ts
// POST /api/ai/generated-recipes/:id/publish - 发布生成的菜谱

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleError,
  ERROR_CODES,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";

// 发布请求 Schema（允许编辑）
const PublishSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  ingredients: z
    .array(
      z.object({
        nameZh: z.string(),
        nameEn: z.string(),
        amount: z.string(),
        unit: z.string().optional(),
        isOptional: z.boolean().optional(),
      })
    )
    .optional(),
  steps: z
    .array(
      z.object({
        stepNumber: z.number(),
        titleZh: z.string().optional(),
        titleEn: z.string().optional(),
        contentZh: z.string(),
        contentEn: z.string(),
        durationMin: z.number().optional(),
      })
    )
    .optional(),
  nutrition: z
    .object({
      calories: z.number(),
      protein: z.number(),
      fat: z.number(),
      carbs: z.number(),
      fiber: z.number().optional(),
      sodium: z.number().optional(),
      sugar: z.number().optional(),
    })
    .optional(),
  imageUrl: z.string().url().optional(),
});

// POST /api/ai/generated-recipes/:id/publish
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 认证检查
    const { userId } = await requireAuth(req);

    // 2. 解析请求体
    const body = await req.json();
    const editedData = PublishSchema.parse(body);

    // 3. 查询生成记录
    const generated = await prisma.aiGeneratedRecipe.findUnique({
      where: { id: params.id },
    });

    if (!generated) {
      return errorResponse("生成记录不存在", 404, ERROR_CODES.NOT_FOUND);
    }

    if (generated.userId !== userId) {
      return errorResponse("无权操作", 403, ERROR_CODES.FORBIDDEN);
    }

    if (generated.isPublished) {
      return errorResponse("已经发布过了", 400, ERROR_CODES.BAD_REQUEST);
    }

    // 4. 检查是否过期
    if (new Date() > generated.expiresAt) {
      return errorResponse("草稿已过期", 400, ERROR_CODES.BAD_REQUEST);
    }

    // 5. 合并生成数据和编辑数据
    const generatedData = generated.generatedData as any;

    const finalTitle = editedData.title || generatedData.titleZh;
    const finalDescription =
      editedData.description || generatedData.descriptionZh;
    const finalIngredients = editedData.ingredients || generatedData.ingredients;
    const finalSteps = editedData.steps || generatedData.steps;
    const finalNutrition = editedData.nutrition || generatedData.nutrition;

    // 6. 查询或创建默认分类（假设有一个 "AI生成" 分类）
    let category = await prisma.category.findFirst({
      where: { slug: "ai-generated" },
    });

    if (!category) {
      // 如果没有，创建一个
      category = await prisma.category.create({
        data: {
          nameEn: "AI Generated",
          nameZh: "AI 生成",
          slug: "ai-generated",
          sortOrder: 999,
        },
      });
    }

    // 7. 创建正式菜谱
    const recipe = await prisma.recipe.create({
      data: {
        authorId: userId,
        categoryId: category.id,
        titleEn: generatedData.titleEn,
        titleZh: finalTitle,
        descriptionEn: generatedData.descriptionEn,
        descriptionZh: finalDescription,
        coverImage: editedData.imageUrl,
        difficulty: generatedData.difficulty,
        prepTime: generatedData.prepTime || 10,
        cookTimeMin: generatedData.cookTimeMin,
        servings: generatedData.servings,
        calories: finalNutrition.calories,
        protein: finalNutrition.protein,
        fat: finalNutrition.fat,
        carbs: finalNutrition.carbs,
        fiber: finalNutrition.fiber,
        sodium: finalNutrition.sodium,
        sugar: finalNutrition.sugar,
        isPublished: true,
      },
    });

    // 8. 创建食材
    await prisma.ingredient.createMany({
      data: finalIngredients.map((ing: any) => ({
        recipeId: recipe.id,
        nameEn: ing.nameEn,
        nameZh: ing.nameZh,
        amount: ing.amount,
        unit: ing.unit || "",
        isOptional: ing.isOptional || false,
      })),
    });

    // 9. 创建步骤
    await prisma.recipeStep.createMany({
      data: finalSteps.map((step: any) => ({
        recipeId: recipe.id,
        stepNumber: step.stepNumber,
        titleEn: step.titleEn || "",
        titleZh: step.titleZh || "",
        contentEn: step.contentEn,
        contentZh: step.contentZh,
        durationMin: step.durationMin,
      })),
    });

    // 10. 更新生成记录
    await prisma.aiGeneratedRecipe.update({
      where: { id: params.id },
      data: {
        isPublished: true,
        recipeId: recipe.id,
      },
    });

    console.log(`[AI Publish] Published recipe ${recipe.id} from generated ${params.id}`);

    // 11. 返回结果
    return successResponse({
      recipeId: recipe.id,
      publishedAt: recipe.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[AI Publish] Error:", error);
    return handleError(error);
  }
}
