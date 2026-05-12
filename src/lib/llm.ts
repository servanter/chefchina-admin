// src/lib/llm.ts
// LLM 服务封装 - 使用阿里云 DeepSeek V4 Flash

import OpenAI from "openai";

const MODEL = "deepseek-v4-flash";

/**
 * 初始化阿里云 DeepSeek 客户端(延迟初始化,避免构建时错误)
 */
function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "sk-placeholder",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });
}

/**
 * 调用 LLM
 * @param prompt 提示词
 * @param temperature 温度(0-1,默认 0.7)
 * @param maxTokens 最大 token 数(默认 4096)
 * @param language 语言('zh' | 'en',默认 'zh')
 * @returns 解析后的 JSON 对象
 */
export async function callLLM(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    language?: 'zh' | 'en';
  } = {}
): Promise<any> {
  const { temperature = 0.7, maxTokens = 4096, language = 'zh' } = options;
  const client = getClient();

  // ✅ FIX: 根据语言选择系统提示词
  const systemPrompt = language === 'en'
    ? "You are a professional nutritionist specializing in recipe nutrition analysis and personalized recommendations. IMPORTANT: You MUST respond in English only. Return results strictly in the required JSON format."
    : "你是一位专业的营养师,擅长分析菜谱营养价值并提供个性化建议。重要:请务必用中文回答。请严格按照要求的 JSON 格式返回结果。";

  console.log('[LLM] Using language:', language);
  console.log('[LLM] System prompt preview:', systemPrompt.substring(0, 100) + '...');

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    // 获取文本内容
    const content = response.choices[0]?.message?.content?.trim() || "";

    // 解析 JSON(LLM 可能包裹在 ```json ... ``` 中)
    return parseAIResponse(content);
  } catch (error) {
    console.error("LLM call error:", error);

    // 错误分类(OpenAI SDK 错误处理)
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as any).status;
      if (status === 429) {
        throw new Error("AI_RATE_LIMIT");
      }
      if (status >= 500) {
        throw new Error("AI_SERVICE_ERROR");
      }
    }

    throw new Error("AI_UNKNOWN_ERROR");
  }
}

/**
 * 解析 AI 响应(提取 JSON)
 */
function parseAIResponse(content: string): any {
  // 提取 JSON(LLM 可能包裹在 ```json ... ``` 中)
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("JSON parse error:", jsonStr);
    throw new Error("AI_INVALID_RESPONSE");
  }
}


/**
 * 构建菜谱生成 Prompt
 */
