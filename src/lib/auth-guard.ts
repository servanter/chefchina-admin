import type { NextRequest } from 'next/server'
import { verifyAuthToken, type AuthTokenPayload } from '@/lib/auth'
import { errorResponse } from '@/lib/api'

// ─────────────────────────────────────────
// 认证守卫（Sprint-2 · Notification/Push-token 收紧）
// ─────────────────────────────────────────
//
// 统一负责：
// - 从 `Authorization: Bearer <token>` 头解析 JWT
// - requireAuth / requireSelfOrAdmin 两种最小策略
//
// 路由里使用方式（典型）：
//
//   const auth = requireAuth(req)
//   if (auth instanceof Response) return auth  // 401
//   const guard = requireSelfOrAdmin(req, targetUserId, auth)
//   if (guard instanceof Response) return guard // 403
//   // 继续业务...

const BEARER_PREFIX = 'bearer ' // 大小写不敏感比对用；仅内部使用

/**
 * 从请求头拿 token 并校验。非法 / 过期 / 空 → null。
 */
export function extractAuth(req: NextRequest): AuthTokenPayload | null {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header) return null
  // BUG-006 修复：Bearer 前缀做大小写不敏感匹配（兼容 "bearer"/"BEARER" 等客户端）
  if (!header.toLowerCase().startsWith(BEARER_PREFIX)) return null
  const token = header.split(/\s+/)[1]?.trim()
  if (!token) return null
  return verifyAuthToken(token)
}

/**
 * 要求已登录；未登录返回 401 Response。
 * 已登录则返回 token payload。
 */
export function requireAuth(req: NextRequest): AuthTokenPayload | Response {
  const auth = extractAuth(req)
  if (!auth) {
    // 注意：仅打印 url，不打 token 本身，避免日志泄漏
    console.warn('[AUTH] token missing:', req.url)
    return errorResponse('Unauthorized', 401)
  }
  return auth
}

/**
 * 要求调用方是 `targetUserId` 本人，或是 ADMIN。
 * 传入已解析的 auth 可复用；否则从 req 重新抽。
 */
export function requireSelfOrAdmin(
  req: NextRequest,
  targetUserId: string,
  auth?: AuthTokenPayload | null,
): AuthTokenPayload | Response {
  const payload = auth ?? extractAuth(req)
  if (!payload) {
    console.warn('[AUTH] token missing:', req.url)
    return errorResponse('Unauthorized', 401)
  }
  if (payload.sub !== targetUserId && payload.role !== 'ADMIN') {
    console.warn(
      '[AUTH] forbidden: sub=%s role=%s target=%s url=%s',
      payload.sub,
      payload.role,
      targetUserId,
      req.url,
    )
    return errorResponse('Forbidden', 403)
  }
  return payload
}
