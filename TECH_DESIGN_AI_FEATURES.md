# 技术设计文档: ChefChina AI 功能套件

**文档版本**: v1.0  
**创建日期**: 2026-05-11  
**架构师**: chefchina-pm  
**实施团队**: chefchina-dev  

---

## 📋 目录

1. [架构概览](#架构概览)
2. [数据库设计](#数据库设计)
3. [API 实现细节](#api-实现细节)
4. [LLM 集成](#llm-集成)
5. [配额系统实现](#配额系统实现)
6. [前端组件设计](#前端组件设计)
7. [性能优化](#性能优化)
8. [安全考虑](#安全考虑)
9. [部署清单](#部署清单)

---

## 架构概览

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    ChefChina App                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Recipe Detail│  │ AI Generator │  │Shopping List │  │
│  │   + AI Btn   │  │     Page     │  │     Page     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js API Routes                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │/api/ai/      │  │/api/ai/      │  │/api/shopping-│  │
│  │analyze-recipe│  │generate-recipe│  │list          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ├──────────────────┴──────────────────┤
          ▼                                     ▼
┌──────────────────────┐            ┌─────────────────────┐
│   LLM Service        │            │  PostgreSQL         │
│  (Gongfeng AI)       │            │  + Prisma           │
│                      │            │                     │
│ - claude-sonnet-4-5  │            │ - ai_recipe_analysis│
│ - Prompt templates   │            │ - ai_generated_recipes│
│ - Retry logic        │            │ - ai_usage_quota    │
└──────────────────────┘            │ - subscriptions     │
                                    └─────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React Native (Expo), TypeScript, TailwindCSS |
| **后端** | Next.js 15 App Router, TypeScript |
| **数据库** | PostgreSQL (Supabase), Prisma ORM |
| **AI** | Gongfeng AI (Claude Sonnet 4.5) |
| **缓存** | Prisma 查询缓存 + SWR 前端缓存 |
| **部署** | Vercel |

---

## 数据库设计

### 1. Schema 定义

```prisma
// prisma/schema.prisma 新增内容

// ─────────────────────────────────────────
// AI 功能套件
// ─────────────────────────────────────────

// 1. AI 菜谱分析结果（缓存）
model AiRecipeAnalysis {
  id              String   @id @default(cuid())
  userId          String
  recipeId        String
  matchScore      Int      // 0-100
  summary         String   @db.Text
  pros            String[] // 优点列表
  cons            String[] // 缺点列表
  modifications   String[] // 改良建议
  alternatives    Json     // [{ recipeId, title, reason }]
  createdAt       DateTime @default(now())
  expiresAt       DateTime // 7天后过期

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([userId, recipeId], name: "user_recipe_unique")
  @@index([userId, createdAt])
  @@index([expiresAt]) // 用于定期清理
  @@map("ai_recipe_analysis")
}

// 2. AI 生成菜谱历史
model AiGeneratedRecipe {
  id              String   @id @default(cuid())
  userId          String
  recipeId        String?  // 发布后关联
  inputIngredients String[] // 用户输入的食材
  style           String?  // 川菜/粤菜/日式/西式
  difficulty      String?  // EASY/MEDIUM/HARD
  generatedData   Json     // AI 返回的完整 JSON
  isPublished     Boolean  @default(false)
  createdAt       DateTime @default(now())

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe Recipe? @relation(fields: [recipeId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([isPublished])
  @@map("ai_generated_recipes")
}

// 3. AI 使用配额跟踪
model AiUsageQuota {
  id                    String   @id @default(cuid())
  userId                String   @unique
  
  // 分析功能（每日重置）
  analysisUsedToday     Int      @default(0)
  analysisResetAt       DateTime // 下次重置时间（明天 00:00）
  
  // 生成功能（每月重置）
  generatorUsedThisMonth Int     @default(0)
  generatorResetAt      DateTime // 下次重置时间（下月 1 号）
  
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("ai_usage_quota")
}

// 修改现有 Model 添加关联

model User {
  // ... 现有字段
  aiAnalysis       AiRecipeAnalysis[]
  aiGeneratedRecipes AiGeneratedRecipe[]
  aiUsageQuota     AiUsageQuota?
}

model Recipe {
  // ... 现有字段
  aiAnalysis       AiRecipeAnalysis[]
  aiGeneratedFrom  AiGeneratedRecipe[]
}
```

### 2. Migration 脚本

```bash
# 创建 migration
npx prisma migrate dev --name ai_features

# 生成的文件：prisma/migrations/20260511_ai_features/migration.sql
```

```sql
-- 20260511_ai_features/migration.sql

BEGIN;

-- 1. ai_recipe_analysis 表
CREATE TABLE "ai_recipe_analysis" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "match_score" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "pros" TEXT[] NOT NULL,
    "cons" TEXT[] NOT NULL,
    "modifications" TEXT[] NOT NULL,
    "alternatives" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recipe_analysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_recipe_analysis_user_id_recipe_id_key" 
  ON "ai_recipe_analysis"("user_id", "recipe_id");

CREATE INDEX "ai_recipe_analysis_user_id_created_at_idx" 
  ON "ai_recipe_analysis"("user_id", "created_at");

CREATE INDEX "ai_recipe_analysis_expires_at_idx" 
  ON "ai_recipe_analysis"("expires_at");

ALTER TABLE "ai_recipe_analysis" 
  ADD CONSTRAINT "ai_recipe_analysis_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_recipe_analysis" 
  ADD CONSTRAINT "ai_recipe_analysis_recipe_id_fkey" 
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. ai_generated_recipes 表
CREATE TABLE "ai_generated_recipes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipe_id" TEXT,
    "input_ingredients" TEXT[] NOT NULL,
    "style" TEXT,
    "difficulty" TEXT,
    "generated_data" JSONB NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generated_recipes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_generated_recipes_user_id_created_at_idx" 
  ON "ai_generated_recipes"("user_id", "created_at");

CREATE INDEX "ai_generated_recipes_is_published_idx" 
  ON "ai_generated_recipes"("is_published");

ALTER TABLE "ai_generated_recipes" 
  ADD CONSTRAINT "ai_generated_recipes_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_recipes" 
  ADD CONSTRAINT "ai_generated_recipes_recipe_id_fkey" 
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. ai_usage_quota 表
CREATE TABLE "ai_usage_quota" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "analysis_used_today" INTEGER NOT NULL DEFAULT 0,
    "analysis_reset_at" TIMESTAMP(3) NOT NULL,
    "generator_used_this_month" INTEGER NOT NULL DEFAULT 0,
    "generator_reset_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_quota_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_usage_quota_user_id_key" 
  ON "ai_usage_quota"("user_id");

CREATE INDEX "ai_usage_quota_user_id_idx" 
  ON "ai_usage_quota"("user_id");

ALTER TABLE "ai_usage_quota" 
  ADD CONSTRAINT "ai_usage_quota_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
```

### 3. 索引策略

| 表名 | 索引 | 目的 |
|------|------|------|
| `ai_recipe_analysis` | `(userId, recipeId)` UNIQUE | 防止重复分析 |
| `ai_recipe_analysis` | `(userId, createdAt)` | 查询用户分析历史 |
| `ai_recipe_analysis` | `(expiresAt)` | 定期清理过期数据 |
| `ai_generated_recipes` | `(userId, createdAt)` | 查询用户生成历史 |
| `ai_usage_quota` | `(userId)` UNIQUE | 快速查询配额 |

---

## API 实现细节

### 1. POST /api/ai/analyze-recipe

#### 文件位置
```
src/app/api/ai/analyze-recipe/route.ts
```

#### 实现代码

```typescript
// src/app/api/ai/analyze-recipe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { checkAndUpdateQuota } from "@/lib/ai-quota";
import { analyzeRecipeWithAI } from "@/lib/ai-service";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. 认证
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // 2. 解析请求
    const { recipeId } = await req.json();
    if (!recipeId) {
      return NextResponse.json(
        { success: false, error: "RECIPE_ID_REQUIRED" },
        { status: 400 }
      );
    }

    // 3. 检查用户健康档案
    const profile = await db.userHealthProfile.findUnique({
      where: { userId }
    });
    if (!profile) {
      return NextResponse.json(
        { 
          success: false, 
          error: "PROFILE_REQUIRED",
          message: "请先设置健康档案"
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
          resetAt: quota.resetAt
        },
        { status: 429 }
      );
    }

    // 5. 查询菜谱（包含食材和营养数据）
    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
        category: true,
        tags: { include: { tag: true } }
      }
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
          message: "该菜谱缺少营养数据，无法分析"
        },
        { status: 400 }
      );
    }

    // 6. 检查缓存（7天内有效）
    const cached = await db.aiRecipeAnalysis.findFirst({
      where: {
        userId,
        recipeId,
        expiresAt: { gte: new Date() }
      }
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
          alternatives: cached.alternatives
        },
        quotaRemaining: quota.remaining,
        cached: true
      });
    }

    // 7. 调用 AI 分析
    const analysis = await analyzeRecipeWithAI(recipe, profile);

    // 8. 保存结果（过期时间：7天）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const saved = await db.aiRecipeAnalysis.create({
      data: {
        userId,
        recipeId,
        matchScore: analysis.matchScore,
        summary: analysis.summary,
        pros: analysis.pros,
        cons: analysis.cons,
        modifications: analysis.modifications,
        alternatives: analysis.alternatives,
        expiresAt
      }
    });

    // 9. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        analysisId: saved.id,
        ...analysis
      },
      quotaRemaining: quota.remaining
    });

  } catch (error) {
    console.error("AI analyze-recipe error:", error);
    
    // 区分不同类型的错误
    if (error instanceof Error) {
      if (error.message.includes("AI_RATE_LIMIT")) {
        return NextResponse.json(
          { success: false, error: "AI_SERVICE_BUSY", message: "AI 服务繁忙，请稍后再试" },
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
```

---

### 2. POST /api/ai/generate-recipe

#### 文件位置
```
src/app/api/ai/generate-recipe/route.ts
```

#### 实现代码

```typescript
// src/app/api/ai/generate-recipe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { checkAndUpdateQuota } from "@/lib/ai-quota";
import { generateRecipeWithAI } from "@/lib/ai-service";
import { authOptions } from "@/lib/auth";

interface GenerateRecipeInput {
  ingredients: string[];
  style?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  cookTime?: number;
  servings?: number;
  dietaryRestrictions?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // 解析输入
    const input: GenerateRecipeInput = await req.json();
    
    // 验证食材数量
    if (!input.ingredients || input.ingredients.length < 1 || input.ingredients.length > 10) {
      return NextResponse.json(
        { 
          success: false, 
          error: "INVALID_INGREDIENTS",
          message: "食材数量必须在 1-10 个之间"
        },
        { status: 400 }
      );
    }

    // 检查配额
    const quota = await checkAndUpdateQuota(userId, "generator");
    if (!quota.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "QUOTA_EXCEEDED",
          resetAt: quota.resetAt
        },
        { status: 429 }
      );
    }

    // 调用 AI 生成
    const generatedData = await generateRecipeWithAI(input);

    // 推断分类（基于菜系风格）
    const categoryId = await inferCategoryId(input.style);

    // 创建 Recipe 草稿
    const recipe = await db.recipe.create({
      data: {
        titleEn: generatedData.titleEn,
        titleZh: generatedData.titleZh,
        descriptionEn: generatedData.descriptionEn,
        descriptionZh: generatedData.descriptionZh,
        difficulty: generatedData.difficulty,
        prepTime: generatedData.prepTime,
        cookTimeMin: generatedData.cookTimeMin,
        servings: generatedData.servings,
        calories: generatedData.nutrition.calories,
        protein: generatedData.nutrition.protein,
        fat: generatedData.nutrition.fat,
        carbs: generatedData.nutrition.carbs,
        fiber: generatedData.nutrition.fiber,
        sodium: generatedData.nutrition.sodium,
        sugar: generatedData.nutrition.sugar,
        authorId: userId,
        categoryId,
        isPublished: false, // 草稿状态
        steps: {
          create: generatedData.steps.map(step => ({
            stepNumber: step.stepNumber,
            titleEn: step.titleEn,
            titleZh: step.titleZh,
            contentEn: step.contentEn,
            contentZh: step.contentZh,
            durationMin: step.durationMin
          }))
        },
        ingredients: {
          create: generatedData.ingredients.map(ing => ({
            nameEn: ing.nameEn,
            nameZh: ing.nameZh,
            amount: ing.amount,
            unit: ing.unit,
            isOptional: ing.isOptional || false
          }))
        }
      },
      include: {
        steps: true,
        ingredients: true
      }
    });

    // 关联标签（如果有）
    if (generatedData.tags && generatedData.tags.length > 0) {
      await linkRecipeTags(recipe.id, generatedData.tags);
    }

    // 保存生成记录
    const generation = await db.aiGeneratedRecipe.create({
      data: {
        userId,
        recipeId: recipe.id,
        inputIngredients: input.ingredients,
        style: input.style,
        difficulty: input.difficulty,
        generatedData: generatedData as any,
        isPublished: false
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        generationId: generation.id,
        recipeId: recipe.id,
        recipe: {
          ...recipe,
          nutrition: generatedData.nutrition
        }
      },
      quotaRemaining: quota.remaining
    });

  } catch (error) {
    console.error("AI generate-recipe error:", error);
    
    if (error instanceof Error && error.message.includes("AI_")) {
      return NextResponse.json(
        { 
          success: false, 
          error: "GENERATION_FAILED",
          message: "AI 生成失败，请重试",
          retry: true
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// 辅助函数：根据菜系推断分类
async function inferCategoryId(style?: string): Promise<string> {
  const styleMap: Record<string, string> = {
    "川菜": "sichuan",
    "粤菜": "cantonese",
    "日式": "japanese",
    "西式": "western"
  };

  const slug = style ? styleMap[style] : null;
  
  if (slug) {
    const category = await db.category.findUnique({ where: { slug } });
    if (category) return category.id;
  }

  // 默认返回 "其他" 分类
  const defaultCat = await db.category.findFirst({
    where: { slug: "other" }
  });
  return defaultCat!.id;
}

// 辅助函数：关联标签
async function linkRecipeTags(recipeId: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    // 查找或创建标签
    let tag = await db.tag.findUnique({ where: { nameZh: tagName } });
    if (!tag) {
      tag = await db.tag.create({
        data: {
          nameZh: tagName,
          nameEn: tagName // 简化处理，实际可用翻译 API
        }
      });
    }

    // 关联
    await db.recipeTag.create({
      data: { recipeId, tagId: tag.id }
    });
  }
}
```

---

### 3. POST /api/ai/publish-generated-recipe

```typescript
// src/app/api/ai/publish-generated-recipe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const userId = session.user.id;

    const { generationId, edits } = await req.json();

    // 查询生成记录
    const generation = await db.aiGeneratedRecipe.findUnique({
      where: { id: generationId },
      include: { recipe: true }
    });

    if (!generation || generation.userId !== userId) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    if (!generation.recipeId) {
      return NextResponse.json({ success: false, error: "RECIPE_NOT_LINKED" }, { status: 400 });
    }

    // 应用用户编辑（如果有）
    if (edits) {
      await db.recipe.update({
        where: { id: generation.recipeId },
        data: {
          ...edits,
          isPublished: true
        }
      });
    } else {
      // 直接发布
      await db.recipe.update({
        where: { id: generation.recipeId },
        data: { isPublished: true }
      });
    }

    // 更新生成记录状态
    await db.aiGeneratedRecipe.update({
      where: { id: generationId },
      data: { isPublished: true }
    });

    return NextResponse.json({
      success: true,
      recipeId: generation.recipeId,
      url: `/recipe/${generation.recipeId}`
    });

  } catch (error) {
    console.error("Publish generated recipe error:", error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
```

---

### 4. GET /api/shopping-list

```typescript
// src/app/api/shopping-list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

interface ShoppingItem {
  ingredient: string;
  totalAmount: string;
  unit: string;
  recipes: string[];
  isOptional: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const userId = session.user.id;

    // 查询用户收藏的所有菜谱的食材
    const favorites = await db.favorite.findMany({
      where: { userId },
      include: {
        recipe: {
          include: {
            ingredients: true
          }
        }
      }
    });

    // 合并食材
    const itemsMap = new Map<string, ShoppingItem>();

    for (const fav of favorites) {
      const recipe = fav.recipe;
      for (const ing of recipe.ingredients) {
        const key = `${ing.nameZh}|${ing.unit || ""}`;
        
        if (itemsMap.has(key)) {
          const item = itemsMap.get(key)!;
          item.recipes.push(recipe.titleZh);
          // 尝试合并数量（如果是数字）
          const currentAmount = parseFloat(item.totalAmount);
          const newAmount = parseFloat(ing.amount);
          if (!isNaN(currentAmount) && !isNaN(newAmount)) {
            item.totalAmount = (currentAmount + newAmount).toString();
          } else {
            item.totalAmount = `${item.totalAmount} + ${ing.amount}`;
          }
          if (ing.isOptional) item.isOptional = true;
        } else {
          itemsMap.set(key, {
            ingredient: ing.nameZh,
            totalAmount: ing.amount,
            unit: ing.unit || "",
            recipes: [recipe.titleZh],
            isOptional: ing.isOptional
          });
        }
      }
    }

    // 分类（简化版：按第一个字分类）
    const categories: Record<string, ShoppingItem[]> = {
      "蔬菜类": [],
      "肉类": [],
      "调料": [],
      "其他": []
    };

    const vegKeywords = ["菜", "瓜", "豆", "芋", "菇", "笋", "藕"];
    const meatKeywords = ["肉", "鸡", "鸭", "鱼", "虾", "蟹", "蛋"];
    const seasoningKeywords = ["盐", "油", "酱", "醋", "糖", "料酒", "葱", "姜", "蒜"];

    for (const item of itemsMap.values()) {
      if (vegKeywords.some(k => item.ingredient.includes(k))) {
        categories["蔬菜类"].push(item);
      } else if (meatKeywords.some(k => item.ingredient.includes(k))) {
        categories["肉类"].push(item);
      } else if (seasoningKeywords.some(k => item.ingredient.includes(k))) {
        categories["调料"].push(item);
      } else {
        categories["其他"].push(item);
      }
    }

    // 移除空分类
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) delete categories[key];
    });

    return NextResponse.json({
      success: true,
      data: {
        categories,
        totalRecipes: favorites.length,
        totalItems: itemsMap.size
      }
    });

  } catch (error) {
    console.error("Shopping list error:", error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
```

---

### 5. GET /api/ai/quota

```typescript
// src/app/api/ai/quota/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { getQuotaLimits } from "@/lib/ai-quota";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const userId = session.user.id;

    // 获取配额记录
    const quota = await db.aiUsageQuota.findUnique({ where: { userId } });
    
    // 获取限制（基于订阅状态）
    const limits = await getQuotaLimits(userId);

    return NextResponse.json({
      success: true,
      data: {
        analysis: {
          used: quota?.analysisUsedToday || 0,
          limit: limits.analysis,
          resetAt: quota?.analysisResetAt || new Date()
        },
        generator: {
          used: quota?.generatorUsedThisMonth || 0,
          limit: limits.generator,
          resetAt: quota?.generatorResetAt || new Date()
        }
      }
    });

  } catch (error) {
    console.error("AI quota error:", error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
```

---

## LLM 集成

### 1. AI Service 模块

```typescript
// src/lib/ai-service.ts
import Anthropic from "@anthropic-ai/sdk";
import { Recipe, UserHealthProfile, Ingredient } from "@/generated/prisma";

const client = new Anthropic({
  apiKey: process.env.GONGFENG_AI_API_KEY!,
  baseURL: process.env.GONGFENG_AI_BASE_URL || "https://gongfeng.ai/v1"
});

// ─────────────────────────────────────────
// 1. 菜谱适配分析
// ─────────────────────────────────────────

interface RecipeWithIngredients extends Recipe {
  ingredients: Ingredient[];
}

interface AnalysisResult {
  matchScore: number;
  summary: string;
  pros: string[];
  cons: string[];
  modifications: string[];
  alternatives: Array<{ recipeId: string; title: string; reason: string }>;
}

export async function analyzeRecipeWithAI(
  recipe: RecipeWithIngredients,
  profile: UserHealthProfile
): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(recipe, profile);
  
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }]
    });

    const content = response.content[0].text;
    const result = parseAIResponse(content);
    
    // 验证结果格式
    validateAnalysisResult(result);
    
    return result;
  } catch (error) {
    console.error("AI analysis error:", error);
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) throw new Error("AI_RATE_LIMIT");
      if (error.status >= 500) throw new Error("AI_SERVICE_ERROR");
    }
    throw new Error("AI_UNKNOWN_ERROR");
  }
}

function buildAnalysisPrompt(recipe: RecipeWithIngredients, profile: UserHealthProfile): string {
  const goalMap: Record<string, string> = {
    weight_loss: "减脂",
    muscle_gain: "增肌",
    maintain: "维持体重"
  };

  return `
你是专业营养师。请分析这道菜谱是否适合用户的健康目标。

## 用户健康档案
- 目标: ${goalMap[profile.goal] || profile.goal}
- 每日热量目标: ${profile.dailyCalories} kcal
- 营养比例: 蛋白质 ${profile.proteinPercent}%, 脂肪 ${profile.fatPercent}%, 碳水 ${profile.carbsPercent}%
${profile.restrictions.length > 0 ? `- 饮食限制: ${profile.restrictions.join(', ')}` : ''}
${profile.sodiumLimit ? `- 钠限制: ${profile.sodiumLimit} mg/天` : ''}
${profile.sugarLimit ? `- 糖限制: ${profile.sugarLimit} g/天` : ''}
${profile.fiberMin ? `- 纤维最低: ${profile.fiberMin} g/天` : ''}

## 菜谱信息
- 菜名: ${recipe.titleZh}
- 每份热量: ${recipe.calories} kcal (${recipe.servings || 1}人份)
- 蛋白质: ${recipe.protein}g
- 脂肪: ${recipe.fat}g
- 碳水: ${recipe.carbs}g
${recipe.sodium ? `- 钠: ${recipe.sodium}mg` : ''}
${recipe.sugar ? `- 糖: ${recipe.sugar}g` : ''}
${recipe.fiber ? `- 纤维: ${recipe.fiber}g` : ''}
- 食材: ${recipe.ingredients.map(i => i.nameZh).join(', ')}

## 分析要求
1. 计算适配度评分（0-100分）
2. 列出优点（2-4条）
3. 列出需要注意的地方（1-3条）
4. 提供改良建议（2-3条具体可操作的建议）
5. 不要推荐替代菜谱（我们会通过数据库查询）

请严格按照以下 JSON 格式返回：
\`\`\`json
{
  "matchScore": 85,
  "summary": "这道菜谱基本符合您的减脂目标，蛋白质含量充足，但钠含量略高。",
  "pros": [
    "高蛋白质（35g），有助于肌肉维持",
    "热量适中（280kcal），适合减脂期",
    "富含膳食纤维（4g），增强饱腹感"
  ],
  "cons": [
    "钠含量偏高（180mg），建议减少酱油用量",
    "脂肪占比略高（26%），可用蒸煮替代煎炸"
  ],
  "modifications": [
    "将酱油用量减少至原来的50%，或使用低钠酱油",
    "鸡胸肉用蒸煮代替煎炸，可减少5-8g脂肪",
    "增加西兰花份量至200g，补充更多纤维"
  ]
}
\`\`\`

重要：只返回 JSON，不要有其他文字说明。
`.trim();
}

// ─────────────────────────────────────────
// 2. AI 菜谱生成
// ─────────────────────────────────────────

interface GenerateRecipeInput {
  ingredients: string[];
  style?: string;
  difficulty?: string;
  cookTime?: number;
  servings?: number;
  dietaryRestrictions?: string[];
}

interface GeneratedRecipe {
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prepTime: number;
  cookTimeMin: number;
  servings: number;
  ingredients: Array<{
    nameZh: string;
    nameEn: string;
    amount: string;
    unit: string;
    isOptional?: boolean;
  }>;
  steps: Array<{
    stepNumber: number;
    titleZh: string;
    titleEn: string;
    contentZh: string;
    contentEn: string;
    durationMin?: number;
  }>;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber?: number;
    sodium?: number;
    sugar?: number;
  };
  tags: string[];
}

export async function generateRecipeWithAI(input: GenerateRecipeInput): Promise<GeneratedRecipe> {
  const prompt = buildGeneratorPrompt(input);
  
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      temperature: 0.8, // 增加创造性
      messages: [{ role: "user", content: prompt }]
    });

    const content = response.content[0].text;
    const result = parseAIResponse(content);
    
    // 验证结果格式
    validateGeneratedRecipe(result);
    
    return result;
  } catch (error) {
    console.error("AI generation error:", error);
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) throw new Error("AI_RATE_LIMIT");
      if (error.status >= 500) throw new Error("AI_SERVICE_ERROR");
    }
    throw new Error("AI_UNKNOWN_ERROR");
  }
}

function buildGeneratorPrompt(input: GenerateRecipeInput): string {
  return `
你是专业厨师。根据以下食材创作一道完整的菜谱。

## 可用食材
${input.ingredients.join(', ')}

## 要求
${input.style ? `- 菜系风格: ${input.style}` : '- 菜系风格: 不限（发挥创意）'}
${input.difficulty ? `- 难度: ${input.difficulty}` : '- 难度: 适中'}
${input.cookTime ? `- 烹饪时间: 约${input.cookTime}分钟` : '- 烹饪时间: 不限'}
${input.servings ? `- 份数: ${input.servings}人份` : '- 份数: 2人份'}
${input.dietaryRestrictions && input.dietaryRestrictions.length > 0 ? `- 饮食限制: ${input.dietaryRestrictions.join(', ')}` : ''}

## 创作要求
1. 菜名要有吸引力，体现主要食材和烹饪方式
2. 食材列表要包含所有必要的配料（调料、辅料）
3. 步骤要详细易懂，每步注明耗时
4. 营养数据要基于实际食材合理估算
5. 标签要准确反映菜品特点（如：快手菜、低脂、高蛋白）

请严格按照以下 JSON 格式返回：
\`\`\`json
{
  "titleZh": "蒜香西兰花鸡胸",
  "titleEn": "Garlic Broccoli Chicken",
  "descriptionZh": "简单快手，营养均衡，适合健身减脂人群。鸡胸肉嫩滑多汁，西兰花清脆爽口。",
  "descriptionEn": "Simple, nutritious, and perfect for fitness enthusiasts. Tender chicken with crispy broccoli.",
  "difficulty": "EASY",
  "prepTime": 10,
  "cookTimeMin": 15,
  "servings": 2,
  "ingredients": [
    { "nameZh": "鸡胸肉", "nameEn": "Chicken Breast", "amount": "200", "unit": "g" },
    { "nameZh": "西兰花", "nameEn": "Broccoli", "amount": "150", "unit": "g" },
    { "nameZh": "蒜", "nameEn": "Garlic", "amount": "3", "unit": "瓣" },
    { "nameZh": "橄榄油", "nameEn": "Olive Oil", "amount": "1", "unit": "tbsp" },
    { "nameZh": "盐", "nameEn": "Salt", "amount": "适量", "unit": "" },
    { "nameZh": "黑胡椒", "nameEn": "Black Pepper", "amount": "适量", "unit": "", "isOptional": true }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "titleZh": "准备食材",
      "titleEn": "Prepare Ingredients",
      "contentZh": "鸡胸肉切成小块，用盐和黑胡椒腌制5分钟。西兰花切小朵，蒜切片。",
      "contentEn": "Cut chicken into cubes and marinate with salt and pepper for 5 min. Cut broccoli into florets and slice garlic.",
      "durationMin": 5
    },
    {
      "stepNumber": 2,
      "titleZh": "焯水西兰花",
      "titleEn": "Blanch Broccoli",
      "contentZh": "煮沸一锅水，加少许盐，放入西兰花焯水1分钟，捞出沥干。",
      "contentEn": "Bring water to boil, add salt, blanch broccoli for 1 min, drain.",
      "durationMin": 2
    },
    {
      "stepNumber": 3,
      "titleZh": "煎鸡胸肉",
      "titleEn": "Pan-Fry Chicken",
      "contentZh": "热锅加橄榄油，中火煎鸡胸肉至两面金黄，约5分钟。",
      "contentEn": "Heat oil in pan, cook chicken over medium heat until golden, about 5 min.",
      "durationMin": 5
    },
    {
      "stepNumber": 4,
      "titleZh": "翻炒混合",
      "titleEn": "Stir-Fry Together",
      "contentZh": "加入蒜片爆香，再加入西兰花快速翻炒1分钟，调味即可。",
      "contentEn": "Add garlic, stir until fragrant, add broccoli, stir-fry for 1 min, season to taste.",
      "durationMin": 3
    }
  ],
  "nutrition": {
    "calories": 280,
    "protein": 35,
    "fat": 8,
    "carbs": 12,
    "fiber": 4,
    "sodium": 180,
    "sugar": 2
  },
  "tags": ["低脂", "高蛋白", "快手菜", "减脂餐"]
}
\`\`\`

重要：
1. 只返回 JSON，不要有其他文字
2. 确保所有字段都存在且类型正确
3. 营养数据要合理（calories 应该等于 4*protein + 4*carbs + 9*fat）
`.trim();
}

// ─────────────────────────────────────────
// 辅助函数
// ─────────────────────────────────────────

function parseAIResponse(content: string): any {
  // 提取 JSON（LLM 可能包裹在 ```json ... ``` 中）
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("JSON parse error:", jsonStr);
    throw new Error("AI_INVALID_RESPONSE");
  }
}

function validateAnalysisResult(result: any): asserts result is AnalysisResult {
  if (typeof result.matchScore !== "number" || result.matchScore < 0 || result.matchScore > 100) {
    throw new Error("Invalid matchScore");
  }
  if (!Array.isArray(result.pros) || !Array.isArray(result.cons) || !Array.isArray(result.modifications)) {
    throw new Error("Invalid arrays");
  }
}

function validateGeneratedRecipe(result: any): asserts result is GeneratedRecipe {
  const required = ['titleZh', 'titleEn', 'descriptionZh', 'difficulty', 'ingredients', 'steps', 'nutrition'];
  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  if (!Array.isArray(result.ingredients) || result.ingredients.length === 0) {
    throw new Error("Invalid ingredients");
  }
  if (!Array.isArray(result.steps) || result.steps.length === 0) {
    throw new Error("Invalid steps");
  }
}
```

---

## 配额系统实现

### 文件位置
```
src/lib/ai-quota.ts
```

### 完整代码

```typescript
// src/lib/ai-quota.ts
import { db } from "@/lib/db";

// 配额配置
interface QuotaConfig {
  free: number;
  premium: number;
  resetPeriod: "daily" | "monthly";
}

const QUOTA_CONFIG = {
  analysis: { free: 3, premium: 20, resetPeriod: "daily" as const },
  generator: { free: 5, premium: 50, resetPeriod: "monthly" as const }
};

// 检查并更新配额
export async function checkAndUpdateQuota(
  userId: string,
  feature: "analysis" | "generator"
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  
  // 1. 获取用户订阅状态
  const subscription = await db.subscription.findUnique({
    where: { userId }
  });
  const isPremium = 
    subscription?.status === "ACTIVE" && 
    subscription.planType === "PREMIUM";

  // 2. 获取或创建配额记录
  let quota = await db.aiUsageQuota.findUnique({ where: { userId } });
  
  if (!quota) {
    quota = await db.aiUsageQuota.create({
      data: {
        userId,
        analysisUsedToday: 0,
        analysisResetAt: getNextMidnight(),
        generatorUsedThisMonth: 0,
        generatorResetAt: getFirstDayOfNextMonth()
      }
    });
  }

  // 3. 检查是否需要重置
  const now = new Date();
  
  if (feature === "analysis" && now >= quota.analysisResetAt) {
    quota = await db.aiUsageQuota.update({
      where: { userId },
      data: {
        analysisUsedToday: 0,
        analysisResetAt: getNextMidnight()
      }
    });
  }
  
  if (feature === "generator" && now >= quota.generatorResetAt) {
    quota = await db.aiUsageQuota.update({
      where: { userId },
      data: {
        generatorUsedThisMonth: 0,
        generatorResetAt: getFirstDayOfNextMonth()
      }
    });
  }

  // 4. 检查配额
  const config = QUOTA_CONFIG[feature];
  const limit = isPremium ? config.premium : config.free;
  const used = feature === "analysis" 
    ? quota.analysisUsedToday 
    : quota.generatorUsedThisMonth;
  const allowed = used < limit;
  const resetAt = feature === "analysis" 
    ? quota.analysisResetAt 
    : quota.generatorResetAt;

  // 5. 如果允许，增加使用次数
  if (allowed) {
    await db.aiUsageQuota.update({
      where: { userId },
      data: {
        [feature === "analysis" ? "analysisUsedToday" : "generatorUsedThisMonth"]: used + 1
      }
    });
  }

  return {
    allowed,
    remaining: Math.max(0, limit - used - (allowed ? 1 : 0)),
    resetAt
  };
}

// 获取配额限制（不消耗）
export async function getQuotaLimits(userId: string): Promise<{
  analysis: number;
  generator: number;
}> {
  const subscription = await db.subscription.findUnique({
    where: { userId }
  });
  const isPremium = 
    subscription?.status === "ACTIVE" && 
    subscription.planType === "PREMIUM";

  return {
    analysis: isPremium ? QUOTA_CONFIG.analysis.premium : QUOTA_CONFIG.analysis.free,
    generator: isPremium ? QUOTA_CONFIG.generator.premium : QUOTA_CONFIG.generator.free
  };
}

// 辅助函数：获取明天 00:00
function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

// 辅助函数：获取下月 1 号 00:00
function getFirstDayOfNextMonth(): Date {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}
```

---

## 前端组件设计

### 1. AI 分析按钮组件

```tsx
// app/recipe/[id]/components/AiAnalyzeButton.tsx
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { AnalysisResultModal } from "./AnalysisResultModal";

interface Props {
  recipeId: string;
  hasHealthProfile: boolean;
}

export function AiAnalyzeButton({ recipeId, hasHealthProfile }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!hasHealthProfile) {
      toast({
        title: "需要先设置健康档案",
        description: "设置后即可使用 AI 分析功能",
        action: { label: "去设置", href: "/profile/health" }
      });
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId })
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error === "QUOTA_EXCEEDED") {
          toast({
            title: "今日分析次数已用完",
            description: `明天 00:00 重置`,
            action: { label: "升级 Premium", href: "/premium" }
          });
        } else {
          toast({ title: "分析失败", description: data.message || "请稍后再试" });
        }
        return;
      }

      setResult(data.data);
    } catch (error) {
      toast({ title: "网络错误", description: "请检查网络连接" });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <Button
        variant="gradient"
        icon="✨"
        onPress={handleAnalyze}
        disabled={analyzing}
        className="w-full mt-4"
      >
        {analyzing ? "AI 分析中..." : "🪄 AI 分析是否适合我"}
      </Button>

      {result && (
        <AnalysisResultModal
          result={result}
          isOpen={!!result}
          onClose={() => setResult(null)}
        />
      )}
    </>
  );
}
```

### 2. 配额显示组件

```tsx
// components/QuotaBadge.tsx
import useSWR from "swr";
import { Progress } from "@/components/ui/Progress";
import { Link } from "expo-router";

