import { prisma } from '@/lib/prisma'

export type NotificationType =
  | 'COMMENT_REPLY'
  | 'RECIPE_LIKED'
  | 'RECIPE_FAVORITED'
  | 'SUBMISSION_APPROVED'
  | 'SYSTEM'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body: string
  // Accepts any JSON-serializable object; forwarded to Prisma as JSON.
  payload?: Record<string, unknown>
  // 结构化字段（与 `payload` 并行写入顶层列，便于 @@unique 去重）
  actorId?: string | null
  resourceId?: string | null
}

/**
 * Create a single in-app notification row.
 *
 * Push delivery (Expo) is intentionally NOT triggered here to avoid coupling
 * API deploys to `expo-server-sdk`. Wire it up later by reading
 * `user.expoPushToken` and fanning out to the Expo Push API.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    // `as any` until `prisma generate` creates the Notification delegate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma as any).notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        payload: params.payload,
        actorId: params.actorId ?? null,
        resourceId: params.resourceId ?? null,
      },
    })
  } catch (err) {
    // Never break the parent request if notification write fails
    console.warn('[notifications] create failed', err)
    return null
  }
}

/**
 * 是否在 `windowMs` 时间窗内，已经给同一个接收者、同一个 actor、同一个 resource、同一个类型
 * 发过通知？（四元组去重 key：actorId + recipientId + type + resourceId）
 *
 * 对应 Notification 表的 @@unique([actorId, userId, type, resourceId])；Prisma 层用
 * findFirst 防刷，DB 层用 unique constraint 兜底竞态。
 *
 * 老签名保留（payloadPath/payloadEquals）以便已有调用点平滑迁移，内部等价于 actorId 检查。
 */
export async function hasRecentNotification(params: {
  /** recipientId — 接收者 */
  userId: string
  type: NotificationType
  windowMs: number
  /** 触发者 userId；填了就走四元组去重 */
  actorId?: string
  /** 资源 id（通常是 recipeId / commentId） */
  resourceId?: string
  /** 兼容旧签名（等价于 actorId） */
  payloadPath?: string[]
  payloadEquals?: string
}) {
  const since = new Date(Date.now() - params.windowMs)
  const actorId = params.actorId ?? params.payloadEquals

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).notification.findFirst({
    where: {
      userId: params.userId,
      type: params.type,
      createdAt: { gte: since },
      ...(actorId && { actorId }),
      ...(params.resourceId && { resourceId: params.resourceId }),
    },
    select: { id: true },
  })
  return !!existing
}

export const DAY_MS = 24 * 60 * 60 * 1000
