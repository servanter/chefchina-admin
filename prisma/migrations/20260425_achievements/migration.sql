-- 成就徽章与等级体系 (Batch 10)

-- 1. Badge 表
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "descZh" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "badges_key_key" ON "badges"("key");

-- 2. UserBadge 表
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");
CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");

ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey"
    FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. User 扩展字段
ALTER TABLE "users" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;

-- 4. 预置 12 个徽章
INSERT INTO "badges" ("id", "key", "nameEn", "nameZh", "descEn", "descZh", "icon", "category", "threshold", "sortOrder") VALUES
    ('badge_01', 'first_recipe',      'First Recipe',       '初次下厨',     'Publish your first recipe',                  '发布你的第一个菜谱',              '🍳', 'cooking',   1,   1),
    ('badge_02', 'recipe_master',     'Recipe Master',      '菜谱达人',     'Publish 10 recipes',                         '发布10个菜谱',                   '👨‍🍳', 'cooking',   10,  2),
    ('badge_03', 'recipe_legend',     'Recipe Legend',       '菜谱传奇',     'Publish 50 recipes',                         '发布50个菜谱',                   '🌟', 'cooking',   50,  3),
    ('badge_04', 'first_like',        'First Like',         '初获赞赏',     'Receive your first like',                    '获得第一个赞',                   '❤️', 'social',    1,   4),
    ('badge_05', 'popular',           'Popular Chef',       '人气大厨',     'Receive 100 likes',                          '获得100个赞',                    '🔥', 'social',    100, 5),
    ('badge_06', 'viral',             'Viral Sensation',    '爆款制造机',   'Receive 1000 likes',                         '获得1000个赞',                   '💥', 'social',    1000,6),
    ('badge_07', 'social_butterfly',  'Social Butterfly',   '社交达人',     'Follow 10 people',                           '关注10个人',                     '🦋', 'social',    10,  7),
    ('badge_08', 'commenter',         'Comment Star',       '评论之星',     'Post 50 comments',                           '发表50条评论',                   '💬', 'social',    50,  8),
    ('badge_09', 'explorer',          'Recipe Explorer',    '菜谱探索者',   'Browse 100 recipes',                         '浏览100个菜谱',                  '🗺️', 'milestone', 100, 9),
    ('badge_10', 'early_bird',        'Early Bird',         '先行者',       'Among the first 100 registered users',       '注册前100名用户',                '🐦', 'milestone', 100, 10),
    ('badge_11', 'night_owl',         'Night Owl',          '夜猫子',       'Publish a recipe between midnight and 5am',  '在凌晨发布菜谱',                 '🦉', 'milestone', 1,   11),
    ('badge_12', 'five_star',         'Five Star Chef',     '五星大厨',     'Achieve a perfect 5.0 average rating',       '菜谱平均评分达到5.0',            '⭐', 'milestone', 1,   12);
