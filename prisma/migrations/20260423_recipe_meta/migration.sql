-- 2026-04-23 · Recipe meta fields（需求 15）
--
-- 现状：Recipe 表上以下字段本来就存在：
--   • difficulty    Difficulty @default(EASY)
--   • cookTimeMin   Int        @default(30)   -- 对应前端 cookTime（分钟）
--   • servings      Int        @default(2)
--   • calories      Int?
--   • Difficulty enum (EASY | MEDIUM | HARD)
--
-- 所以此 migration 的主要价值是记录需求 15 的字段契约并提供"可选 null"的放宽，
-- 供老数据（种子之前）的兼容。新需求对 cookTime/difficulty/servings/calories
-- 允许为 NULL（即「未填」），并以 NULL 在 App 详情页上隐藏对应 icon。
--
-- 人工执行：
--   psql "$DATABASE_URL" -f prisma/migrations/20260423_recipe_meta/migration.sql
-- 或：
--   npx prisma migrate resolve --applied 20260423_recipe_meta
--   npx prisma migrate deploy
--
-- 注意：如果 DB 中 cookTimeMin / servings / difficulty 本就 NOT NULL，以下
-- DROP NOT NULL 语句会是幂等的；即使重复执行也安全。

BEGIN;

-- 1) 放开 NOT NULL 约束（允许表单不填 → NULL → App 端不渲染该 icon）
ALTER TABLE "recipes"
  ALTER COLUMN "cookTimeMin" DROP NOT NULL,
  ALTER COLUMN "servings"    DROP NOT NULL,
  ALTER COLUMN "difficulty"  DROP NOT NULL;

-- 2) `calories` 本来就是 Int? nullable；此处仅做幂等声明
ALTER TABLE "recipes"
  ALTER COLUMN "calories" DROP NOT NULL;

-- 3) 清掉 default 值（之前：cookTimeMin=30 / servings=2 / difficulty='EASY'）。
--    新语义下，未填 = NULL 更清晰；已填的旧数据保持原值。
ALTER TABLE "recipes"
  ALTER COLUMN "cookTimeMin" DROP DEFAULT,
  ALTER COLUMN "servings"    DROP DEFAULT,
  ALTER COLUMN "difficulty"  DROP DEFAULT;

COMMIT;

-- ⚠️ 回滚（如需）：
-- BEGIN;
--   UPDATE "recipes" SET "cookTimeMin" = 30   WHERE "cookTimeMin" IS NULL;
--   UPDATE "recipes" SET "servings"    = 2    WHERE "servings"    IS NULL;
--   UPDATE "recipes" SET "difficulty"  = 'EASY' WHERE "difficulty" IS NULL;
--   ALTER TABLE "recipes"
--     ALTER COLUMN "cookTimeMin" SET NOT NULL,
--     ALTER COLUMN "cookTimeMin" SET DEFAULT 30,
--     ALTER COLUMN "servings"    SET NOT NULL,
--     ALTER COLUMN "servings"    SET DEFAULT 2,
--     ALTER COLUMN "difficulty"  SET NOT NULL,
--     ALTER COLUMN "difficulty"  SET DEFAULT 'EASY';
-- COMMIT;
