// src/services/aiRecipeGenerator.ts
// AI 菜谱生成服务

import { callLLM } from "@/lib/llm";

/**
 * 生成器输入接口
 */
export interface GeneratorInput {
  ingredients: string[]; // 必填：1-10 个食材
  style?: string; // 可选：川菜/粤菜/日式/西式/fusion
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  cookTime?: number; // 期望烹饪时长（分钟）
  servings?: number; // 几人份（默认 2）
  dietaryRestrictions?: string[]; // ["低钠", "无糖", "素食"]
}

/**
 * 生成的菜谱接口
 */
export interface GeneratedRecipe {
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
    titleZh?: string;
    titleEn?: string;
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
  tags?: string[];
}

/**
 * 生成菜谱（核心函数）
 */
export async function generateRecipe(
  input: GeneratorInput
): Promise<GeneratedRecipe> {
  // 构建 System Prompt
  const systemPrompt = `你是专业厨师和营养师。根据用户提供的食材，生成一道完整的菜谱。

要求：
1. 标题简洁有吸引力（8-15 字）
2. 食材用量精确（如"200g"、"2 瓣"、"适量"）
3. 步骤清晰（每步 1-2 句话）
4. 营养数据基于标准食材库估算
5. 符合用户的菜系风格和难度要求
6. 必须同时提供中英文内容

返回 JSON 格式（严格按以下结构）：
\`\`\`json
{
  "titleZh": "蒜香西兰花鸡胸",
  "titleEn": "Garlic Broccoli Chicken",
  "descriptionZh": "简单快手,营养均衡,适合健身减脂人群。鸡胸肉嫩滑多汁,西兰花清脆爽口。",
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
      "contentZh": "鸡胸肉切成小块,用盐和黑胡椒腌制5分钟。西兰花切小朵,蒜切片。",
      "contentEn": "Cut chicken into cubes and marinate with salt and pepper for 5 min. Cut broccoli into florets and slice garlic.",
      "durationMin": 5
    },
    {
      "stepNumber": 2,
      "titleZh": "焯水西兰花",
      "titleEn": "Blanch Broccoli",
      "contentZh": "煮沸一锅水,加少许盐,放入西兰花焯水1分钟,捞出沥干。",
      "contentEn": "Bring water to boil, add salt, blanch broccoli for 1 min, drain.",
      "durationMin": 2
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

重要：只返回 JSON，不要有其他文字。`;

  // 构建 User Prompt
  const userPrompt = `请根据以下食材生成一道菜谱：

## 输入食材
${input.ingredients.join("、")}

## 要求
- 菜系风格: ${input.style || "不限"}
- 难度: ${input.difficulty || "适中"}
- 烹饪时间: ${input.cookTime ? `约${input.cookTime}分钟` : "不限"}
- 人份: ${input.servings || 2} 人份
${input.dietaryRestrictions?.length ? `- 饮食限制: ${input.dietaryRestrictions.join("、")}` : ""}

请生成 JSON 格式的菜谱。`;

  // 打印完整 Prompt（调试用）
  console.log("==================== SYSTEM PROMPT (START) ====================");
  console.log(systemPrompt);
  console.log("==================== SYSTEM PROMPT (END) ====================");

  console.log("==================== USER PROMPT (START) ====================");
  console.log(userPrompt);
  console.log("==================== USER PROMPT (END) ====================");

  // 调用 LLM（重试 3 次）
  let parsed: GeneratedRecipe | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`[AI Recipe Generator] Attempt ${attempt + 1}/3`);
      const response = await callLLM(userPrompt, {
        temperature: 0.8, // 提高创意性
        maxTokens: 4096,
      });

      console.log("==================== LLM RESPONSE (START) ====================");
      console.log(JSON.stringify(response, null, 2));
      console.log("==================== LLM RESPONSE (END) ====================");

      // callLLM 已经返回了解析后的 JSON 对象
      parsed = response as GeneratedRecipe;

      // 补充默认值（如果 LLM 缺少某些字段）
      if (!parsed.cookTimeMin) parsed.cookTimeMin = 30;
      if (!parsed.servings) parsed.servings = input.servings || 2;
      if (!parsed.difficulty) parsed.difficulty = input.difficulty || "MEDIUM";
      if (!parsed.prepTime) parsed.prepTime = 10;
      if (!parsed.tags) parsed.tags = [];

      // 验证必填字段
      if (
        !parsed.titleZh ||
        !parsed.titleEn ||
        !parsed.descriptionZh ||
        !parsed.descriptionEn ||
        !parsed.ingredients ||
        parsed.ingredients.length === 0 ||
        !parsed.steps ||
        parsed.steps.length === 0 ||
        !parsed.nutrition
      ) {
        console.error("[AI Generator] Missing required fields:", parsed);
        throw new Error("AI_INVALID_RESPONSE");
      }

      // 验证营养数据合理性
      const { calories, protein, fat, carbs } = parsed.nutrition;
      const estimatedCalories = protein * 4 + fat * 9 + carbs * 4;
      if (Math.abs(calories - estimatedCalories) > estimatedCalories * 0.3) {
        console.warn(
          `[AI Generator] Nutrition data may be inaccurate: calories=${calories}, estimated=${estimatedCalories}`
        );
      }

      return parsed;
    } catch (error: any) {
      console.error(`[AI Generator] Attempt ${attempt + 1} failed:`, error);
      console.error(`[AI Generator] Error message:`, error?.message);
      console.error(`[AI Generator] Error stack:`, error?.stack);
      if (attempt === 2) {
        throw new Error(`AI_INVALID_RESPONSE: ${error?.message || 'Unknown error'}`);
      }
      // 重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error("AI_INVALID_RESPONSE: All 3 attempts failed");
}
