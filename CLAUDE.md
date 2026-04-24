@AGENTS.md
@.claude/TEAM.md

# ChefChina Admin（出海菜谱后台 + API）

面向海外华人的中华菜谱 App 的**后台管理系统 + 统一 API 服务**。
姊妹项目：`../chefchina-app`（Expo / React Native 移动端）

---

## 技术栈

- **框架**：Next.js 15（App Router）
- **数据库**：PostgreSQL（Prisma ORM，客户端生成在 `src/generated/prisma/`）
- **缓存**：Redis（`src/lib/redis.ts` 的 `withCache` / `invalidateCache`）
- **校验**：zod
- **样式**：Tailwind CSS
- **统一响应**：`src/lib/api.ts` 的 `successResponse` / `errorResponse` / `handleError`
- **API 响应格式**：`{ success: true, data: ... }` 或 `{ success: false, error: ... }`

---

## 目录结构（关键路径）

```
src/
├── app/
│   ├── page.tsx                    # Dashboard 首页
│   ├── layout.tsx                  # 根布局
│   ├── globals.css
│   ├── recipes/                    # 菜谱管理
│   │   ├── page.tsx                #   列表
│   │   ├── new/page.tsx            #   新建
│   │   └── [id]/edit/page.tsx      #   编辑（2026/04 新增）
│   ├── categories/page.tsx         # 分类管理（含编辑）
│   ├── comments/page.tsx           # 评论管理（支持 all=true 看隐藏）
│   ├── users/page.tsx              # 用户管理
│   ├── s/[recipeId]/page.tsx       # 公开分享页（SSR + OG Meta）
│   └── api/
│       ├── recipes/                # CRUD + sort=hot
│       ├── categories/             # CRUD
│       ├── comments/               # CRUD（回复评论会自动创建通知）
│       ├── likes/[recipeId]/       # toggle + 查询状态
│       ├── favorites/[recipeId]/   # toggle + 查询状态
│       ├── favorites/route.ts      # GET ?userId=xxx
│       ├── users/                  # CRUD（含 PATCH /push-token）
│       ├── tags/                   # GET（含 _count.recipes）
│       ├── notifications/          # 通知中心完整 CRUD
│       ├── share/                  # ShareLog + 分享统计
│       └── admin/                  # 管理端专用
├── components/                     # 后台页面 UI 组件
├── lib/
│   ├── prisma.ts
│   ├── redis.ts                    # withCache / invalidateCache（scan 实现）
│   ├── api.ts                      # successResponse / handleError / paginate
│   └── notifications.ts            # 创建通知 + 24h 去重
├── middleware.ts                   # CORS（允许 App 的 http://localhost:8081）
├── generated/prisma/               # Prisma Client 输出位置
└── types/

prisma/
├── schema.prisma                   # 数据模型
└── MIGRATION_NOTE.md               # 待执行的 migration 说明

scripts/
└── seed-users-comments.mjs         # 种子脚本：8 用户 + 53 条评论
```

---

## 数据模型（`prisma/schema.prisma`）

现有：`User`、`Category`、`Recipe`、`RecipeStep`、`Ingredient`、`Tag`、`RecipeTag`、`Comment`、`Like`、`Favorite`

**2026/04 新增（待执行 migration）**：
- `User.expoPushToken: String?`
- `Notification` 模型（+ `NotificationType` 枚举：COMMENT_REPLY / RECIPE_LIKED / RECIPE_FAVORITED / SUBMISSION_APPROVED / SYSTEM）
- `ShareLog` 模型（含 `channel` 字段）

**注意事项**：
- Category id 格式为 `cat_01 ... cat_06`
- Recipe id 格式为 `rec_01 ... rec_25`
- User id 格式为 `user_01 ... user_08`
- 所有双语字段：`xxxEn` / `xxxZh`

---

## 数据种子

`scripts/seed-users-comments.mjs`：插入 8 个测试用户（含中英文名）+ 53 条评论覆盖 24 道菜谱，评论含真实评分 1-5⭐。运行：
```bash
node scripts/seed-users-comments.mjs
```
脚本是幂等的，重复运行会跳过已存在的数据。

---

## CORS 配置

`src/middleware.ts` 允许以下 origin：
- `http://localhost:8081`（Expo web）
- `http://localhost:19006`（Expo 旧版）
- `exp://localhost:8081`（Expo Go）

**如果要改 App 的请求来源**，必须同步修改 `ALLOWED_ORIGINS`。

---

## 本次会话的重大改动（2026/04）