interface Props {
  feature: "analysis" | "generator";
}

export function QuotaBadge({ feature }: Props) {
  const { data } = useSWR("/api/ai/quota");
  
  if (!data?.success) return null;

  const quota = data.data[feature];
  const percentage = (quota.used / quota.limit) * 100;
  const color = percentage >= 100 ? "red" : percentage >= 80 ? "orange" : "green";

  return (
    <div className="flex items-center gap-2 text-sm">
      <Progress value={percentage} color={color} className="w-20" />
      <span className="text-gray-600">
        {quota.used}/{quota.limit}
      </span>
      {percentage >= 100 && (
        <Link href="/premium" className="text-blue-500 underline">
          升级
        </Link>
      )}
    </div>
  );
}
```

---

## 性能优化

### 1. 数据库查询优化

```typescript
// ❌ 错误：N+1 查询
const favorites = await db.favorite.findMany({ where: { userId } });
for (const fav of favorites) {
  const recipe = await db.recipe.findUnique({ where: { id: fav.recipeId } });
  // ...
}

// ✅ 正确：使用 include 一次性查询
const favorites = await db.favorite.findMany({
  where: { userId },
  include: {
    recipe: {
      include: { ingredients: true }
    }
  }
});
```

### 2. 缓存策略

```typescript
// SWR 前端缓存
const fetcher = (url: string) => fetch(url).then(r => r.json());

