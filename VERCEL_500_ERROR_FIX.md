# API 500 错误诊断与修复指南

## 问题

- `/api/home/init` → 500 错误
- `/api/search/trending` → 500 错误

## 可能原因

### 1. 数据库连接问题
**症状**: 所有 API 都返回 500  
**原因**: Vercel 环境变量中的 `DATABASE_URL` 配置错误或过期  
**修复**:
```bash
# 在 Vercel 项目设置中检查环境变量
DATABASE_URL=postgresql://...
```

### 2. Prisma Client 未生成
**症状**: 部署后 Prisma 查询报错  
**原因**: Vercel 构建时没有生成 Prisma Client  
**修复**: 在 `package.json` 中添加 `postinstall` 脚本
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### 3. 数据库表不存在
**症状**: 特定 API 返回 500（如 SearchTrending）  
**原因**: 数据库迁移未执行，表不存在  
**修复**: 执行数据库迁移
```bash
npx prisma db push
# 或
npx prisma migrate deploy
```

### 4. Notification.readAt 字段问题
**症状**: `/api/home/init` 返回 500  
**原因**: 旧版本数据库使用 `isRead` 字段，新代码使用 `readAt`  
**修复**: 执行迁移脚本
```sql
-- 方案 1：添加 readAt 字段（如果不存在）
ALTER TABLE notifications ADD COLUMN "readAt" TIMESTAMP;

-- 方案 2：从 isRead 迁移数据（如果旧字段存在）
UPDATE notifications
SET "readAt" = "updatedAt"
WHERE "isRead" = true;
```

### 5. SearchTrending 表为空
**症状**: `/api/search/trending` 返回 500  
**原因**: 表存在但为空，导致查询逻辑错误  
**修复**: 添加容错处理或插入初始数据

## 诊断步骤

### 步骤 1：检查 Vercel 部署日志
1. 登录 Vercel Dashboard
2. 进入 chefchina-admin 项目
3. 查看最新部署的 **Build Logs**
4. 搜索关键词：`error`, `Prisma`, `DATABASE_URL`

### 步骤 2：检查 Runtime Logs
1. 在 Vercel Dashboard 中点击 **Logs**
2. 访问 `https://chefchina-app.vercel.app/` 触发错误
3. 查看实时日志输出
4. 找到具体的错误堆栈

### 步骤 3：本地验证
```bash
cd /root/.openclaw/workspace/chefchina/chefchina-admin

# 检查 Prisma Client
npx prisma generate

# 检查数据库连接
npx prisma db pull

# 本地测试 API
pnpm dev
# 访问 http://localhost:3000/api/home/init
```

## 快速修复方案

### 方案 1：添加错误处理（临时方案）
修改 `/api/home/init/route.ts` 和 `/api/search/trending/route.ts`，添加更详细的错误日志：

```typescript
export async function GET(req: NextRequest) {
  try {
    // 原有代码
  } catch (error) {
    console.error('[API Error]', error);
    // 返回详细错误信息（仅开发环境）
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: false,
        error: error.message,
        stack: error.stack,
      }, { status: 500 });
    }
    return handleError(error);
  }
}
```

### 方案 2：使用默认值（容错方案）
修改 `/api/home/init/route.ts`：

```typescript
// Batch 2: 用户相关（如果提供了 userId）
let unreadCount = 0
if (userId) {
  try {
    unreadCount = await prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    })
  } catch (error) {
    console.error('Failed to query notifications:', error);
    unreadCount = 0; // 降级处理
  }
}
```

修改 `/api/search/trending/route.ts`：

```typescript
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await prisma.searchTrending.findMany({
      where: {
        hourWindow: {
          gte: oneDayAgo
        }
      },
      orderBy: [
        { score: 'desc' },
        { searchCount: 'desc' }
      ],
      take: limit,
      distinct: ['keyword']
    });

    // 如果表为空，返回空数组而不是报错
    if (!trending || trending.length === 0) {
      return NextResponse.json(successResponse({
        trending: [],
        updatedAt: new Date().toISOString()
      }));
    }

    // 原有逻辑...
  } catch (error) {
    console.error('[SearchTrending Error]', error);
    // 降级：返回空数组
    return NextResponse.json(successResponse({
      trending: [],
      updatedAt: new Date().toISOString()
    }));
  }
}
```

## 推荐行动

1. **立即**: 检查 Vercel 部署日志和 Runtime Logs
2. **短期**: 应用方案 2（容错处理），部署修复
3. **长期**: 确认数据库迁移已执行，补全缺失的表和字段
