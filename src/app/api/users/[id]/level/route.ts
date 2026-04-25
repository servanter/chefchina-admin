import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleError } from '@/lib/api'

// 等级配置
const LEVELS = [
  { level: 1, nameEn: 'Novice Cook',      nameZh: '新手厨娘',  icon: '🥄', minXp: 0,    maxXp: 99 },
  { level: 2, nameEn: 'Home Cook',        nameZh: '家常达人',  icon: '🍴', minXp: 100,  maxXp: 499 },
  { level: 3, nameEn: 'Skilled Chef',     nameZh: '美食高手',  icon: '🔪', minXp: 500,  maxXp: 1499 },
  { level: 4, nameEn: 'Master Chef',      nameZh: '烹饪大师',  icon: '👨‍🍳', minXp: 1500, maxXp: 4999 },
  { level: 5, nameEn: 'Legendary Chef',   nameZh: '传奇大厨',  icon: '🏆', minXp: 5000, maxXp: Infinity },
]

function getLevelInfo(level: number, xp: number) {
  const config = LEVELS.find((l) => l.level === level) ?? LEVELS[0]
  const nextLevel = LEVELS.find((l) => l.level === level + 1)
  const nextLevelXp = nextLevel ? nextLevel.minXp : null
  const progress = nextLevelXp
    ? Math.min(1, (xp - config.minXp) / (nextLevelXp - config.minXp))
    : 1
  return {
    level: config.level,
    xp,
    levelNameEn: config.nameEn,
    levelNameZh: config.nameZh,
    levelIcon: config.icon,
    nextLevelXp,
    progress: Math.round(progress * 100) / 100,
  }
}

// GET /api/users/[id]/level — 返回用户等级信息（公开）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params
    // 用 as any 因 level/xp 字段未 prisma generate
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { level: true, xp: true },
    })
    if (!user) {
      return successResponse(getLevelInfo(1, 0))
    }
    return successResponse(getLevelInfo(user.level, user.xp))
  } catch (error) {
    return handleError(error)
  }
}
