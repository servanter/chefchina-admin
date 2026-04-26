// 经验值和等级管理工具函数
import { prisma } from './prisma'

/**
 * 给用户增加经验值并自动升级
 */
export async function addUserExp(userId: string, action: string): Promise<void> {
  try {
    // 1. 获取该行为的经验值规则
    const rule = await prisma.expRule.findUnique({
      where: { action }
    })

    if (!rule) {
      console.warn(`Exp rule not found for action: ${action}`)
      return
    }

    // 2. 检查每日上限
    if (rule.dailyLimit !== null) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      let todayCount = 0

      // 根据 action 类型查询今日行为次数
      if (action === 'post_recipe') {
        todayCount = await prisma.recipe.count({
          where: {
            authorId: userId,
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          }
        })
      } else if (action === 'post_comment') {
        todayCount = await prisma.comment.count({
          where: {
            userId,
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          }
        })
      } else if (action === 'daily_login') {
        // 注：登录需要单独的日志表，这里简化处理：假设每天只调用一次
        // 实际应该在 Login API 中检查 lastLoginDate
        todayCount = 0 // 跳过检查，由调用方保证每天只调用一次
      }

      if (todayCount >= rule.dailyLimit) {
        console.log(`User ${userId} reached daily limit for action ${action} (${todayCount}/${rule.dailyLimit})`)
        return
      }
    }

    // 3. 增加经验值
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        exp: {
          increment: rule.exp
        }
      }
    })

    // 4. 检查是否需要升级
    await checkAndLevelUp(userId, user.exp)
  } catch (error) {
    console.error('Error adding user exp:', error)
  }
}

/**
 * 检查并升级用户等级
 */
async function checkAndLevelUp(userId: string, currentExp: number): Promise<void> {
  try {
    // 获取所有等级配置
    const levelConfigs = await prisma.levelConfig.findMany({
      orderBy: { level: 'desc' }
    })

    // 找到当前经验值对应的等级
    const newLevel = levelConfigs.find(config => currentExp >= config.expRequired)

    if (!newLevel) return

    // 更新用户等级
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel.level }
    })

    console.log(`User ${userId} leveled up to ${newLevel.level}`)
  } catch (error) {
    console.error('Error checking level up:', error)
  }
}

/**
 * 获取用户等级信息
 */
export async function getUserLevelInfo(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { exp: true, level: true }
    })

    if (!user) return null

    const currentLevelConfig = await prisma.levelConfig.findUnique({
      where: { level: user.level }
    })

    const nextLevelConfig = await prisma.levelConfig.findUnique({
      where: { level: user.level + 1 }
    })

    return {
      exp: user.exp,
      level: user.level,
      currentLevelName: currentLevelConfig ? {
        en: currentLevelConfig.nameEn,
        zh: currentLevelConfig.nameZh
      } : null,
      currentLevelBenefits: currentLevelConfig ? JSON.parse(currentLevelConfig.benefits) : null,
      nextLevelExp: nextLevelConfig?.expRequired ?? null,
      expToNextLevel: nextLevelConfig 
        ? Math.max(0, nextLevelConfig.expRequired - user.exp)
        : 0,
      progressPercent: nextLevelConfig && currentLevelConfig
        ? Math.min(100, Math.round(
            ((user.exp - currentLevelConfig.expRequired) / 
             (nextLevelConfig.expRequired - currentLevelConfig.expRequired)) * 100
          ))
        : 100
    }
  } catch (error) {
    console.error('Error getting user level info:', error)
    return null
  }
}
