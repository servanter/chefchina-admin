# PRD: ChefChina AI 功能套件

**文档版本**: v1.0  
**创建日期**: 2026-05-11  
**产品经理**: chefchina-pm  
**开发团队**: chefchina-dev  

---

## 📋 目录

1. [需求概述](#需求概述)
2. [功能详细设计](#功能详细设计)
3. [数据库设计](#数据库设计)
4. [API 接口设计](#api-接口设计)
5. [前端交互设计](#前端交互设计)
6. [使用限制逻辑](#使用限制逻辑)
7. [技术实现要点](#技术实现要点)
8. [测试计划](#测试计划)

---

## 需求概述

### 产品目标
为 ChefChina 用户提供 AI 驱动的个性化菜谱体验，包括智能适配分析、AI 菜谱生成和智能购物清单功能。

### 核心价值
- **个性化体验**: 基于用户健康档案提供定制化建议
- **内容创新**: AI 生成菜谱降低内容生产门槛
- **实用工具**: 智能购物清单提升用户便利性
- **Premium 转化**: 通过使用限制引导免费用户升级

### 用户分层
| 用户类型 | AI 适配分析 | AI 菜谱生成 | 智能购物清单 |
|---------|-----------|-----------|------------|
| **免费用户** | 每天 3 次 | 每月 5 次 | 无限使用 |
| **Premium 用户** | 每天 20 次 | 每月 50 次 | 无限使用 |

---

## 功能详细设计

### 功能 1: AI 菜谱适配分析

#### 1.1 功能描述
在菜谱详情页提供「AI 分析是否适合我」按钮，基于用户健康档案分析菜谱与健康目标的适配度。

#### 1.2 触发场景
- 用户已设置健康档案（`UserHealthProfile` 存在）
- 用户在菜谱详情页点击「AI 分析」按钮
- 菜谱必须包含营养数据（`calories`, `protein`, `fat`, `carbs` 非空）

#### 1.3 分析维度
1. **整体适配度**: 0-100 分（综合评分）
2. **营养匹配度**:
   - 热量是否符合目标（weight_loss/muscle_gain/maintain）
   - 三大营养素比例是否匹配用户设置
   - 钠、糖、纤维是否在限制范围内
3. **改良建议**: 
   - 如何调整食材比例
   - 如何改变烹饪方式（少油/少盐）
4. **替代推荐**: 
   - 推荐 2-3 个更适合用户的同类菜谱（基于 category/tags）

#### 1.4 AI Prompt 设计
```typescript
// 构造发送给 LLM 的 prompt
const prompt = `
你是专业营养师。请分析这道菜谱是否适合用户：

## 用户健康档案
- 目标: ${profile.goal} (weight_loss/muscle_gain/maintain)
- 每日热量目标: ${profile.dailyCalories} kcal
- 营养比例: 蛋白质 ${profile.proteinPercent}%, 脂肪 ${profile.fatPercent}%, 碳水 ${profile.carbsPercent}%
- 限制: ${profile.restrictions.join(', ')}
${profile.sodiumLimit ? `- 钠限制: ${profile.sodiumLimit} mg/天` : ''}
${profile.sugarLimit ? `- 糖限制: ${profile.sugarLimit} g/天` : ''}

## 菜谱信息
- 菜名: ${recipe.titleZh}
- 每份热量: ${recipe.calories} kcal
- 蛋白质: ${recipe.protein}g
- 脂肪: ${recipe.fat}g
- 碳水: ${recipe.carbs}g
${recipe.sodium ? `- 钠: ${recipe.sodium}mg` : ''}
${recipe.sugar ? `- 糖: ${recipe.sugar}g` : ''}
- 食材: ${ingredients.map(i => i.nameZh).join(', ')}

请返回 JSON 格式：
{
  "matchScore": 85,  // 0-100
  "summary": "这道菜谱基本符合您的减脂目标，但钠含量略高。",
  "pros": ["蛋白质丰富", "热量适中"],
  "cons": ["钠含量超标30%", "脂肪略高"],
  "modifications": [
    "建议减少酱油用量至原来的50%",
    "可用蒸煮替代油炸"
  ],
  "alternatives": [
    {
      "recipeId": "xxx",
      "reason": "低钠版本，更适合您的限制"
    }
  ]
}
`;
```

#### 1.5 结果展示
- **适配度卡片**: 显示分数、雷达图（热量/蛋白质/脂肪/碳水适配度）
- **优缺点列表**: 以 ✅/⚠️ icon 展示
- **改良建议**: 可折叠的列表
- **替代推荐**: 横向滚动卡片（点击跳转到新菜谱）

---

### 功能 2: AI 菜谱生成器

#### 2.1 功能描述
用户输入食材列表，AI 生成完整的新菜谱（包括标题、食材、步骤、营养估算）。

#### 2.2 入口位置
- 主页顶部 Tab：「发现」「关注」「**AI 生成**」
- 或独立页面：`/ai-recipe-generator`

#### 2.3 输入参数
```typescript
interface GeneratorInput {
  ingredients: string[];      // 必填：["鸡胸肉", "西兰花", "蒜"]
  style?: string;              // 可选：川菜/粤菜/日式/西式/fusion
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  cookTime?: number;           // 期望烹饪时长（分钟）
  servings?: number;           // 几人份
  dietaryRestrictions?: string[]; // ["低钠", "无糖", "素食"]
}
```

#### 2.4 AI Prompt 设计
```typescript
const prompt = `
你是专业厨师。根据以下食材生成一道菜谱：

## 输入食材
${ingredients.join(', ')}

## 要求
- 菜系风格: ${style || '不限'}
- 难度: ${difficulty || '适中'}
- 烹饪时间: ${cookTime ? `约${cookTime}分钟` : '不限'}
- 份数: ${servings || 2}人份
${restrictions.length > 0 ? `- 饮食限制: ${restrictions.join(', ')}` : ''}

请返回 JSON 格式：
{
  "titleZh": "蒜香西兰花鸡胸",
  "titleEn": "Garlic Broccoli Chicken",
  "descriptionZh": "简单快手，营养均衡，适合健身减脂人群。",
  "difficulty": "EASY",
  "prepTime": 10,
  "cookTimeMin": 15,
  "servings": 2,
  "ingredients": [
    { "nameZh": "鸡胸肉", "nameEn": "Chicken Breast", "amount": "200", "unit": "g" },
    { "nameZh": "西兰花", "nameEn": "Broccoli", "amount": "150", "unit": "g" },
    { "nameZh": "蒜", "nameEn": "Garlic", "amount": "3", "unit": "瓣" }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "titleZh": "准备食材",
      "contentZh": "鸡胸肉切块，西兰花切小朵，蒜切片。",
      "durationMin": 5
    },
    {
      "stepNumber": 2,
      "titleZh": "焯水",
      "contentZh": "西兰花焯水1分钟，捞出沥干。",
      "durationMin": 2
    }
  ],
  "nutrition": {
    "calories": 280,
    "protein": 35,
    "fat": 8,
    "carbs": 12,
    "fiber": 4,
    "sodium": 180
  },
  "tags": ["低脂", "高蛋白", "快手菜"]
}
`;
```

#### 2.5 生成流程
1. **输入验证**: 至少 1 个食材，最多 10 个
2. **调用 AI**: 使用 gongfeng/claude-sonnet-4-5
3. **解析结果**: 验证 JSON 结构完整性
4. **保存草稿**: 存入 `Recipe` 表（`isPublished = false`, `authorId = userId`）
5. **展示预览**: 用户可编辑后发布

#### 2.6 结果展示
- **预览页面**: 完整的菜谱详情页样式
- **编辑按钮**: 可修改标题/食材/步骤
- **发布按钮**: 确认后 `isPublished = true`，发布到个人主页

---

### 功能 3: 智能购物清单

#### 3.1 功能描述
从用户收藏的菜谱中自动汇总食材，合并重复项，提供导出和分享功能。

#### 3.2 入口位置
- 收藏页面顶部：「**生成购物清单**」按钮
- 或独立页面：`/shopping-list`

#### 3.3 数据来源
```sql
-- 查询用户收藏的所有菜谱的食材
SELECT 
  i.nameZh, i.nameEn, i.amount, i.unit, i.isOptional,
  r.titleZh AS recipeTitle
FROM Ingredient i
JOIN Recipe r ON i.recipeId = r.id
JOIN Favorite f ON f.recipeId = r.id
WHERE f.userId = ?
ORDER BY i.nameZh;
```

#### 3.4 智能合并逻辑
```typescript
interface ShoppingItem {
  ingredient: string;      // "鸡蛋"
  totalAmount: number;     // 8
  unit: string;            // "个"
  recipes: string[];       // ["番茄炒蛋", "蛋炒饭"]
  isOptional: boolean;
}

// 合并规则
// 1. 相同食材名称 + 相同单位 → 数量相加
// 2. 相同食材名称 + 不同单位 → 分开显示（如：鸡蛋 500g / 鸡蛋 6个）
// 3. 标记可选食材（任一菜谱中 isOptional = true）
```

#### 3.5 单位转换（V1 暂不实现，记录为未来优化点）
```typescript
// 未来可实现单位转换
// 例如：鸡蛋 500g + 鸡蛋 6个 → 鸡蛋 10个（假设1个≈50g）
// 需要维护食材单位转换表
```

#### 3.6 UI 设计
```
┌─────────────────────────────────────┐
│  🛒 购物清单 (基于 12 个收藏菜谱)      │
├─────────────────────────────────────┤
│ 蔬菜类                               │
│  □ 西红柿  3 个  (来自 2 道菜)       │
│  □ 黄瓜    2 根  (来自 1 道菜)       │
│                                      │
│ 肉类                                 │
│  □ 鸡胸肉  600 g  (来自 3 道菜)      │
│  □ 猪肉    300 g  (来自 1 道菜)      │
│                                      │
│ 调料                                 │
│  □ 盐      适量   (来自 8 道菜)      │
│  □ 酱油    50 ml  (来自 4 道菜) (可选)│
│                                      │
│ [导出为文本] [分享] [清空已勾选]       │
└─────────────────────────────────────┘
```

#### 3.7 导出格式
```
【ChefChina 购物清单】

蔬菜类：
☐ 西红柿 3 个
☐ 黄瓜 2 根

肉类：
☐ 鸡胸肉 600 g
☐ 猪肉 300 g

调料：
☐ 盐 适量
☐ 酱油 50 ml (可选)

---
生成自 ChefChina
https://chefchina.app/shopping-list
```

---

## 数据库设计

### 新增表 1: ai_recipe_analysis

**用途**: 缓存 AI 分析结果，避免重复调用 LLM

```prisma
model AiRecipeAnalysis {
  id              String   @id @default(cuid())
  userId          String
  recipeId        String
  matchScore      Int      // 0-100
  summary         String
  pros            String[] // JSON array
  cons            String[]
  modifications   String[]
  alternatives    Json     // [{ recipeId, reason }]
  createdAt       DateTime @default(now())
  expiresAt       DateTime // 7天后过期，需要重新分析

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([userId, recipeId])
  @@index([userId, createdAt])
  @@index([expiresAt]) // 定期清理过期数据
  @@map("ai_recipe_analysis")
}
```

### 新增表 2: ai_generated_recipes

**用途**: 记录 AI 生成历史，方便用户查看历史生成记录

```prisma
model AiGeneratedRecipe {
  id              String   @id @default(cuid())
  userId          String
  recipeId        String?  // 如果用户发布了，关联到 Recipe.id
  inputIngredients String[] // 用户输入的食材
  style           String?
  difficulty      String?
  generatedData   Json     // AI 返回的完整 JSON
  isPublished     Boolean  @default(false)
  createdAt       DateTime @default(now())

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe Recipe? @relation(fields: [recipeId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@map("ai_generated_recipes")
}
```

### 新增表 3: ai_usage_quota

**用途**: 跟踪用户 AI 功能使用次数

```prisma
model AiUsageQuota {
  id                    String   @id @default(cuid())
  userId                String   @unique
  analysisUsedToday     Int      @default(0)
  analysisResetAt       DateTime // 每日 00:00 重置
  generatorUsedThisMonth Int     @default(0)
  generatorResetAt      DateTime // 每月 1 号重置
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("ai_usage_quota")
}
```

### 修改现有表

#### Recipe 表
```prisma
// 添加关联
model Recipe {
  // ... 现有字段
  aiAnalysis       AiRecipeAnalysis[]
  aiGeneratedFrom  AiGeneratedRecipe[]
}
```

#### User 表
```prisma
model User {
  // ... 现有字段
  aiAnalysis       AiRecipeAnalysis[]
  aiGeneratedRecipes AiGeneratedRecipe[]
  aiUsageQuota     AiUsageQuota?
}
```

---

## API 接口设计

### API 1: POST /api/ai/analyze-recipe

**功能**: 分析菜谱适配度

**请求**:
```typescript
{
  "recipeId": "clxxx"
}
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "analysisId": "clyyy",
    "matchScore": 85,
    "summary": "这道菜谱基本符合您的减脂目标，但钠含量略高。",
    "pros": ["蛋白质丰富", "热量适中"],
    "cons": ["钠含量超标30%", "脂肪略高"],
    "modifications": [
      "建议减少酱油用量至原来的50%",
      "可用蒸煮替代油炸"
    ],
    "alternatives": [
      {
        "recipeId": "clzzz",
        "title": "清蒸鸡胸",
        "reason": "低钠版本，更适合您的限制"
      }
    ]
  },
  "quotaRemaining": 2 // 今日剩余次数
}
```

**错误响应**:
```typescript
// 1. 未设置健康档案
{ "success": false, "error": "PROFILE_REQUIRED" }

// 2. 超出配额
{ "success": false, "error": "QUOTA_EXCEEDED", "resetAt": "2026-05-12T00:00:00Z" }

// 3. 菜谱缺少营养数据
{ "success": false, "error": "NUTRITION_DATA_MISSING" }
```

**实现逻辑**:
```typescript
// 1. 检查用户是否有健康档案
const profile = await db.userHealthProfile.findUnique({ where: { userId } });
if (!profile) throw new Error("PROFILE_REQUIRED");

// 2. 检查配额
const quota = await checkAndUpdateQuota(userId, "analysis");
if (!quota.allowed) throw new Error("QUOTA_EXCEEDED");

// 3. 检查缓存（7天内有效）
const cached = await db.aiRecipeAnalysis.findFirst({
  where: {
    userId,
    recipeId,
    expiresAt: { gte: new Date() }
  }
});
if (cached) return cached;

// 4. 调用 LLM
const result = await callLLM(recipe, profile);

// 5. 保存结果（过期时间：7天后）
await db.aiRecipeAnalysis.create({
  data: {
    userId,
    recipeId,
    ...result,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
});

return result;
```

---

### API 2: POST /api/ai/generate-recipe

**功能**: 生成新菜谱

**请求**:
```typescript
{
  "ingredients": ["鸡胸肉", "西兰花", "蒜"],
  "style": "川菜",
  "difficulty": "EASY",
  "cookTime": 30,
  "servings": 2,
  "dietaryRestrictions": ["低钠"]
}
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "generationId": "clxxx",
    "recipe": {
      "titleZh": "蒜香西兰花鸡胸",
      "titleEn": "Garlic Broccoli Chicken",
      "descriptionZh": "简单快手，营养均衡。",
      "difficulty": "EASY",
      "prepTime": 10,
      "cookTimeMin": 15,
      "servings": 2,
      "ingredients": [...],
      "steps": [...],
      "nutrition": {
        "calories": 280,
        "protein": 35,
        "fat": 8,
        "carbs": 12
      }
    }
  },
  "quotaRemaining": 4 // 本月剩余次数
}
```

**错误响应**:
```typescript
// 1. 超出配额
{ "success": false, "error": "QUOTA_EXCEEDED", "resetAt": "2026-06-01T00:00:00Z" }

// 2. 食材数量不符
{ "success": false, "error": "INVALID_INGREDIENTS", "message": "需要 1-10 个食材" }

// 3. LLM 生成失败
{ "success": false, "error": "GENERATION_FAILED", "retry": true }
```

**实现逻辑**:
```typescript
// 1. 验证输入
if (ingredients.length < 1 || ingredients.length > 10) {
  throw new Error("INVALID_INGREDIENTS");
}

// 2. 检查配额
const quota = await checkAndUpdateQuota(userId, "generator");
if (!quota.allowed) throw new Error("QUOTA_EXCEEDED");

// 3. 调用 LLM
const generatedData = await callLLM(input);

// 4. 保存到 ai_generated_recipes（草稿状态）
const generation = await db.aiGeneratedRecipe.create({
  data: {
    userId,
    inputIngredients: ingredients,
    style,
    difficulty,
    generatedData,
    isPublished: false
  }
});

// 5. 创建 Recipe 草稿
const recipe = await db.recipe.create({
  data: {
    ...generatedData,
    authorId: userId,
    isPublished: false,
    categoryId: await inferCategory(style) // 根据菜系推断分类
  }
});

// 6. 关联生成记录
await db.aiGeneratedRecipe.update({
  where: { id: generation.id },
  data: { recipeId: recipe.id }
});

return { generationId: generation.id, recipe };
```

---

### API 3: POST /api/ai/publish-generated-recipe

**功能**: 发布 AI 生成的菜谱

**请求**:
```typescript
{
  "generationId": "clxxx",
  "edits": {
    "titleZh": "改良版蒜香鸡胸", // 可选：用户修改的内容
    "steps": [...] // 可选
  }
}
```

**响应**:
```typescript
{
  "success": true,
  "recipeId": "clyyy",
  "url": "/recipe/clyyy"
}
```

---

### API 4: GET /api/shopping-list

**功能**: 生成购物清单

**请求**: 无 body（从用户收藏自动汇总）

**响应**:
```typescript
{
  "success": true,
  "data": {
    "categories": {
      "蔬菜类": [
        {
          "ingredient": "西红柿",
          "totalAmount": 3,
          "unit": "个",
          "recipes": ["番茄炒蛋", "番茄牛腩"],
          "isOptional": false
        }
      ],
      "肉类": [...],
      "调料": [...]
    },
    "totalRecipes": 12,
    "totalItems": 28
  }
}
```

**导出接口**: POST /api/shopping-list/export
```typescript
{
  "format": "text" | "json"
}
// 返回纯文本或 JSON
```

---

### API 5: GET /api/ai/quota

**功能**: 查询用户 AI 配额使用情况

**响应**:
```typescript
{
  "analysis": {
    "used": 2,
    "limit": 3, // 免费用户
    "resetAt": "2026-05-12T00:00:00Z"
  },
  "generator": {
    "used": 3,
    "limit": 5,
    "resetAt": "2026-06-01T00:00:00Z"
  }
}
```

---

## 前端交互设计

### 页面 1: 菜谱详情页（添加 AI 分析按钮）

**位置**: `/recipe/[id].tsx`

**UI 改动**:
```tsx
// 在菜谱封面下方，营养信息上方添加
<Button 
  variant="gradient" 
  icon="sparkles"
  onPress={handleAnalyzeRecipe}
  disabled={!userProfile || analyzing}
>
  {analyzing ? "AI 分析中..." : "🪄 AI 分析是否适合我"}
</Button>

{!userProfile && (
  <Text className="text-sm text-gray-500 mt-2">
    💡 <Link href="/profile/health">设置健康档案</Link> 后即可使用
  </Text>
)}
```

**弹窗/Bottom Sheet 展示结果**:
```tsx
<BottomSheet isOpen={showAnalysis}>
  <View className="p-4">
    {/* 适配度分数 */}
    <View className="items-center mb-4">
      <CircularProgress value={matchScore} />
      <Text className="text-2xl font-bold">{matchScore}分</Text>
      <Text className="text-gray-600">{summary}</Text>
    </View>

    {/* 优缺点 */}
    <View className="mb-4">
      <Text className="font-semibold mb-2">✅ 优点</Text>
      {pros.map(p => <Text key={p}>• {p}</Text>)}
      
      <Text className="font-semibold mt-4 mb-2">⚠️ 需要注意</Text>
      {cons.map(c => <Text key={c}>• {c}</Text>)}
    </View>

    {/* 改良建议（可折叠） */}
    <Accordion title="💡 改良建议">
      {modifications.map(m => <Text key={m}>• {m}</Text>)}
    </Accordion>

    {/* 替代推荐 */}
    <Text className="font-semibold mt-4 mb-2">🔄 更适合您的菜谱</Text>
    <ScrollView horizontal>
      {alternatives.map(alt => (
        <RecipeCard key={alt.recipeId} {...alt} />
      ))}
    </ScrollView>
  </View>
</BottomSheet>
```

**配额提示**:
```tsx
{quotaRemaining === 0 && (
  <Banner type="warning">
    今日分析次数已用完。
    <Link href="/premium">升级 Premium</Link> 可享每天 20 次。
  </Banner>
)}
```

---

### 页面 2: AI 菜谱生成器

**路由**: `/ai-recipe-generator`

**表单设计**:
```tsx
<View className="p-4">
  <Text className="text-2xl font-bold mb-4">🪄 AI 菜谱生成器</Text>

  {/* 食材输入 */}
  <View className="mb-4">
    <Text className="font-semibold mb-2">我有这些食材：</Text>
    <TagInput 
      value={ingredients}
      onChange={setIngredients}
      placeholder="输入食材，按回车添加（如：鸡胸肉）"
      maxTags={10}
    />
    <Text className="text-sm text-gray-500 mt-1">
      至少 1 个，最多 10 个
    </Text>
  </View>

  {/* 可选参数 */}
  <Accordion title="更多选项（可选）">
    <Select label="菜系风格" options={["不限", "川菜", "粤菜", "日式", "西式"]} />
    <Select label="难度" options={["不限", "简单", "中等", "困难"]} />
    <Input label="烹饪时间（分钟）" type="number" />
    <Input label="份数" type="number" defaultValue="2" />
    <MultiSelect label="饮食限制" options={["低钠", "低糖", "素食", "无麸质"]} />
  </Accordion>

  {/* 生成按钮 */}
  <Button 
    variant="gradient"
    size="large"
    onPress={handleGenerate}
    disabled={ingredients.length === 0 || generating}
    className="mt-4"
  >
    {generating ? "AI 正在创作中..." : "✨ 生成菜谱"}
  </Button>

  {/* 配额显示 */}
  <Text className="text-sm text-center text-gray-500 mt-2">
    本月剩余 {quotaRemaining}/5 次
  </Text>
</View>
```

**生成结果预览页**:
```tsx
// 跳转到 /ai-recipe-preview/[generationId]
<View>
  {/* 完整的菜谱详情页样式 */}
  <RecipeDetail recipe={generatedRecipe} isPreview />

  {/* 底部操作栏 */}
  <View className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
    <Button variant="outline" onPress={handleEdit}>
      ✏️ 编辑
    </Button>
    <Button variant="solid" onPress={handlePublish}>
      ✅ 发布到我的主页
    </Button>
  </View>
</View>
```

---

### 页面 3: 智能购物清单

**路由**: `/shopping-list`

**入口**: 收藏页面顶部按钮

**UI 设计**:
```tsx
<View className="p-4">
  <View className="flex-row justify-between items-center mb-4">
    <Text className="text-2xl font-bold">🛒 购物清单</Text>
    <Text className="text-gray-500">基于 {totalRecipes} 个收藏菜谱</Text>
  </View>

  {/* 分类显示 */}
  {Object.entries(categories).map(([category, items]) => (
    <View key={category} className="mb-6">
      <Text className="text-lg font-semibold mb-2">{category}</Text>
      {items.map(item => (
        <View key={item.ingredient} className="flex-row items-center mb-2">
          <Checkbox 
            value={checkedItems.includes(item.ingredient)}
            onChange={() => toggleItem(item.ingredient)}
          />
          <Text className={checkedItems.includes(item.ingredient) ? "line-through" : ""}>
            {item.ingredient} {item.totalAmount} {item.unit}
          </Text>
          {item.isOptional && <Badge>可选</Badge>}
          <TouchableOpacity onPress={() => showRecipesList(item.recipes)}>
            <Text className="text-xs text-blue-500 ml-2">
              来自 {item.recipes.length} 道菜
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  ))}

  {/* 底部操作 */}
  <View className="flex-row gap-2">
    <Button variant="outline" onPress={handleExport}>
      📋 导出为文本
    </Button>
    <Button variant="outline" onPress={handleShare}>
      📤 分享
    </Button>
    <Button variant="ghost" onPress={handleClearChecked}>
      🗑️ 清空已勾选
    </Button>
  </View>
</View>
```

---

## 使用限制逻辑

### 配额检查函数

```typescript
// lib/ai-quota.ts

interface QuotaConfig {
  analysis: { free: number; premium: number; resetPeriod: "daily" };
  generator: { free: number; premium: number; resetPeriod: "monthly" };
}

const QUOTA_CONFIG: QuotaConfig = {
  analysis: { free: 3, premium: 20, resetPeriod: "daily" },
  generator: { free: 5, premium: 50, resetPeriod: "monthly" }
};

export async function checkAndUpdateQuota(
  userId: string,
  feature: "analysis" | "generator"
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  // 1. 获取用户订阅状态
  const subscription = await db.subscription.findUnique({
    where: { userId }
  });
  const isPremium = subscription?.status === "ACTIVE" && subscription.planType === "PREMIUM";

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
  const limit = isPremium ? QUOTA_CONFIG[feature].premium : QUOTA_CONFIG[feature].free;
  const used = feature === "analysis" ? quota.analysisUsedToday : quota.generatorUsedThisMonth;
  const allowed = used < limit;

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
    remaining: Math.max(0, limit - used - 1),
    resetAt: feature === "analysis" ? quota.analysisResetAt : quota.generatorResetAt
  };
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function getFirstDayOfNextMonth(): Date {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}
```

### 前端配额展示组件

```tsx
// components/QuotaBadge.tsx
export function QuotaBadge({ feature }: { feature: "analysis" | "generator" }) {
  const { data } = useSWR("/api/ai/quota");
  const quota = data?.[feature];

  if (!quota) return null;

  const percentage = (quota.used / quota.limit) * 100;
  const color = percentage >= 100 ? "red" : percentage >= 80 ? "orange" : "green";

  return (
    <View className="flex-row items-center gap-2">
      <Progress value={percentage} color={color} />
      <Text className="text-sm">
        {quota.used}/{quota.limit}
      </Text>
      {percentage >= 100 && (
        <Link href="/premium" className="text-blue-500 text-sm">
          升级
        </Link>
      )}
    </View>
  );
}
```

---

## 技术实现要点

### 1. LLM 调用封装

```typescript
// lib/llm.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.GONGFENG_AI_API_KEY,
  baseURL: "https://gongfeng.ai/v1" // 工蜂 AI 内网地址
});

export async function callLLM(prompt: string): Promise<any> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }]
  });

  const content = response.content[0].text;
  
  // 解析 JSON（LLM 可能包裹在 ```json ... ``` 中）
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;
  
  return JSON.parse(jsonStr);
}
```

### 2. 错误处理

```typescript
// 所有 AI API 都需要 try-catch
try {
  const result = await callLLM(prompt);
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) {
      throw new Error("AI_RATE_LIMIT");
    }
    if (error.status === 500) {
      throw new Error("AI_SERVICE_ERROR");
    }
  }
  throw new Error("AI_UNKNOWN_ERROR");
}
```

### 3. 缓存策略

- **AI 分析结果**: 缓存 7 天（存 DB）
- **购物清单**: 前端缓存 5 分钟（SWR）
- **配额查询**: 前端缓存 1 分钟

### 4. 性能优化

```typescript
// 批量查询食材时使用 JOIN 而不是 N+1
const ingredients = await db.ingredient.findMany({
  where: {
    recipeId: { in: recipeIds }
  },
  include: {
    recipe: { select: { titleZh: true } }
  }
});
```

### 5. 监控指标

需要在后台监控：
- AI 调用成功率
- 平均响应时间
- 配额使用分布（免费 vs Premium）
- 生成菜谱的发布率（用户满意度指标）

---

## 测试计划

### 单元测试

#### 1. 配额逻辑测试
```typescript
describe("checkAndUpdateQuota", () => {
  it("免费用户每天只能分析 3 次", async () => {
    const userId = "test-user";
    
    // 第 1-3 次应该成功
    for (let i = 0; i < 3; i++) {
      const result = await checkAndUpdateQuota(userId, "analysis");
      expect(result.allowed).toBe(true);
    }
    
    // 第 4 次应该失败
    const result = await checkAndUpdateQuota(userId, "analysis");
    expect(result.allowed).toBe(false);
  });

  it("Premium 用户可以分析 20 次", async () => {
    // 创建 Premium 订阅
    await createPremiumSubscription(userId);
    
    for (let i = 0; i < 20; i++) {
      const result = await checkAndUpdateQuota(userId, "analysis");
      expect(result.allowed).toBe(true);
    }
  });

  it("每日重置应该正常工作", async () => {
    // 用完今天的配额
    await useAllQuota(userId, "analysis");
    
    // 模拟时间到明天 00:00
    jest.setSystemTime(tomorrow);
    
    // 应该可以再次使用
    const result = await checkAndUpdateQuota(userId, "analysis");
    expect(result.allowed).toBe(true);
  });
});
```

#### 2. 购物清单合并测试
```typescript
describe("mergeShoppingList", () => {
  it("相同食材相同单位应该合并数量", () => {
    const input = [
      { name: "鸡蛋", amount: 3, unit: "个" },
      { name: "鸡蛋", amount: 5, unit: "个" }
    ];
    const result = mergeShoppingList(input);
    expect(result).toEqual([
      { name: "鸡蛋", totalAmount: 8, unit: "个" }
    ]);
  });

  it("相同食材不同单位应该分开显示", () => {
    const input = [
      { name: "鸡蛋", amount: 500, unit: "g" },
      { name: "鸡蛋", amount: 6, unit: "个" }
    ];
    const result = mergeShoppingList(input);
    expect(result).toHaveLength(2);
  });
});
```

### 集成测试

#### 1. AI 分析流程测试
```typescript
describe("POST /api/ai/analyze-recipe", () => {
  it("未设置健康档案应该返回 PROFILE_REQUIRED", async () => {
    const res = await POST("/api/ai/analyze-recipe", { recipeId: "xxx" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("PROFILE_REQUIRED");
  });

  it("超出配额应该返回 QUOTA_EXCEEDED", async () => {
    await useAllQuota(userId, "analysis");
    const res = await POST("/api/ai/analyze-recipe", { recipeId: "xxx" });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("QUOTA_EXCEEDED");
  });

  it("正常情况应该返回分析结果", async () => {
    const res = await POST("/api/ai/analyze-recipe", { recipeId: validRecipeId });
    expect(res.status).toBe(200);
    expect(res.body.data.matchScore).toBeGreaterThanOrEqual(0);
    expect(res.body.data.matchScore).toBeLessThanOrEqual(100);
  });
});
```

### E2E 测试（App 端）

#### 1. 用户使用 AI 分析功能
```typescript
test("用户可以在菜谱详情页使用 AI 分析", async () => {
  // 1. 设置健康档案
  await navigateTo("/profile/health");
  await fillHealthProfile({ goal: "weight_loss", dailyCalories: 1500 });
  await tap("保存");

  // 2. 打开菜谱详情页
  await navigateTo("/recipe/clxxx");
  
  // 3. 点击 AI 分析按钮
  await tap("AI 分析是否适合我");
  
  // 4. 等待结果加载
  await waitFor("适配度分数");
  
  // 5. 验证结果展示
  expect(screen.getByText(/\d+分/)).toBeVisible();
  expect(screen.getByText("优点")).toBeVisible();
});
```

#### 2. 配额限制测试
```typescript
test("免费用户超出配额后应该看到升级提示", async () => {
  // 用完 3 次配额
  for (let i = 0; i < 3; i++) {
    await useAiAnalysis();
  }
  
  // 第 4 次应该看到错误提示
  await tap("AI 分析是否适合我");
  expect(screen.getByText("今日分析次数已用完")).toBeVisible();
  expect(screen.getByText("升级 Premium")).toBeVisible();
});
```

---

## 附录

### A. 数据库 Migration 脚本

```sql
-- 20260511_ai_features.sql

-- 1. 创建 ai_recipe_analysis 表
CREATE TABLE "ai_recipe_analysis" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "recipe_id" TEXT NOT NULL,
  "match_score" INTEGER NOT NULL,
  "summary" TEXT NOT NULL,
  "pros" TEXT[] NOT NULL,
  "cons" TEXT[] NOT NULL,
  "modifications" TEXT[] NOT NULL,
  "alternatives" JSONB NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP NOT NULL,
  CONSTRAINT "ai_recipe_analysis_user_id_recipe_id_unique" UNIQUE ("user_id", "recipe_id"),
  CONSTRAINT "ai_recipe_analysis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "ai_recipe_analysis_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes" ("id") ON DELETE CASCADE
);

CREATE INDEX "ai_recipe_analysis_user_id_created_at_idx" ON "ai_recipe_analysis" ("user_id", "created_at");
CREATE INDEX "ai_recipe_analysis_expires_at_idx" ON "ai_recipe_analysis" ("expires_at");

-- 2. 创建 ai_generated_recipes 表
CREATE TABLE "ai_generated_recipes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "recipe_id" TEXT,
  "input_ingredients" TEXT[] NOT NULL,
  "style" TEXT,
  "difficulty" TEXT,
  "generated_data" JSONB NOT NULL,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_generated_recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "ai_generated_recipes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes" ("id") ON DELETE SET NULL
);

CREATE INDEX "ai_generated_recipes_user_id_created_at_idx" ON "ai_generated_recipes" ("user_id", "created_at");

-- 3. 创建 ai_usage_quota 表
CREATE TABLE "ai_usage_quota" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "analysis_used_today" INTEGER NOT NULL DEFAULT 0,
  "analysis_reset_at" TIMESTAMP NOT NULL,
  "generator_used_this_month" INTEGER NOT NULL DEFAULT 0,
  "generator_reset_at" TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP NOT NULL,
  CONSTRAINT "ai_usage_quota_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "ai_usage_quota_user_id_idx" ON "ai_usage_quota" ("user_id");
```

### B. 环境变量配置

```bash
# .env.example 添加以下配置

# 工蜂 AI API
GONGFENG_AI_API_KEY=your_api_key_here
GONGFENG_AI_BASE_URL=https://gongfeng.ai/v1

# AI 功能开关（可用于灰度发布）
FEATURE_AI_ANALYSIS_ENABLED=true
FEATURE_AI_GENERATOR_ENABLED=true
FEATURE_SHOPPING_LIST_ENABLED=true
```

---

## 总结

本 PRD 涵盖了三个 AI 功能的完整设计：

✅ **AI 菜谱适配分析**: 个性化健康建议  
✅ **AI 菜谱生成器**: 降低内容生产门槛  
✅ **智能购物清单**: 提升用户便利性  

**关键设计决策**：
1. 使用数据库缓存 AI 结果（7天），减少重复调用
2. 配额系统采用日/月重置机制，避免滥用
3. 免费用户体验足够的配额（3次/5次），引导升级 Premium
4. 购物清单功能不限制（提升用户粘性）

**下一步**：
1. ✅ PM 完成 PRD 编写
2. 🔄 派发 chefchina-dev 开始开发
3. 📅 预计开发周期：3-5 天
4. 🧪 QA 测试 + 灰度发布

---

**文档结束**
