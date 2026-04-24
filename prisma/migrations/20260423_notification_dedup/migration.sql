-- 2026-04-23 · Notification 四元组去重
--
-- 目的：
--   1. 给 notifications 增加 actorId / resourceId 两个结构化字段
--   2. 建 (actorId, userId, type, resourceId) 的 UNIQUE INDEX，
--      让数据库层兜底 24h 内不会重复入库（应用层 hasRecentNotification 仍负责时间窗过滤）
--
-- ⚠️ 本文件只是手写 migration，上线前需要人工执行：
--      psql "$DATABASE_URL" -f prisma/migrations/20260423_notification_dedup/migration.sql
--   或：
--      npx prisma migrate resolve --applied 20260423_notification_dedup
--      npx prisma migrate deploy
--
-- 建议先备份：
--      pg_dump ... > backup_before_notif_dedup.sql

BEGIN;

-- ─── Step 1. 新增列（可空，兼容旧数据）───────────────────────────────────────
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "actorId"    TEXT,
  ADD COLUMN IF NOT EXISTS "resourceId" TEXT;

-- ─── Step 2. 尽量从现有 payload 中回填 actorId / resourceId ─────────────────
-- 旧代码写 payload = { fromUserId, recipeId?, commentId? ... }
UPDATE "notifications"
SET "actorId" = payload ->> 'fromUserId'
WHERE "actorId" IS NULL AND payload ? 'fromUserId';

UPDATE "notifications"
SET "resourceId" = payload ->> 'recipeId'
WHERE "resourceId" IS NULL
  AND type IN ('RECIPE_LIKED', 'RECIPE_FAVORITED')
  AND payload ? 'recipeId';

UPDATE "notifications"
SET "resourceId" = payload ->> 'commentId'
WHERE "resourceId" IS NULL
  AND type = 'COMMENT_REPLY'
  AND payload ? 'commentId';

-- ─── Step 3. 清理重复：同 (actorId, userId, type, resourceId) 只保留最新一条 ─
-- 必须在加 UNIQUE 之前跑，否则 CREATE UNIQUE INDEX 会报 "could not create unique index"。
-- NULL 值在 UNIQUE 中视为不相等（Postgres 默认语义），所以 actorId/resourceId 为空的老行
-- 不会被这次去重删掉。
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "actorId", "userId", "type", "resourceId"
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn
  FROM "notifications"
  WHERE "actorId" IS NOT NULL
    AND "resourceId" IS NOT NULL
)
DELETE FROM "notifications"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ─── Step 4. 建索引 ──────────────────────────────────────────────────────────
-- BUG-007 修复：去掉普通 4 列 index —— 下面的 UNIQUE INDEX 本身是 B-tree 索引，
-- 足以服务 (actorId, userId, type, resourceId) 的等值 / 前缀查询；保留两条索引
-- 只会增加写入成本。

-- UNIQUE INDEX —— NULL 依然被 Postgres 视为 distinct（默认 NULLS DISTINCT），
-- 所以只对"完整四元组"强去重；应用层 `hasRecentNotification` 仍然是 24h 过滤。
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_actor_user_type_resource_key"
  ON "notifications" ("actorId", "userId", "type", "resourceId");

COMMIT;
