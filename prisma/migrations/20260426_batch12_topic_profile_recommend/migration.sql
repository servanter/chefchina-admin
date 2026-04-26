-- Migration: Batch 12 - Topic, Profile, Recommend
-- REQ-12.3: 话题标签系统
-- REQ-12.4: 用户主页个性化
-- REQ-12.7: 首页个性化推荐流
-- REQ-12.9: 用户等级与权益体系

-- 1. User 表新增字段
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cover" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "specialties" TEXT[] DEFAULT '{}';
ALTER TABLE "users" RENAME COLUMN "xp" TO "exp";
ALTER TABLE "users" ALTER COLUMN "level" SET DEFAULT 1;
-- Note: bio 字段已存在，无需添加

-- 2. 话题表
CREATE TABLE IF NOT EXISTS "topics" (
  "id" TEXT PRIMARY KEY,
  "nameEn" TEXT NOT NULL,
  "nameZh" TEXT NOT NULL,
  "descEn" TEXT,
  "descZh" TEXT,
  "icon" TEXT,
  "coverImage" TEXT,
  "isHot" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. 菜谱-话题关联表
CREATE TABLE IF NOT EXISTS "recipe_topics" (
  "recipeId" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("recipeId", "topicId"),
  CONSTRAINT "recipe_topics_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE,
  CONSTRAINT "recipe_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "recipe_topics_topicId_idx" ON "recipe_topics"("topicId");

-- 4. 浏览历史表
CREATE TABLE IF NOT EXISTS "browse_history" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "browse_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "browse_history_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "recipeId")
);

CREATE INDEX IF NOT EXISTS "browse_history_userId_createdAt_idx" ON "browse_history"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "browse_history_recipeId_idx" ON "browse_history"("recipeId");

-- 5. 经验值规则表
CREATE TABLE IF NOT EXISTS "exp_rules" (
  "id" TEXT PRIMARY KEY,
  "action" TEXT NOT NULL UNIQUE,
  "exp" INTEGER NOT NULL,
  "dailyLimit" INTEGER,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. 等级配置表
CREATE TABLE IF NOT EXISTS "level_configs" (
  "level" INTEGER PRIMARY KEY,
  "expRequired" INTEGER NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameZh" TEXT NOT NULL,
  "benefits" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 初始化经验值规则
INSERT INTO "exp_rules" ("id", "action", "exp", "dailyLimit", "description") VALUES
  ('exp_rule_1', 'post_recipe', 50, 3, 'Publish a recipe'),
  ('exp_rule_2', 'get_like', 5, NULL, 'Recipe receives a like'),
  ('exp_rule_3', 'get_favorite', 10, NULL, 'Recipe receives a favorite'),
  ('exp_rule_4', 'daily_login', 10, 1, 'Daily login bonus'),
  ('exp_rule_5', 'post_comment', 3, 10, 'Post a comment')
ON CONFLICT ("action") DO NOTHING;

-- 初始化等级配置（1-10级）
INSERT INTO "level_configs" ("level", "expRequired", "nameEn", "nameZh", "benefits") VALUES
  (1, 0, 'Beginner Cook', '新手厨师', '{"perks": ["Basic features"]}'),
  (2, 100, 'Home Cook', '家庭厨师', '{"perks": ["Upload up to 5 recipes"]}'),
  (3, 300, 'Skilled Cook', '熟练厨师', '{"perks": ["Upload up to 10 recipes", "Comment priority"]}'),
  (4, 600, 'Advanced Cook', '高级厨师', '{"perks": ["Upload up to 20 recipes", "Featured badge"]}'),
  (5, 1000, 'Expert Chef', '专家大厨', '{"perks": ["Unlimited uploads", "Exclusive topics"]}'),
  (6, 1500, 'Master Chef', '大师厨神', '{"perks": ["Recipe verification badge", "Priority support"]}'),
  (7, 2200, 'Celebrity Chef', '名厨', '{"perks": ["Homepage feature", "Revenue share"]}'),
  (8, 3000, 'Culinary Artist', '烹饪艺术家', '{"perks": ["Custom profile theme", "Ad-free"]}'),
  (9, 4000, 'Grand Master', '宗师', '{"perks": ["Verified checkmark", "VIP events"]}'),
  (10, 5500, 'Legendary Chef', '传奇厨神', '{"perks": ["Hall of Fame", "Lifetime benefits"]}')
ON CONFLICT ("level") DO NOTHING;

-- 初始化热门话题
INSERT INTO "topics" ("id", "nameEn", "nameZh", "descEn", "descZh", "icon", "isHot", "sortOrder") VALUES
  ('topic_01', 'Quick & Easy', '快手菜', 'Recipes ready in 30 minutes or less', '30分钟内搞定', '⚡', true, 1),
  ('topic_02', 'Healthy Living', '健康养生', 'Nutritious and balanced meals', '营养均衡的健康餐', '🥗', true, 2),
  ('topic_03', 'Comfort Food', '家常菜', 'Classic homestyle dishes', '经典家常味道', '🍲', true, 3),
  ('topic_04', 'Festive Special', '节日特辑', 'Holiday and celebration recipes', '节日庆典菜谱', '🎉', true, 4),
  ('topic_05', 'Vegetarian', '素食主义', 'Plant-based delights', '植物性美食', '🌱', false, 5),
  ('topic_06', 'Spicy Kick', '辣味挑战', 'For those who love heat', '给爱吃辣的你', '🌶️', false, 6),
  ('topic_07', 'Baking & Desserts', '烘焙甜点', 'Sweet treats and breads', '甜品和面包', '🍰', false, 7),
  ('topic_08', 'Street Food', '街头小吃', 'Authentic street eats', '地道街边美食', '🍢', false, 8)
ON CONFLICT ("id") DO NOTHING;
