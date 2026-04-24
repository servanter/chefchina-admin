import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// ─────────────────────────────────────────
// 认证辅助（Sprint-1 FEAT-02 最小实现）
// ─────────────────────────────────────────
//
// 本模块当前只负责签发 / 校验访问 token，供 `/api/auth/register`、
// `/api/auth/login` 使用。FEAT-05 会在此基础上接入 refresh token、
// Bearer middleware、session 存储等完整认证链路。
//
// 密钥优先读 `AUTH_JWT_SECRET`，兜底使用开发用固定字符串（仅开发环境）。
// 生产上线前，用户**必须**在 `.env` 中设置独立的 `AUTH_JWT_SECRET`。

const DEV_FALLBACK_SECRET = 'chefchina-dev-only-secret-change-me'

// BUG-20260422-01 修复：生产环境缺失 AUTH_JWT_SECRET 必须立即阻止启动，
// 否则会用 git 里公开的硬编码字符串签发 JWT，形成严重伪造身份漏洞。
// dev 兜底仅在 NODE_ENV !== 'production' 时生效。
const envSecret = process.env.AUTH_JWT_SECRET
if (!envSecret && process.env.NODE_ENV === 'production') {
  throw new Error(
    'AUTH_JWT_SECRET must be set in production (refusing to use dev fallback secret)',
  )
}

export const AUTH_JWT_SECRET: string = envSecret ?? DEV_FALLBACK_SECRET

export const AUTH_TOKEN_TTL = '7d'

export const LOGIN_MAX_ATTEMPTS = 5
export const LOGIN_LOCK_MINUTES = 15

// BUG-20260422-07 修复：NULL 密码 / 不存在用户分支也要跑一次 bcrypt.compare
// 匀化响应时延，避免通过时序侧信道枚举"存在但未设密码"的老账号。
// 模块加载时一次性生成（cost=12，约 100ms），后续 compare 复用。
export const DUMMY_PASSWORD_HASH: string = bcrypt.hashSync(
  '__chefchina_never_matches_dummy__',
  12,
)

export interface AuthTokenPayload {
  sub: string        // userId
  email: string
  role: 'USER' | 'ADMIN'
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, AUTH_JWT_SECRET, {
    expiresIn: AUTH_TOKEN_TTL,
    issuer: 'chefchina-admin',
  })
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_JWT_SECRET, {
      issuer: 'chefchina-admin',
    })
    if (typeof decoded === 'string') return null
    const { sub, email, role } = decoded as jwt.JwtPayload & Partial<AuthTokenPayload>
    if (!sub || !email || !role) return null
    return { sub, email, role }
  } catch {
    return null
  }
}