// 购物清单：5 分钟缓存
useSWR("/api/shopping-list", fetcher, { refreshInterval: 300000 });

// 配额：1 分钟缓存
useSWR("/api/ai/quota", fetcher, { refreshInterval: 60000 });
```

### 3. 定期清理过期数据

```typescript
// scripts/cleanup-expired-analysis.ts
import { db } from "@/lib/db";

export async function cleanupExpiredAnalysis() {
  const result = await db.aiRecipeAnalysis.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
  console.log(`Deleted ${result.count} expired analysis records`);
}

// Cron job: 每天 03:00 执行
// Vercel Cron: /api/cron/cleanup-analysis
```

---

## 安全考虑

### 1. 输入验证

```typescript
// 食材数量限制
if (ingredients.length < 1 || ingredients.length > 10) {
  throw new Error("INVALID_INGREDIENTS");
}

// 防止 SQL 注入（Prisma 自动处理）
// 防止 XSS（React 自动转义）
```

### 2. 配额防滥用

```typescript
// 配额检查在数据库层面强制执行
// 即使前端绕过，后端也会拦截
```

### 3. AI 响应验证

```typescript
// 验证 AI 返回的 JSON 格式
function validateAnalysisResult(result: any): asserts result is AnalysisResult {
  if (typeof result.matchScore !== "number" || result.matchScore < 0 || result.matchScore > 100) {
    throw new Error("Invalid matchScore");
  }
  // ...
}
```

---

## 部署清单

### 1. 环境变量

```bash
# .env.production
GONGFENG_AI_API_KEY=sk-xxx
GONGFENG_AI_BASE_URL=https://gongfeng.ai/v1
FEATURE_AI_ANALYSIS_ENABLED=true
FEATURE_AI_GENERATOR_ENABLED=true
FEATURE_SHOPPING_LIST_ENABLED=true
```

### 2. 数据库 Migration

```bash
# 开发环境
npx prisma migrate dev --name ai_features

