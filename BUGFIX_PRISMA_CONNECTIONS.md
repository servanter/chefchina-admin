# Supabase 连接数过多问题 Bug 清单

## 🔴 P0 阻断级：数据库连接数耗尽

### 现象
Supabase 报错：**连接数过多（too many connections）**

### 根本原因分析

#### 1. ❌ **未使用 Supabase 的连接池 URL**
**当前配置**（`.env`）：
```bash
DATABASE_URL="postgres://...@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
POSTGRES_PRISMA_URL="postgres://...@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
DIRECT_URL="postgres://...@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

**问题**：
- `DATABASE_URL` 用的是 `:5432`（直连端口），没有经过 PgBouncer
- `POSTGRES_PRISMA_URL` 才是正确的连接池 URL（`:6543` + `pgbouncer=true`）
- 但 `prisma.ts` 里只用了 `DATABASE_URL`，没有用 `POSTGRES_PRISMA_URL`

#### 2. ❌ **Prisma 配置错误**
**当前配置**（`src/lib/prisma.ts`）：
```typescript
datasources: {
  db: {
    url: process.env.DATABASE_URL + '?connection_limit=50&pool_timeout=30',
  },
}
```

**问题**：
- 手动拼接了 `connection_limit=50`，但这是直连到 `:5432`
- Supabase **免费版最大连接数只有 60**，你设置 50 会直接耗尽
- 应该用 `:6543` 的 PgBouncer 连接池，而不是直连

#### 3. ❌ **Serverless 环境下的连接泄漏**
**Vercel/Next.js Serverless 特点**：
- 每个请求都可能启动一个新的 Lambda 实例
- 每个实例都会创建 Prisma Client 实例
- 如果实例不复用，会创建大量数据库连接

**当前问题**：
- `prisma.ts` 虽然用了全局单例模式，但 Serverless 环境下每个 Lambda 实例还是会创建新连接
- 没有正确使用 Supabase 的连接池，导致连接数爆炸

---

## 🛠️ **修复方案**

### 修复 1：使用正确的 Supabase 连接池 URL

**修改 `src/lib/prisma.ts`**：
```typescript
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        // ✅ 使用 POSTGRES_PRISMA_URL（Supabase 的 PgBouncer 连接池）
        url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL,
      },
    },
  })
```

**为什么这样改**：
- `POSTGRES_PRISMA_URL` 是 Supabase 的 `:6543` 连接池端口，自动管理连接
- PgBouncer 会复用连接，不会创建过多物理连接
- 不需要手动设置 `connection_limit`，PgBouncer 会自动处理

---

### 修复 2：`prisma/schema.prisma` 添加连接池模式

**修改 `prisma/schema.prisma`**：
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")  // ✅ 改用连接池 URL
  directUrl = env("DIRECT_URL")           // ✅ migration 用直连 URL
}
```

**为什么需要两个 URL**：
- `url`：日常查询用连接池（`:6543` PgBouncer）
- `directUrl`：数据库迁移用直连（`:5432`），因为 PgBouncer 不支持某些 DDL 操作

---

### 修复 3：确保环境变量正确

**检查 `.env` 和部署平台**：
```bash
# ✅ 正确配置
POSTGRES_PRISMA_URL="postgres://postgres.xxx:password@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://postgres.xxx:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# ❌ 不要再用这个做主连接
DATABASE_URL="..."  # 可以删除或留作备用
```

**关键参数**：
- `:6543` — PgBouncer 端口（连接池）
- `pgbouncer=true` — 启用事务模式
- `connection_limit=1` — Serverless 环境下每个实例只需 1 个连接

---

### 修复 4：优化 Prisma Client 生命周期

**保持现有的单例模式**（`src/lib/prisma.ts` 已经做了）：
```typescript
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ ... })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**这样可以**：
- 开发环境：全局复用同一个实例
- 生产环境：每个 Lambda 实例一个 Prisma Client，但 PgBouncer 会管理连接

---

## 📝 **任务清单**

### 1. 修改代码
- [ ] 修改 `src/lib/prisma.ts`：使用 `POSTGRES_PRISMA_URL`
- [ ] 修改 `prisma/schema.prisma`：`url` 改为 `POSTGRES_PRISMA_URL`
- [ ] 删除手动的 `connection_limit=50` 拼接

### 2. 更新环境变量
- [ ] 本地 `.env`：确保 `POSTGRES_PRISMA_URL` 正确
- [ ] Vercel/部署平台：更新环境变量
- [ ] 添加 `connection_limit=1` 到 `POSTGRES_PRISMA_URL`

### 3. 重新生成 Prisma Client
```bash
npx prisma generate
```

### 4. 测试验证
- [ ] 重启开发服务器，检查连接数
- [ ] 去 Supabase Dashboard 查看 `Database → Connection pooling`
- [ ] 压测：并发 50 个请求，观察连接数变化

---

## 🧑 待老板确认

1. **当前 Supabase 计划是什么？**（Free/Pro/Team）
   - Free: 最大 60 连接，建议用 PgBouncer
   - Pro: 最大 200 连接

2. **Vercel 部署在哪个 region？** 
   - 如果是 `ap-southeast-1`（新加坡），和 Supabase 同区，延迟低

---

## 📚 参考资料

- [Supabase + Prisma 连接池最佳实践](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Vercel Serverless 数据库连接优化](https://vercel.com/docs/storage/vercel-postgres/using-an-orm#)

---

**优先级**: P0 阻断级  
**预估工作量**: S（< 30 分钟）  
**涉及改动**: `src/lib/prisma.ts`、`prisma/schema.prisma`、环境变量
