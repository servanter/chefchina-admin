-- REQ-18.1: 添加 location 和 gender 字段
-- REQ-18.5: 添加性能索引

-- 添加新字段
ALTER TABLE "users" ADD COLUMN "location" TEXT;
ALTER TABLE "users" ADD COLUMN "gender" TEXT;

-- 创建 UserGender 枚举类型
CREATE TYPE "UserGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PRIVATE');

-- 修改 gender 字段类型
ALTER TABLE "users" ALTER COLUMN "gender" TYPE "UserGender" USING ("gender"::text::"UserGender");

-- REQ-18.5: 添加性能索引

-- Recipe 表索引
CREATE INDEX "recipes_authorId_idx" ON "recipes"("authorId");
CREATE INDEX "recipes_categoryId_idx" ON "recipes"("categoryId");
CREATE INDEX "recipes_createdAt_idx" ON "recipes"("createdAt");
CREATE INDEX "recipes_viewCount_idx" ON "recipes"("viewCount");
CREATE INDEX "recipes_isPublished_idx" ON "recipes"("isPublished");
CREATE INDEX "recipes_authorId_createdAt_idx" ON "recipes"("authorId", "createdAt");

-- Comment 表索引
CREATE INDEX "comments_recipeId_createdAt_idx" ON "comments"("recipeId", "createdAt");
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- User 表索引
CREATE INDEX "users_email_idx" ON "users"("email");
