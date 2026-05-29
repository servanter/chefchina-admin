/**
 * AI 营养建议服务
 * 使用阿里云 DeepSeek V4 Flash 大模型
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

const NUTRITION_SYSTEM_PROMPT = '你是一位专业的营养师，擅长根据用户的饮食数据提供个性化的营养建议。请用简洁、友好的语气回答，不超过3句话。'

/**
 * 调用 LLM 生成营养建议（复用 llm.ts 统一封装）
 * llm.ts 的 callLLM 默认解析 JSON，这里需要纯文本，
 * 所以捕获 AI_INVALID_RESPONSE 错误后直接取原始文本
 */
async function callAI(prompt: string): Promise<{ content: string; source: 'ai' | 'rule' }> {
  try {
    // callLLM 会尝试解析 JSON，营养建议是纯文本会抛出 AI_INVALID_RESPONSE
    // 通过在 systemPrompt 中要求返回纯文本来避免这个问题
    const content: string = await callLLM(prompt, {
      systemPrompt: NUTRITION_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 200,
      rawText: true,  // 营养建议是纯文本，不需要解析 JSON
    })
    return { content: content || '暂无建议', source: 'ai' }
  } catch (error: unknown) {
    // 其他错误（限流、服务异常）降级到规则建议
    const msg = error instanceof Error ? error.message : String(error)
    console.error('AI 调用失败:', msg)
    return {
      content: generateRuleBasedAdvice(prompt),
      source: 'rule',
    }
  }
}

/**
 * 规则生成建议(AI 调用失败时的降级方案)
 */
function generateRuleBasedAdvice(prompt: string): string {
  // 从 prompt 中提取关键数据
  const goalMatch = prompt.match(/目标：(\S+)/)
  const targetCalMatch = prompt.match(/目标热量：(\d+)/)
  const avgCalMatch = prompt.match(/平均每日热量：(\d+)/)
  const daysOnTargetMatch = prompt.match(/达标天数：(\d+)/)
  const daysRecordedMatch = prompt.match(/共记录 (\d+) 天/)
  
  const goal = goalMatch ? goalMatch[1] : '健康饮食'
  const targetCal = targetCalMatch ? parseInt(targetCalMatch[1]) : 2000
  const avgCal = avgCalMatch ? parseInt(avgCalMatch[1]) : 0
  const daysOnTarget = daysOnTargetMatch ? parseInt(daysOnTargetMatch[1]) : 0
  const daysRecorded = daysRecordedMatch ? parseInt(daysRecordedMatch[1]) : 0
  
  const suggestions: string[] = []
  
  // 规则 1: 热量达标情况
  const calDiff = avgCal - targetCal
  if (Math.abs(calDiff) < targetCal * 0.1) {
    suggestions.push('热量控制得很好,继续保持!')
  } else if (calDiff < 0) {
    suggestions.push(`平均热量偏低${Math.abs(calDiff)}kcal,建议增加健康零食如坚果、酸奶`)
  } else {
    suggestions.push(`平均热量偏高${calDiff}kcal,注意控制油脂和糖分摄入`)
  }
  
  // 规则 2: 达标天数
  const targetRate = daysRecorded > 0 ? daysOnTarget / daysRecorded : 0
  if (targetRate >= 0.7) {
    suggestions.push('本周达标率不错,坚持下去!')
  } else if (targetRate >= 0.4) {
    suggestions.push('建议提前规划饮食,每天预留100-200kcal弹性空间')
  } else {
    suggestions.push('饮食波动较大,建议设定固定用餐时间和份量')
  }
  
  // 规则 3: 目标特定建议
  if (goal.includes('减脂')) {
    suggestions.push('减脂期建议高蛋白低脂,多吃鸡胸肉、鱼类')
  } else if (goal.includes('增肌')) {
    suggestions.push('增肌期保证蛋白质摄入,训练后补充碳水')
  } else {
    suggestions.push('保持均衡饮食,适量运动,规律作息')
  }
  
  // 返回前两条建议
  return suggestions.slice(0, 2).join(' ')
}

/**
 * 生成周营养建议
 */
export async function generateWeeklyAdvice(
  profile: NutritionProfile,
  weeklyData: WeeklyData
): Promise<{ content: string; source: 'ai' | 'rule' }> {
  const { goal, dailyCalories, proteinPercent, fatPercent, carbsPercent } = profile
  const { weekTotal, daysOnTarget, daysRecorded } = weeklyData

  // 没有记录数据时的快速返回
  if (daysRecorded === 0) {
    return {
      content: '本周还没有记录数据，开始记录你的饮食吧！📝',
      source: 'rule'
    }
  }

  // 计算平均值
  const avgCalories = Math.round(weekTotal.calories / daysRecorded)
  const avgProtein = Math.round(weekTotal.protein / daysRecorded)
  const avgFat = Math.round(weekTotal.fat / daysRecorded)
  const avgCarbs = Math.round(weekTotal.carbs / daysRecorded)

  // 目标翻译
  const goalMap: Record<string, string> = {
    weight_loss: '减脂',
    muscle_gain: '增肌',
    maintain: '保持体重',
  }
  const goalText = goalMap[goal] || '健康饮食'

  // 构建 AI prompt
  const prompt = `
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
`

  return await callAI(prompt)
}
