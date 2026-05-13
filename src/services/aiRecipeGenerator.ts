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
  language?: "zh" | "en"; // 语言参数，默认中文
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
  const lang = input.language || "zh"; // 默认中文
  const isZh = lang === "zh";
  
  // 根据语言动态生成 System Prompt
  const systemPrompt = isZh
    ? `你是专业厨师和营养师。根据用户提供的食材，生成一道完整的菜谱。

要求：
1. 标题简洁有吸引力（8-15 字）
2. 食材用量精确（如"200g"、"2 瓣"、"适量"）
3. 步骤清晰（每步 1-2 句话）
4. **steps 字段严格要求：**
   - stepNumber: 步骤编号（数字，从 1 开始）
   - titleZh: 步骤标题（中文，可选，如"准备食材"）
   - titleEn: 步骤标题（英文，可选，如"Prepare Ingredients"）
   - contentZh: 步骤内容（中文，**必需**，详细描述操作）
   - contentEn: 步骤内容（英文，**必需**，详细描述操作）
   - durationMin: 该步骤时长（分钟，可选）
5. 营养数据基于标准食材库估算
6. 符合用户的菜系风格和难度要求
7. 必须同时提供中英文内容
8. **单位必须用中文：克、毫升、个、瓣、勺、适量等**

返回 JSON 格式（严格按以下结构）：
\`\`\`json
{
  "titleZh": "蒜香西兰花鸡胸",
  "titleEn": "Garlic Broccoli Chicken",
  "descriptionZh": "简单快手,营养均衡",
  "descriptionEn": "Simple and nutritious",
  "difficulty": "EASY",
  "prepTime": 10,
  "cookTimeMin": 15,
  "servings": 2,
  "ingredients": [
    { "nameZh": "鸡胸肉", "nameEn": "Chicken Breast", "amount": "200", "unit": "克" },
    { "nameZh": "西兰花", "nameEn": "Broccoli", "amount": "150", "unit": "克" }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "titleZh": "准备食材",
      "titleEn": "Prepare Ingredients",
      "contentZh": "将鸡胸肉切成小块，西兰花切成小朵，大蒜切末",
      "contentEn": "Cut chicken breast into small pieces, broccoli into florets, mince garlic",
      "durationMin": 5
    },
    {
      "stepNumber": 2,
      "titleZh": "炒制",
      "titleEn": "Stir-fry",
      "contentZh": "热锅下油，爆香蒜末，加入鸡肉翻炒至变色，加入西兰花继续翻炒",
      "contentEn": "Heat oil in pan, sauté garlic until fragrant, add chicken and stir-fry until color changes, add broccoli and continue",
      "durationMin": 10
    }
  ],
  "nutrition": { "calories": 350, "protein": 40, "fat": 12, "carbs": 20 }
}
\`\`\`

重要：只返回 JSON，不要有其他文字。`
    : `You are a professional chef and nutritionist. Generate a complete recipe based on the ingredients provided by the user.

Requirements:
1. Concise and attractive title (8-15 words)
2. Precise ingredient amounts (e.g., "200g", "2 cloves", "to taste")
3. Clear steps (1-2 sentences per step)
4. **steps field strict requirements:**
   - stepNumber: step number (numeric, starting from 1)
   - titleZh: step title (Chinese, optional, e.g., "准备食材")
   - titleEn: step title (English, optional, e.g., "Prepare Ingredients")
   - contentZh: step content (Chinese, **required**, detailed operation description)
   - contentEn: step content (English, **required**, detailed operation description)
   - durationMin: duration for this step (minutes, optional)
5. Nutrition data estimated from standard ingredient database
6. Match user's cuisine style and difficulty requirements
7. Must provide both Chinese and English content
8. **Units must be in English: g, ml, pieces, cloves, tbsp, to taste, etc.**

Return JSON format (strictly follow this structure):
\`\`\`json
{
  "titleZh": "蒜香西兰花鸡胸",
  "titleEn": "Garlic Broccoli Chicken",
  "descriptionZh": "简单快手,营养均衡",
  "descriptionEn": "Simple and nutritious",
  "difficulty": "EASY",
  "prepTime": 10,
  "cookTimeMin": 15,
  "servings": 2,
  "ingredients": [
    { "nameZh": "鸡胸肉", "nameEn": "Chicken Breast", "amount": "200", "unit": "g" },
    { "nameZh": "西兰花", "nameEn": "Broccoli", "amount": "150", "unit": "g" }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "titleZh": "准备食材",
      "titleEn": "Prepare Ingredients",
      "contentZh": "将鸡胸肉切成小块，西兰花切成小朵，大蒜切末",
      "contentEn": "Cut chicken breast into small pieces, broccoli into florets, mince garlic",
      "durationMin": 5
    },
    {
      "stepNumber": 2,
      "titleZh": "炒制",
      "titleEn": "Stir-fry",
      "contentZh": "热锅下油，爆香蒜末，加入鸡肉翻炒至变色，加入西兰花继续翻炒",
      "contentEn": "Heat oil in pan, sauté garlic until fragrant, add chicken and stir-fry until color changes, add broccoli and continue",
      "durationMin": 10
    }
  ],
  "nutrition": { "calories": 350, "protein": 40, "fat": 12, "carbs": 20 }
}
\`\`\`

Important: Return JSON only, no other text.`;

  // 根据语言动态生成 User Prompt
  const userPrompt = isZh
    ? `请根据以下食材生成一道菜谱：

## 输入食材
${input.ingredients.join("、")}

## 要求
- 菜系风格: ${input.style || "不限"}
- 难度: ${input.difficulty || "适中"}
- 烹饪时间: ${input.cookTime ? `约${input.cookTime}分钟` : "不限"}
- 人份: ${input.servings || 2} 人份
${input.dietaryRestrictions?.length ? `- 饮食限制: ${input.dietaryRestrictions.join("、")}` : ""}

请生成 JSON 格式的菜谱。**单位必须用中文（克、毫升、个等）。**`
    : `Please generate a recipe based on the following ingredients:

## Input Ingredients
${input.ingredients.join(", ")}

## Requirements
- Cuisine Style: ${input.style || "Any"}
- Difficulty: ${input.difficulty || "Medium"}
- Cook Time: ${input.cookTime ? `About ${input.cookTime} minutes` : "Any"}
- Servings: ${input.servings || 2} servings
${input.dietaryRestrictions?.length ? `- Dietary Restrictions: ${input.dietaryRestrictions.join(", ")}` : ""}

Please generate a recipe in JSON format. **Units must be in English (g, ml, pieces, etc.).**`;

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
      const response = await callLLM(userPrompt, {
        systemPrompt,  // 使用自定义 systemPrompt
        temperature: 0.8,
        maxTokens: 4096,
      });

      console.log("==================== LLM RESPONSE (START) ====================");
      console.log(JSON.stringify(response, null, 2));
      console.log("==================== LLM RESPONSE (END) ====================");

      parsed = response as GeneratedRecipe;

      // 补充默认值
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
    } catch (error) {
      console.error(`[AI Generator] Attempt ${attempt + 1} failed:`, error);
      if (attempt === 2) {
        throw new Error("AI_INVALID_RESPONSE");
      }
      // 重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error("AI_INVALID_RESPONSE");
}
