/**
 * AI 营养建议服务
 * 使用阿里云 DeepSeek V4 Flash 大模型
 * 支持中英双语（language: 'zh' | 'en'）
 */

import { callLLM } from '@/lib/llm'

export interface NutritionProfile {
  goal: string
  dailyCalories: number
  proteinPercent: number
  fatPercent: number
  carbsPercent: number
}

export interface WeeklyData {
  weekTotal: {
    calories: number
    protein: number
    fat: number
    carbs: number
  }
  daysOnTarget: number
  daysRecorded: number
}

const SYSTEM_PROMPTS = {
  zh: '你是一位专业的营养师，擅长根据用户的饮食数据提供个性化的营养建议。请用简洁、友好的语气回答，不超过3句话。',
  en: 'You are a professional nutritionist skilled at providing personalized nutrition advice based on dietary data. Please respond in a concise and friendly tone in English, within 3 sentences.',
}

const GOAL_LABELS = {
  zh: { weight_loss: '减脂', muscle_gain: '增肌', maintain: '保持体重' },
  en: { weight_loss: 'weight loss', muscle_gain: 'muscle gain', maintain: 'maintaining weight' },
}

/**
 * 调用 LLM 生成营养建议（复用 llm.ts 统一封装）
 */
async function callAI(
  prompt: string,
  language: 'zh' | 'en' = 'zh'
): Promise<{ content: string; source: 'ai' | 'rule' }> {
  try {
    const content: string = await callLLM(prompt, {
      systemPrompt: SYSTEM_PROMPTS[language],
      temperature: 0.7,
      maxTokens: 200,
      rawText: true,
    })
    const fallback = language === 'en' ? 'No suggestions available.' : '暂无建议'
    return { content: content || fallback, source: 'ai' }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('AI 调用失败:', msg)
    return {
      content: generateRuleBasedAdvice(prompt, language),
      source: 'rule',
    }
  }
}

/**
 * 规则生成建议（AI 调用失败时的降级方案，支持中英双语）
 */
function generateRuleBasedAdvice(prompt: string, language: 'zh' | 'en' = 'zh'): string {
  const isEn = language === 'en'

  // 从 prompt 中提取关键数据（中英文 prompt 都用数字提取，不依赖文字）
  const targetCalMatch = prompt.match(/(\d+)\s*(kcal|千卡|calories?)/i)
  const avgCalMatch = prompt.match(/(?:avg(?:erage)?\s*(?:daily\s*)?(?:calories?|cal)|平均每日热量)[：:]\s*(\d+)/i)
  const daysOnTargetMatch = prompt.match(/(?:days? on target|on.?track days?|达标天数)[：:]\s*(\d+)/i)
  const daysRecordedMatch = prompt.match(/(?:recorded?\s*(\d+)\s*day|共记录\s*(\d+)\s*天)/i)
  const goalMatchEn = prompt.match(/(?:goal|目标)[：:\s]+([\w\s]+)/i)

  const targetCal = targetCalMatch ? parseInt(targetCalMatch[1]) : 2000
  const avgCal = avgCalMatch ? parseInt(avgCalMatch[1]) : 0
  const daysOnTarget = daysOnTargetMatch ? parseInt(daysOnTargetMatch[1]) : 0
  const daysRecorded = daysRecordedMatch
    ? parseInt(daysRecordedMatch[1] || daysRecordedMatch[2])
    : 0
  const goalRaw = goalMatchEn ? goalMatchEn[1].trim().toLowerCase() : ''

  const suggestions: string[] = []

  // 规则 1: 热量达标情况
  const calDiff = avgCal - targetCal
  if (avgCal === 0) {
    suggestions.push(
      isEn
        ? 'Start logging your meals to get personalized advice!'
        : '还没有记录，开始记录饮食获取个性化建议！'
    )
  } else if (Math.abs(calDiff) < targetCal * 0.1) {
    suggestions.push(isEn ? 'Great calorie control, keep it up!' : '热量控制得很好，继续保持！')
  } else if (calDiff < 0) {
    suggestions.push(
      isEn
        ? `Calorie intake is ${Math.abs(calDiff)} kcal below target — consider adding healthy snacks like nuts or yogurt.`
        : `平均热量偏低${Math.abs(calDiff)}kcal，建议增加健康零食如坚果、酸奶`
    )
  } else {
    suggestions.push(
      isEn
        ? `Calorie intake is ${calDiff} kcal above target — watch out for oils and sugar.`
        : `平均热量偏高${calDiff}kcal，注意控制油脂和糖分摄入`
    )
  }

  // 规则 2: 达标天数
  const targetRate = daysRecorded > 0 ? daysOnTarget / daysRecorded : 0
  if (targetRate >= 0.7) {
    suggestions.push(
      isEn ? 'Great on-track rate this week, keep going!' : '本周达标率不错，坚持下去！'
    )
  } else if (targetRate >= 0.4) {
    suggestions.push(
      isEn
        ? 'Try planning meals in advance, leaving 100–200 kcal of flexibility each day.'
        : '建议提前规划饮食，每天预留100-200kcal弹性空间'
    )
  } else {
    suggestions.push(
      isEn
        ? 'Large fluctuations detected — try setting fixed meal times and portions.'
        : '饮食波动较大，建议设定固定用餐时间和份量'
    )
  }

  // 规则 3: 目标特定建议
  const isWeightLoss =
    goalRaw.includes('weight_loss') ||
    goalRaw.includes('减脂') ||
    goalRaw.includes('weight loss')
  const isMuscleGain =
    goalRaw.includes('muscle_gain') ||
    goalRaw.includes('增肌') ||
    goalRaw.includes('muscle gain')

  if (isWeightLoss) {
    suggestions.push(
      isEn
        ? 'For fat loss, prioritize high-protein low-fat foods like chicken breast and fish.'
        : '减脂期建议高蛋白低脂，多吃鸡胸肉、鱼类'
    )
  } else if (isMuscleGain) {
    suggestions.push(
      isEn
        ? 'For muscle gain, ensure adequate protein intake and replenish carbs post-workout.'
        : '增肌期保证蛋白质摄入，训练后补充碳水'
    )
  } else {
    suggestions.push(
      isEn
        ? 'Maintain a balanced diet, exercise regularly, and get enough rest.'
        : '保持均衡饮食，适量运动，规律作息'
    )
  }

  return suggestions.slice(0, 2).join(' ')
}

