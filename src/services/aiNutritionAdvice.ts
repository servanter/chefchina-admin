/**
 * AI 营养建议服务
 * 
 * 注意：当前返回 Mock 数据
 * 等用户提供 GPT API Token 后，再接入真实 AI
 */

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

/**
 * 生成周营养建议（Mock 版本）
 */
export async function generateWeeklyAdvice(
  profile: NutritionProfile,
  weeklyData: WeeklyData
): Promise<string> {
  // TODO: 接入 GPT API
  // const prompt = `基于用户目标（${profile.goal}）和本周数据，生成营养建议...`
  // const response = await openai.chat.completions.create({ ... })
  
  // Mock 建议
  const { goal } = profile
  const { daysOnTarget, daysRecorded } = weeklyData

  if (daysRecorded === 0) {
    return '本周还没有记录数据，开始记录你的饮食吧！'
  }

  if (daysOnTarget >= 5) {
    return `太棒了！本周你有 ${daysOnTarget} 天达到了目标，保持这个节奏！💪`
  }

  if (daysOnTarget >= 3) {
    return `不错的进步！本周有 ${daysOnTarget} 天达标，继续努力！`
  }

  // 根据目标给出建议
  const tips: Record<string, string> = {
    weight_loss: '建议：尝试增加高蛋白低热量食物，如鸡胸肉、鱼类和豆腐。多喝水，控制碳水摄入。',
    muscle_gain: '建议：增加蛋白质摄入，推荐多吃瘦肉、鸡蛋和乳制品。运动后补充能量。',
    maintain: '建议：保持均衡饮食，多样化食材选择。适量运动保持健康。',
  }

  return `本周记录了 ${daysRecorded} 天，${daysOnTarget} 天达标。${tips[goal] || tips.maintain}`
}

/**
 * 生成每日饮食建议（Mock 版本）
 */
export async function generateDailyAdvice(
  profile: NutritionProfile,
  currentIntake: {
    calories: number
    protein: number
    fat: number
    carbs: number
  }
): Promise<string> {
  // TODO: 接入 GPT API
  
  // Mock 建议
  const { dailyCalories } = profile
  const { calories } = currentIntake

  const remaining = dailyCalories - calories

  if (remaining > 500) {
    return `今天还有 ${Math.round(remaining)} 卡路里额度，可以再吃点蔬菜和优质蛋白！`
  }

  if (remaining > 0 && remaining <= 500) {
    return `今天已经吃了大部分热量，建议清淡饮食或者适量加餐。`
  }

  return `今天的热量已经达标，如果还饿可以吃些低热量食物如蔬菜沙拉。`
}

/**
 * 菜谱推荐理由（Mock 版本）
 */
export async function generateRecipeRecommendation(
  profile: NutritionProfile,
  recipe: {
    calories: number
    protein: number
    fat: number
    carbs: number
  }
): Promise<string> {
  // TODO: 接入 GPT API
  
  // Mock 推荐理由
  const { goal } = profile

  if (goal === 'weight_loss' && recipe.calories < 400 && recipe.protein > 20) {
    return '✅ 低热量高蛋白，适合减脂'
  }

  if (goal === 'muscle_gain' && recipe.protein > 30) {
    return '💪 高蛋白含量，适合增肌'
  }

  if (goal === 'maintain') {
    return '👍 营养均衡，适合日常'
  }

  return ''
}
