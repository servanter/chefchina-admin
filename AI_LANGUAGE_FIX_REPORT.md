# AI 分析多语言问题修复报告

## 问题总结
前端传递 `language: "en"` 给 `/api/ai/analyze-recipe` 接口，但 AI 返回的分析内容仍然是中文。

## 根本原因
**系统提示词（System Prompt）在 `callLLM()` 函数中被硬编码为中文**，没有根据 `language` 参数动态调整。

虽然参数传递链条完整（API route → buildAnalysisPrompt），但最关键的系统提示词没有响应语言参数。

## 修复内容

### 1. 修改 `src/lib/llm.ts`
- **添加 `language` 参数**到 `callLLM()` 函数签名
- **动态生成系统提示词**：根据 `language` 参数选择中文或英文版本
- **强化语言指令**：
  - 英文版：`"IMPORTANT: You MUST respond in English only. Do not use Chinese."`
  - 中文版：`"重要：请务必用中文回答。"`
- **添加调试日志**：记录语言参数和系统提示词预览

```typescript
export async function callLLM(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    language?: 'zh' | 'en'; // ← 新增
  } = {}
): Promise<any> {
  const { temperature = 0.7, maxTokens = 4096, language = 'zh' } = options;
  
  // 根据语言选择系统提示词
  const systemPrompt = language === 'en'
    ? "You are a professional nutritionist... IMPORTANT: You MUST respond in English only..."
    : "你是一位专业的营养师... 重要：请务必用中文回答...";
  
  console.log('[LLM] Using language:', language);
  console.log('[LLM] System prompt preview:', systemPrompt.substring(0, 100) + '...');
  
  // ...
}
```

### 2. 修改 `src/app/api/ai/analyze-recipe/route.ts`
- **传递 `language` 参数**到 `callLLM()` 调用
- **添加调试日志**：记录接收到的语言参数

```typescript
// 7. 调用 AI 分析
const prompt = buildAnalysisPrompt(
  { /* recipe data */ },
  profile,
  language as 'zh' | 'en' // ← 已有
);

const analysis = await callLLM(prompt, { 
  temperature: 0.7,
  language: language as 'zh' | 'en' // ← 新增
});
```

## 调用链完整性验证

✅ **完整的参数传递链**：
```
前端 → API route (接收) → buildAnalysisPrompt() (生成 user prompt)
                       → callLLM() (生成 system prompt) → LLM 请求
```

## 测试方法

### 手动测试
使用提供的测试脚本：
```bash
cd chefchina-admin
./test-language-fix.sh
```

需要替换脚本中的：
- `AUTH_TOKEN`: 有效的认证令牌
- `RECIPE_ID`: 测试用的菜谱 ID

### 预期结果
1. **发送 `language: "en"`** → 返回全英文分析（summary, pros, cons, modifications）
2. **发送 `language: "zh"`** → 返回全中文分析
3. **不发送 language 参数** → 默认返回中文分析

### 日志检查
启动开发服务器后，查看控制台日志：
```
[AI Analysis] Received language: en recipeId: xxx
[LLM] Using language: en
[LLM] System prompt preview: You are a professional nutritionist specializing in recipe nutrition analysis...
```

## 提交信息
```
fix(ai): ensure language parameter is passed to LLM system prompt

- Add language parameter to callLLM() function signature
- Generate language-specific system prompts (EN/ZH) based on language param
- Pass language from API route through to callLLM()
- Add debug logging to trace language parameter flow
- Strengthen language instructions in prompts to prevent mixed-language responses

Fixes issue where frontend sends 'en' but AI returns Chinese content.
```

## Git 信息
- **分支**：`fix/ai-optimization`
- **提交 Hash**：`b410fe1`
- **修改文件**：
  - `src/lib/llm.ts`
  - `src/app/api/ai/analyze-recipe/route.ts`

## 后续建议

1. **前端集成测试**：
   - 在前端添加语言切换测试用例
   - 验证 UI 显示与请求语言一致

2. **缓存策略调整**（可选）：
   - 当前缓存没有区分语言
   - 如果需要支持同一用户切换语言，考虑在缓存键中加入 `language`

3. **监控与告警**：
   - 监控 `[LLM]` 日志，确保语言参数正确传递
   - 如果 LLM 返回错误语言，触发告警

4. **移除调试日志**（上线前）：
   - 生产环境可移除 `console.log` 或改为更轻量的日志级别

## 验证清单
- [x] 代码修改完成
- [x] 添加调试日志
- [x] Git 提交
- [ ] 本地测试验证
- [ ] 前端集成测试
- [ ] Code Review
- [ ] 合并到主分支
- [ ] 部署到测试环境
- [ ] 部署到生产环境