/**
 * 生成周营养建议（支持中英双语）
 */
export async function generateWeeklyAdvice(
  profile: NutritionProfile,
  weeklyData: WeeklyData,
  language: 'zh' | 'en' = 'zh'
): Promise<{ content: string; source: 'ai' | 'rule' }> {
  const { goal, dailyCalories, proteinPercent, fatPercent, carbsPercent } = profile
  const { weekTotal, daysOnTarget, daysRecorded } = weeklyData

  // 没有记录数据时的快速返回
  if (daysRecorded === 0) {
    return {
      content:
        language === 'en'
          ? "No data recorded this week — start logging your meals! 📝"
          : '本周还没有记录数据，开始记录你的饮食吧！📝',
      source: 'rule',
    }
  }

  // 计算平均值
  const avgCalories = Math.round(weekTotal.calories / daysRecorded)
  const avgProtein = Math.round(weekTotal.protein / daysRecorded)
  const avgFat = Math.round(weekTotal.fat / daysRecorded)
  const avgCarbs = Math.round(weekTotal.carbs / daysRecorded)

  const goalLabels = GOAL_LABELS[language]
  const goalText = goalLabels[goal as keyof typeof goalLabels] || (language === 'en' ? 'healthy eating' : '健康饮食')

  // 根据语言构建不同的 prompt（让 AI 也用对应语言回答）
  const prompt =
    language === 'en'
      ? `
User's health goal: ${goalText}
Daily calorie target: ${dailyCalories} kcal
Macro ratio targets: Protein ${proteinPercent}%, Fat ${fatPercent}%, Carbs ${carbsPercent}%

This week's actual performance (recorded ${daysRecorded} days):
- Avg daily calories: ${avgCalories} kcal
- Avg protein: ${avgProtein}g
- Avg fat: ${avgFat}g
- Avg carbs: ${avgCarbs}g
- Days on target: ${daysOnTarget} / ${daysRecorded}

Please provide concise nutrition advice (2–3 sentences) to help the user improve their diet.
`.trim()
      : `
用户健康目标：${goalText}
每日目标热量：${dailyCalories} 千卡
营养比例目标：蛋白质 ${proteinPercent}%、脂肪 ${fatPercent}%、碳水 ${carbsPercent}%

本周实际表现（共记录 ${daysRecorded} 天）：
- 平均每日热量：${avgCalories} 千卡
- 平均蛋白质：${avgProtein}g
- 平均脂肪：${avgFat}g
- 平均碳水：${avgCarbs}g
- 达标天数：${daysOnTarget} / ${daysRecorded}

请根据以上数据，给出简洁的营养建议（2-3句话），帮助用户改进饮食。
`.trim()

  return await callAI(prompt, language)
}
