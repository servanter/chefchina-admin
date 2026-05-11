# Stripe 支付问题修复说明

## 🔴 问题 1：Webhook 报错 `Invalid Date`

### 根本原因
Stripe 的 `current_period_start` 和 `current_period_end` 返回的是 **Unix 时间戳（秒）**，但直接 `new Date()` 需要的是 **毫秒**。

### 修复位置
`src/lib/subscription.ts` 的两个函数：
- `handleCheckoutComplete()`
- `handleSubscriptionUpdate()`

### 修复方式
```typescript
// ❌ 错误写法（原代码）
currentPeriodStart: new Date(subscription.current_period_start * 1000)

// ✅ 正确写法（修复后）
const currentPeriodStart = subscription.current_period_start
  ? new Date(subscription.current_period_start * 1000)
  : new Date();
```

**关键改动**：
1. 先提取时间戳并验证 truthy
2. 乘以 1000 转换为毫秒
3. 如果没有值，提供默认值 `new Date()`

---

## 🔴 问题 2：支付成功后跳转到 localhost

### 根本原因
`src/app/api/checkout/create-session/route.ts` 中的 `baseUrl` 只用了 `NEXTAUTH_URL`，如果未配置或为 localhost，就会跳转错误。

### 修复位置
`src/app/api/checkout/create-session/route.ts`

### 修复方式
```typescript
// ❌ 原代码
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// ✅ 修复后（优先使用 PUBLIC_URL）
const baseUrl = process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
```

---

## ⚙️ 环境变量配置（必须！）

### 1. 添加到 `.env` 文件

```bash
# 🌐 生产环境域名（必须配置！）
PUBLIC_URL="https://你的域名.com"
NEXTAUTH_URL="https://你的域名.com"

# Stripe 配置
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_PREMIUM_MONTHLY="price_..."
STRIPE_PRICE_PREMIUM_YEARLY="price_..."
STRIPE_PRICE_PREMIUM_FIRST_MONTH="price_..."
```

### 2. Vercel/部署平台配置
如果用 Vercel 部署，在 **Environment Variables** 里也要加：
- `PUBLIC_URL` = `https://你的域名.com`
- `NEXTAUTH_URL` = `https://你的域名.com`

---

## ✅ 验证修复

### 1. 重启开发服务器
```bash
npm run dev
```

### 2. 测试支付流程
1. 创建 Checkout Session
2. 完成支付
3. 检查：
   - ✅ 跳转到正确域名的 `/checkout/success`
   - ✅ Webhook 没有 `Invalid Date` 错误
   - ✅ 数据库 `subscriptions` 表的时间字段正确

### 3. 查看 Webhook 日志
```bash
# Stripe CLI 本地测试
stripe listen --forward-to localhost:3000/api/webhook/stripe

# 或查看 Stripe Dashboard → Developers → Webhooks → Logs
```

---

## 📝 相关文件清单

| 文件 | 改动 |
|------|------|
| `src/lib/subscription.ts` | ✅ 修复 Unix 时间戳转换（2处） |
| `src/app/api/checkout/create-session/route.ts` | ✅ 添加 PUBLIC_URL 优先级 |
| `.env.example` | ✅ 新增 PUBLIC_URL 配置示例 |
| `STRIPE_FIX.md`（本文件） | ✅ 修复说明文档 |

---

## 🚨 注意事项

1. **生产环境必须配置 PUBLIC_URL**，否则仍会跳转到 localhost
2. **Webhook Secret** 要和 Stripe Dashboard 里配置的一致
3. **Price IDs** 要用真实的 Stripe Price ID（`price_xxx`）
4. 本地测试用 Stripe CLI：`stripe listen --forward-to localhost:3000/api/webhook/stripe`

---

## 🎉 完成

修复后，支付成功会：
1. 正确跳转到生产域名 `/checkout/success?session_id=xxx`
2. Webhook 正确更新数据库订阅记录
3. 不再出现 `Invalid Date` 错误

有问题随时问我！
