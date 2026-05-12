import { NextResponse } from 'next/server'

/**
 * 统一 error code 常量（BUG-20260422-04）。后端返回 code，前端按 code 走 i18n。
 * 新增 code 不破坏向后兼容：老客户端仍按 message 显示英文。
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  RATE_LIMITED: 'RATE_LIMITED',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * errorResponse(message, status, code?, extras?)
 * - message: 人类可读（默认英文）
 * - status:  HTTP 状态码
 * - code:    机器可读 code（可选，前端用于 i18n 映射）
 * - extras:  其它字段，例如 { retryAfter: 30 }（BUG-03 限流）
 */
export function errorResponse(
  message: string,
  status = 400,
  code?: string,
  extras?: Record<string, unknown>,
) {
  const body: Record<string, unknown> = { success: false, error: message }
  if (code) body.code = code
  if (extras) Object.assign(body, extras)
  return NextResponse.json(body, { status })
}

export function handleError(error: unknown) {
  // Handle Zod validation errors (works with both v3 and v4)
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    const zodErr = error as { issues?: Array<{ message: string }>; errors?: Array<{ message: string }> }
    const issues = zodErr.issues ?? zodErr.errors ?? []
    return errorResponse(
      issues.map((e) => e.message).join(', '),
      422,
      ERROR_CODES.VALIDATION_FAILED,
    )
  }
  if (error instanceof Error) {
    // BUG-20260422-09 / BUG-20260422-05：生产环境不要透传原始 error.message。
    // Prisma 错误（例如 "Unique constraint failed on the fields: (email)"）
    // 可能泄漏内部 schema 细节。只在 dev 下把原文返回，便于本地调试。
    console.error('[API handleError]', error)
    const isDev = process.env.NODE_ENV !== 'production'
    return errorResponse(
      isDev ? error.message : 'Internal server error',
      500,
      ERROR_CODES.INTERNAL_ERROR,
    )
  }
  return errorResponse('Internal server error', 500, ERROR_CODES.INTERNAL_ERROR)
}

export function paginate(page = 1, pageSize = 20) {
  const take = Math.min(pageSize, 100)
  const skip = (Math.max(page, 1) - 1) * take
  return { take, skip }
}
