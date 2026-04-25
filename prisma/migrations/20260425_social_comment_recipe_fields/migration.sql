-- 2026-04-25 · Social / Comment images / Recipe nutrition fields
--
-- 补齐 schema.prisma 中已声明、但仓库里缺失的迁移。
-- 目标：避免云端数据库仍为旧结构时，Prisma 在查询/写入时因缺列/缺表报错。
--
-- 人工执行：
--   psql "$DATABASE_URL" -f prisma/migrations/20260425_social_comment_recipe_fields/migration.sql
-- 或在支持 prisma migrate deploy 的环境中纳入发布流程。

BEGIN;

-- 1) recipes：营养字段（REQ-4.4）
ALTER TABLE "recipes"
  ADD COLUMN IF NOT EXISTS "protein" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "fat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "carbs" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "fiber" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sodium" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sugar" DOUBLE PRECISION;

-- 2) comments：图片数组 + 楼中楼 parentId
ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- 给旧数据兜底，避免 Prisma 侧 required list 字段遇到 NULL
UPDATE "comments"
SET "images" = ARRAY[]::TEXT[]
WHERE "images" IS NULL;

ALTER TABLE "comments"
  ALTER COLUMN "images" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "images" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comments_parentId_fkey'
  ) THEN
    ALTER TABLE "comments"
      ADD CONSTRAINT "comments_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "comments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "comments_parentId_idx" ON "comments"("parentId");

-- 3) follows：用户关注关系
CREATE TABLE IF NOT EXISTS "follows" (
  "followerId"  TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follows_pkey" PRIMARY KEY ("followerId", "followingId"),
  CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "follows_followerId_followingId_key"
  ON "follows" ("followerId", "followingId");
CREATE INDEX IF NOT EXISTS "follows_followerId_idx" ON "follows" ("followerId");
CREATE INDEX IF NOT EXISTS "follows_followingId_idx" ON "follows" ("followingId");

COMMIT;
