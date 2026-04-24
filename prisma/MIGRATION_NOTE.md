# Pending migrations

After pulling the latest schema changes run:

```bash
npx prisma migrate dev --name add_notifications_and_sharelog
npx prisma generate
```

This creates the following new database objects:

- `notifications` table + `NotificationType` enum
- `share_logs` table
- `users.expoPushToken` column (nullable)

After `prisma generate`, the newly generated types for `Notification` / `ShareLog` will be available from `@/generated/prisma` (or wherever your prisma output lives).

---

## Sprint 1 · FEAT-20260421-02 邮箱+密码登录 & 注册（2026-04-21）

After pulling the latest schema changes run:

```bash
npx prisma migrate dev --name add_user_password_and_lockout
npx prisma generate
```

新增到 `users` 表的字段（都可空，兼容现有数据）：

- `passwordHash: String?` — bcrypt cost 12 哈希后的密码；旧用户在未设置密码前走 FEAT-02b 的找回密码流程重置（本轮未实现）
- `loginAttempts: Int @default(0)` — 登录失败计数，成功或过锁定期后清零
- `lockedUntil: DateTime?` — 账号锁定到期时间；连续 5 次错误锁定 15 分钟

**生产数据迁移补充**：

- 迁移本身不会破坏现有 User 记录（新字段全部可空或有默认值）
- 现有只通过邮箱登录的老账号，`passwordHash` 仍为 NULL，`/api/auth/login` 会拒绝登录
- FEAT-02b 完成找回密码后，老账号可走"重置密码"给自己补上 `passwordHash`
- 在此之前如需给老账号救急，可在 DB 直接 `UPDATE users SET password_hash = NULL` → 走注册路径重新创建或人工补哈希

`src/app/api/users/route.ts` 的 `POST /api/users`（upsert）保持原样不处理密码，仍用于 admin 后台或其他非认证流程；真实注册走 `/api/auth/register`。