### Admin 后台 Bug 修复（9 项）
1. ✅ **菜谱编辑页 404** — 新建 `app/recipes/[id]/edit/page.tsx`（react-hook-form + useFieldArray）
2. ✅ **评论删不掉** — 外键约束，先删子回复再删父评论
3. ✅ **评论管理看不到隐藏评论** — API 新增 `all=true` 参数
4. ✅ **Redis 缓存失效无效**（glob `*` 通配符不工作）— `invalidateCache` 改用 `scan`
5. ✅ **Dashboard 评论数恒为 0** — `const totalComments` 改 `let` 并累加
6. ✅ **/api/users 缺 GET** — 补充列表接口（分页+搜索）
7. ✅ **/api/users/[id] 缺 DELETE** — 补充删除方法 + `role` 字段支持
8. ✅ **分类管理没有编辑功能** — 每行新增编辑按钮 + Modal 支持 PATCH
9. ✅ **菜谱列表「全部状态」筛选错** — 客户端二次过滤"只看草稿"

### API 新增（配合 App 需求）
- **GET /api/favorites**（`?userId=`）— App 收藏列表
- **GET /api/likes/[recipeId]**、**GET /api/favorites/[recipeId]** — 查询当前用户的交互状态
- **GET /api/tags** — 标签列表
- **GET /api/recipes?sort=hot** — 按 viewCount 排序
- **PATCH /api/users/[id]** 返回体加 `_count`（修复编辑资料后 favorites_count 清零 bug）
- **通知系统**：`GET/POST /api/notifications`、`PATCH/DELETE /api/notifications/[id]`、`POST /api/notifications/read-all`、`PATCH /api/users/[id]/push-token`
- **分享系统**：`POST/GET /api/share`
- **分享 SSR 页**：`/s/[recipeId]`（Next.js Metadata API 生成 OG / Twitter 卡）

### 通知自动触发（已集成）
- 评论回复 → 通知被回复者（`COMMENT_REPLY`）
- 点赞 → 通知菜谱作者（`RECIPE_LIKED`，24h 内按 fromUserId 去重）
- 收藏 → 通知菜谱作者（`RECIPE_FAVORITED`，24h 内按 fromUserId 去重）
- 自我交互（作者给自己）已正确过滤

### Recipe API 响应补全
- 列表 + 详情都加了 `avgRating` / `ratingsCount`（从 Comment 表聚合）

---

## ⚠️ 上线前必须处理（QA 验收未通过）

### 🔴 阻断级（必修）

1. **通知 + push-token API 全部无身份认证**（安全漏洞）
   - 受影响：`notifications/route.ts`（POST）、`notifications/[id]/route.ts`、`notifications/read-all/route.ts`、`users/[id]/push-token/route.ts`
   - 当前任何人知道 userId 就能读/删/改别人的通知，或劫持别人的 expoPushToken
   - 修复方向：引入 session/token 校验中间件，`where: { userId: authUserId }` 强制绑定

2. **24h 通知去重维度过粗**
   - 当前只按 `fromUserId`，不包含 `recipeId`
   - 导致：A 给 B 的 5 个菜谱点赞，B 只收到第 1 条通知
   - 修复：`likes/[recipeId]/route.ts` 和 `favorites/[recipeId]/route.ts` 的 `hasRecentNotification` 加 `recipeId` 条件

3. **分享 SSR 页不过滤 `isPublished`**
   - `app/s/[recipeId]/page.tsx` 未发布的草稿可被直接访问
   - 修复：`where: { id, isPublished: true }`，否则 `notFound()`

### 🟡 一般级（建议修）

4. 通知 title/body 硬编码英文，不随用户 `locale` 动态生成
5. `POST /api/notifications` 应标为 server-only（或加 internal secret）
6. `ShareLog` 无外键约束，菜谱被删后产生孤儿数据
7. `CommentSchema.parentId` 应加 `nullable()` 以兼容前端传 null
8. 通知 PATCH 对已读通知重复 UPDATE（浪费写入）

---

## Migration 待执行

```bash
npx prisma migrate dev --name add_notifications_and_sharelog
npx prisma generate
```

执行后：
- 新表：`notifications`、`share_logs`
- 字段：`users.expoPushToken`
- 代码中的 `(prisma as any).notification` 和 `(prisma as any).shareLog` 可逐步移除（不移除功能也正常）

详见 `prisma/MIGRATION_NOTE.md`。

---

## 开发 / 运行

```bash
npm run dev              # 启动 Next.js（默认 http://localhost:3000）
npx prisma studio        # 可视化 DB
npx prisma migrate dev   # 执行新 migration
```

---

## 常见坑

- **修改 schema 后忘记 `prisma generate`** → Prisma Client 类型不更新
- **缓存未失效**：写入后必须 `invalidateCache(['recipes:*'])`，之前用的是 `redis.del(pattern)` 不支持通配符，现已改成 scan
- **API 新增字段**必须同步更新 App 端 `src/lib/api.ts` 的 `BackendXxx` 类型
- **种子脚本的 ORM import**：`node scripts/seed-users-comments.mjs` 里使用 `import from '../src/generated/prisma/index.js'`，不要改成 `@prisma/client`
