-- ChefChina 数据库初始化 SQL
-- 生成时间: 2026-04-21

-- 枚举类型
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- 用户表
CREATE TABLE "users" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email"     TEXT NOT NULL,
  "name"      TEXT,
  "avatar"    TEXT,
  "bio"       TEXT,
  "role"      "UserRole" NOT NULL DEFAULT 'USER',
  "locale"    TEXT NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- 分类表
CREATE TABLE "categories" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nameEn"    TEXT NOT NULL,
  "nameZh"    TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "image"     TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- 菜谱主表
CREATE TABLE "recipes" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "titleEn"       TEXT NOT NULL,
  "titleZh"       TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionZh" TEXT,
  "coverImage"    TEXT,
  "difficulty"    "Difficulty" NOT NULL DEFAULT 'EASY',
  "cookTimeMin"   INTEGER NOT NULL DEFAULT 30,
  "servings"      INTEGER NOT NULL DEFAULT 2,
  "calories"      INTEGER,
  "isPublished"   BOOLEAN NOT NULL DEFAULT false,
  "viewCount"     INTEGER NOT NULL DEFAULT 0,
  "authorId"      TEXT NOT NULL,
  "categoryId"    TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- 菜谱步骤
CREATE TABLE "recipe_steps" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "recipeId"    TEXT NOT NULL,
  "stepNumber"  INTEGER NOT NULL,
  "titleEn"     TEXT,
  "titleZh"     TEXT,
  "contentEn"   TEXT NOT NULL,
  "contentZh"   TEXT NOT NULL,
  "image"       TEXT,
  "durationMin" INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);

-- 食材
CREATE TABLE "ingredients" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "recipeId"   TEXT NOT NULL,
  "nameEn"     TEXT NOT NULL,
  "nameZh"     TEXT NOT NULL,
  "amount"     TEXT NOT NULL,
  "unit"       TEXT,
  "isOptional" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- 标签
CREATE TABLE "tags" (
  "id"     TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nameEn" TEXT NOT NULL,
  "nameZh" TEXT NOT NULL,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tags_nameEn_key" ON "tags"("nameEn");

-- 菜谱标签关联
CREATE TABLE "recipe_tags" (
  "recipeId" TEXT NOT NULL,
  "tagId"    TEXT NOT NULL,
  CONSTRAINT "recipe_tags_pkey" PRIMARY KEY ("recipeId", "tagId")
);

-- 评论
CREATE TABLE "comments" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "content"   TEXT NOT NULL,
  "rating"    INTEGER,
  "recipeId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "parentId"  TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- 点赞
CREATE TABLE "likes" (
  "userId"    TEXT NOT NULL,
  "recipeId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "likes_pkey" PRIMARY KEY ("userId", "recipeId")
);

-- 收藏
CREATE TABLE "favorites" (
  "userId"    TEXT NOT NULL,
  "recipeId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorites_pkey" PRIMARY KEY ("userId", "recipeId")
);

-- 外键约束
ALTER TABLE "recipes"
  ADD CONSTRAINT "recipes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recipe_steps"
  ADD CONSTRAINT "recipe_steps_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_tags"
  ADD CONSTRAINT "recipe_tags_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "recipe_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "likes"
  ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "likes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "favorites_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 种子数据：分类
INSERT INTO "categories" ("id", "nameEn", "nameZh", "slug", "image", "sortOrder") VALUES
  ('cat_01', 'Sichuan Cuisine',  '川菜', 'sichuan',  'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', 1),
  ('cat_02', 'Cantonese Cuisine','粤菜', 'cantonese', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400', 2),
  ('cat_03', 'Hunan Cuisine',    '湘菜', 'hunan',     'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400', 3),
  ('cat_04', 'Northern Chinese', '北方菜','northern',  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', 4),
  ('cat_05', 'Dim Sum',          '点心', 'dimsum',    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400', 5),
  ('cat_06', 'Noodles & Rice',   '面食', 'noodles',   'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400', 6);

-- 种子数据：标签
INSERT INTO "tags" ("id", "nameEn", "nameZh") VALUES
  ('tag_01', 'Spicy',      '辣'),
  ('tag_02', 'Quick',      '快手'),
  ('tag_03', 'Vegetarian', '素食'),
  ('tag_04', 'Beginner',   '新手'),
  ('tag_05', 'Classic',    '经典'),
  ('tag_06', 'Healthy',    '健康');

-- 种子数据：管理员用户
INSERT INTO "users" ("id", "email", "name", "role") VALUES
  ('usr_admin', 'admin@chefchina.app', 'ChefChina Admin', 'ADMIN');
