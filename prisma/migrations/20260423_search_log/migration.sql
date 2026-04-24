-- 2026-04-23 · SearchLog（SQL 版搜索日志）
--
-- 人工执行：
--   psql "$DATABASE_URL" -f prisma/migrations/20260423_search_log/migration.sql
-- 或：
--   npx prisma migrate resolve --applied 20260423_search_log
--   npx prisma migrate deploy

BEGIN;

CREATE TABLE IF NOT EXISTS "search_logs" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "keyword"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "search_logs_keyword_createdAt_idx"
  ON "search_logs" ("keyword", "createdAt");

COMMIT;