export function buildGeneratorPrompt(input: {
  ingredients: string[];
  style?: string;
  difficulty?: string;
  cookTime?: number;
  servings?: number;
  dietaryRestrictions?: string[];
}): string {
  return `
你是专业厨师。根据以下食材创作一道完整的菜谱。

## 可用食材
${input.ingredients.join(", ")}

## 要求
${input.style ? `- 菜系风格: ${input.style}` : "- 菜系风格: 不限(发挥创意)"}
${input.difficulty ? `- 难度: ${input.difficulty}` : "- 难度: 适中"}
${input.cookTime ? `- 烹饪时间: 约${input.cookTime}分钟` : "- 烹饪时间: 不限"}
${input.servings ? `- 份数: ${input.servings}人份` : "- 份数: 2人份"}
${input.dietaryRestrictions && input.dietaryRestrictions.length > 0 ? `- 饮食限制: ${input.dietaryRestrictions.join(", ")}` : ""}

## 创作要求
1. 菜名要有吸引力,体现主要食材和烹饪方式
2. 食材列表要包含所有必要的配料(调料、辅料)
3. 步骤要详细易懂,每步注明耗时
4. 营养数据要基于实际食材合理估算
5. 标签要准确反映菜品特点(如:快手菜、低脂、高蛋白)

请严格按照以下 JSON 格式返回:
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
    },
    {
      "stepNumber": 3,
      "titleZh": "煎鸡胸肉",
      "titleEn": "Pan-Fry Chicken",
      "contentZh": "热锅加橄榄油,中火煎鸡胸肉至两面金黄,约5分钟。",
      "contentEn": "Heat oil in pan, cook chicken over medium heat until golden, about 5 min.",
      "durationMin": 5
    },
    {
      "stepNumber": 4,
      "titleZh": "翻炒混合",
      "titleEn": "Stir-Fry Together",
      "contentZh": "加入蒜片爆香,再加入西兰花快速翻炒1分钟,调味即可。",
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

重要:
1. 只返回 JSON,不要有其他文字
2. 确保所有字段都存在且类型正确
3. 营养数据要合理(calories 应该等于 4*protein + 4*carbs + 9*fat)
`.trim();
}
export function buildAnalysisPrompt(
  recipe: {
    titleZh: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sodium?: number | null;
    sugar?: number | null;
    fiber?: number | null;
    servings?: number | null;
    ingredients: Array<{ nameZh: string }>;
  },
  profile: {
    goal: string;
    dailyCalories: number;
    proteinPercent: number;
    fatPercent: number;
    carbsPercent: number;
    restrictions: string[];
    sodiumLimit?: number | null;
    sugarLimit?: number | null;
    fiberMin?: number | null;
  },
  language: 'zh' | 'en' = 'zh' // ✅ FIX: 新增language参数
): string {
  const isEnglish = language === 'en';

  // ✅ FIX: 根据语言选择prompt
  if (isEnglish) {
    const goalMap: Record<string, string> = {
      weight_loss: "Weight Loss",
      muscle_gain: "Muscle Gain",
      maintain: "Maintain Weight",
    };

    return `
You are a professional nutritionist. Analyze if this recipe suits the user's health goals.

## User Health Profile
- Goal: ${goalMap[profile.goal] || profile.goal}
- Daily Calorie Target: ${profile.dailyCalories} kcal
- Macro Ratio: Protein ${profile.proteinPercent}%, Fat ${profile.fatPercent}%, Carbs ${profile.carbsPercent}%
${profile.restrictions.length > 0 ? `- Dietary Restrictions: ${profile.restrictions.join(", ")}` : ""}
${profile.sodiumLimit ? `- Sodium Limit: ${profile.sodiumLimit} mg/day` : ""}
${profile.sugarLimit ? `- Sugar Limit: ${profile.sugarLimit} g/day` : ""}
${profile.fiberMin ? `- Fiber Minimum: ${profile.fiberMin} g/day` : ""}

## Recipe Information
- Dish: ${recipe.titleZh}
- Calories per serving: ${recipe.calories} kcal (${recipe.servings || 1} servings)
- Protein: ${recipe.protein}g
- Fat: ${recipe.fat}g
- Carbs: ${recipe.carbs}g
${recipe.sodium ? `- Sodium: ${recipe.sodium}mg` : ""}
${recipe.sugar ? `- Sugar: ${recipe.sugar}g` : ""}
${recipe.fiber ? `- Fiber: ${recipe.fiber}g` : ""}
- Ingredients: ${recipe.ingredients.map((i) => i.nameZh).join(", ")}

## Analysis Requirements
1. Calculate match score (0-100)
2. List pros (2-4 items)
3. List cons (1-3 items)
4. Provide actionable modifications (2-3 specific suggestions)
5. Do not recommend alternative recipes (we query from database)

Please respond in JSON format:
\`\`\`json
{
  "matchScore": 85,
  "summary": "This recipe basically fits your weight loss goal with sufficient protein, but sodium content is slightly high.",
  "pros": [
    "High protein (35g), helps muscle maintenance",
    "Moderate calories (280kcal), suitable for weight loss",
    "Rich in fiber (4g), enhances satiety"
  ],
  "cons": [
    "Sodium content is high (180mg), suggest reducing soy sauce",
    "Fat ratio is slightly high (26%), can use steaming instead of frying"
  ],
  "modifications": [
    "Reduce soy sauce to 50% or use low-sodium soy sauce",
    "Steam chicken breast instead of frying to reduce 5-8g fat",
    "Increase broccoli to 200g for more fiber"
  ]
}
\`\`\`

Important: Return JSON only, no other text. Please respond in English.
`.trim();
  }

  // 中文prompt
  const goalMap: Record<string, string> = {
    weight_loss: "减脂",
    muscle_gain: "增肌",
    maintain: "维持体重",
  };

  return `
你是专业营养师。请分析这道菜谱是否适合用户的健康目标。

## 用户健康档案
- 目标: ${goalMap[profile.goal] || profile.goal}
- 每日热量目标: ${profile.dailyCalories} kcal
- 营养比例: 蛋白质 ${profile.proteinPercent}%, 脂肪 ${profile.fatPercent}%, 碳水 ${profile.carbsPercent}%
${profile.restrictions.length > 0 ? `- 饮食限制: ${profile.restrictions.join(", ")}` : ""}
${profile.sodiumLimit ? `- 钠限制: ${profile.sodiumLimit} mg/天` : ""}
${profile.sugarLimit ? `- 糖限制: ${profile.sugarLimit} g/天` : ""}
${profile.fiberMin ? `- 纤维最低: ${profile.fiberMin} g/天` : ""}

## 菜谱信息
- 菜名: ${recipe.titleZh}
- 每份热量: ${recipe.calories} kcal (${recipe.servings || 1}人份)
- 蛋白质: ${recipe.protein}g
- 脂肪: ${recipe.fat}g
- 碳水: ${recipe.carbs}g
${recipe.sodium ? `- 钠: ${recipe.sodium}mg` : ""}
${recipe.sugar ? `- 糖: ${recipe.sugar}g` : ""}
${recipe.fiber ? `- 纤维: ${recipe.fiber}g` : ""}
- 食材: ${recipe.ingredients.map((i) => i.nameZh).join(", ")}

## 分析要求
1. 计算适配度评分(0-100分)
2. 列出优点(2-4条)
3. 列出需要注意的地方(1-3条)
4. 提供改良建议(2-3条具体可操作的建议)
5. 不要推荐替代菜谱(我们会通过数据库查询)

请严格按照以下 JSON 格式返回:
\`\`\`json
{
  "matchScore": 85,
  "summary": "这道菜谱基本符合您的减脂目标,蛋白质含量充足,但钠含量略高。",
  "pros": [
    "高蛋白质(35g),有助于肌肉维持",
    "热量适中(280kcal),适合减脂期",
    "富含膳食纤维(4g),增强饱腹感"
  ],
  "cons": [
    "钠含量偏高(180mg),建议减少酱油用量",
    "脂肪占比略高(26%),可用蒸煮替代煎炸"
  ],
  "modifications": [
    "将酱油用量减少至原来的50%,或使用低钠酱油",
    "鸡胸肉用蒸煮代替煎炸,可减少5-8g脂肪",
    "增加西兰花份量至200g,补充更多纤维"
  ]
}
\`\`\`

重要:只返回 JSON,不要有其他文字说明。请用中文回答。
`.trim();
}
