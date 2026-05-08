/**
 * AI 营养建议服务
 * 使用 DeepSeek V4 Flash 大模型
 */

import OpenAI from 'openai'

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

// DeepSeek 配置
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'sk-your-deepseek-api-key',
  baseURL: 'https://api.deepseek.com/v1',
})

const MODEL = 'deepseek-v4-flash'

/**
 * 调用 DeepSeek 生成建议
 */
async function callAI(prompt: string): Promise<{ content: string; source: 'ai' | 'rule' }> {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的营养师，擅长根据用户的饮食数据提供个性化的营养建议。请用简洁、友好的语气回答，不超过3句话。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    return {
      content: response.choices[0]?.message?.content?.trim() || '暂无建议',
      source: 'ai'
    }
  } catch (error) {
    console.error('AI 调用失败:', error)
    // 使用提示词中的数据生成规则建议
    return {
      content: generateRuleBasedAdvice(prompt),
      source: 'rule'
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

/**
 * 生成每日饮食建议
 */
export async function generateDailyAdvice(
  profile: NutritionProfile,
  currentIntake: {
    calories: number
    protein: number
    fat: number
    carbs: number
  }
): Promise<{ content: string; source: 'ai' | 'rule' }> {
  const { goal, dailyCalories, proteinPercent } = profile
  const { calories, protein, fat, carbs } = currentIntake

  const remaining = dailyCalories - calories
  const targetProtein = Math.round((dailyCalories * proteinPercent / 100) / 4) // 1g 蛋白质 = 4 kcal
  const proteinRemaining = targetProtein - protein

  const goalMap: Record<string, string> = {
    weight_loss: '减脂',
    muscle_gain: '增肌',
    maintain: '保持体重',
  }
  const goalText = goalMap[goal] || '健康饮食'

  const prompt = `
用户健康目标：${goalText}
每日目标热量：${dailyCalories} 千卡

今日已摄入：
- 热量：${calories} 千卡（剩余 ${remaining} 千卡）
- 蛋白质：${protein}g（目标 ${targetProtein}g，剩余 ${proteinRemaining}g）
- 脂肪：${fat}g
- 碳水：${carbs}g

请简短建议用户接下来的饮食安排（1-2句话）。
`

  return await callAI(prompt)
}

/**
 * 菜谱推荐理由
 */
export async function generateRecipeRecommendation(
  profile: NutritionProfile,
  recipe: {
    name?: string
    calories: number
    protein: number
    fat: number
    carbs: number
  }
): Promise<{ content: string; source: 'ai' | 'rule' }> {
  const { goal, dailyCalories } = profile

  const goalMap: Record<string, string> = {
    weight_loss: '减脂',
    muscle_gain: '增肌',
    maintain: '保持体重',
  }
  const goalText = goalMap[goal] || '健康饮食'

  const prompt = `
用户健康目标：${goalText}
每日目标热量：${dailyCalories} 千卡

这道菜谱${recipe.name ? `"${recipe.name}"` : ''}的营养成分：
- 热量：${recipe.calories} 千卡
- 蛋白质：${recipe.protein}g
- 脂肪：${recipe.fat}g
- 碳水：${recipe.carbs}g

请用一句话（15字以内）说明这道菜是否适合用户的健康目标。格式如："✅ 低热量高蛋白，适合减脂" 或 "⚠️ 热量较高，建议适量"
`

  return await callAI(prompt)
}

/**
 * 生成营养分析（用于菜谱详情页）
 */
export async function analyzeRecipeNutrition(recipe: {
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber?: number
  sodium?: number
}): Promise<{ content: string; source: 'ai' | 'rule' }> {
  const prompt = `
菜谱名称：${recipe.name}
营养成分（每份）：
- 热量：${recipe.calories} 千卡
- 蛋白质：${recipe.protein}g
- 脂肪：${recipe.fat}g
- 碳水化合物：${recipe.carbs}g
${recipe.fiber ? `- 膳食纤维：${recipe.fiber}g` : ''}
${recipe.sodium ? `- 钠：${recipe.sodium}mg` : ''}

请用2-3句话分析这道菜的营养特点，并说明适合什么人群。语气要友好专业。
`

  return await callAI(prompt)
}