# 生产环境
npx prisma migrate deploy
```

### 3. Vercel 部署

```bash
# 推送代码
git push origin feature/ai-features

# Vercel 自动部署
# 确保环境变量已配置
```

### 4. 功能开关

```typescript
// lib/feature-flags.ts
export const AI_FEATURES_ENABLED = {
  analysis: process.env.FEATURE_AI_ANALYSIS_ENABLED === "true",
  generator: process.env.FEATURE_AI_GENERATOR_ENABLED === "true",
  shoppingList: process.env.FEATURE_SHOPPING_LIST_ENABLED === "true"
};

// 可用于灰度发布
if (!AI_FEATURES_ENABLED.analysis) {
  return <ComingSoonBanner />;
}
```

---

## 监控指标

### 需要监控的指标

1. **AI 调用成功率**: 成功/失败比例
2. **AI 响应时间**: P50/P95/P99
3. **配额使用分布**: 免费 vs Premium
4. **生成菜谱发布率**: 发布数/生成数
5. **用户满意度**: 点赞/收藏生成的菜谱

### Vercel Analytics 集成

```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 总结

本技术设计文档涵盖了：

✅ **完整的数据库 Schema** + Migration 脚本  
✅ **5 个 API 端点** 的详细实现  
✅ **LLM 集成** 的 Prompt 设计和错误处理  
✅ **配额系统** 的完整逻辑  
✅ **前端组件** 的示例代码  
✅ **性能优化** 和 **安全考虑**  
✅ **部署清单** 和 **监控指标**  

**下一步**：
1. ✅ PM 已完成 PRD 和技术设计
2. 🔄 **派发 chefchina-dev 开始开发**
3. 📅 预计开发周期：3-5 天
4. 🧪 QA 测试 + 灰度发布

---

**文档结束**
