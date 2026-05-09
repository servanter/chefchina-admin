# Stripe Configuration Fix

## 问题诊断

此 PR 修复了 `/api/checkout/create-session` 返回错误的问题，并添加了配置验证工具。

## 改进内容

### 1. 新增配置验证端点 `/api/checkout/verify-config`

**用途：** 诊断 Stripe 环境变量配置问题

**使用方法：**
```bash
curl https://your-domain.com/api/checkout/verify-config
```

**返回示例：**
```json
{
  "status": "error",
  "config": {
    "stripe": {
      "secretKey": true,
      "secretKeyPrefix": "sk_test",
      "prices": {
        "monthly": true,
        "monthlyValue": "price_1ABC123",
        "yearly": false,
        "yearlyValue": "not set"
      }
    },
    "nextauth": {
      "url": true,
      "urlValue": "https://your-domain.com"
    }
  },
  "issues": [
    "STRIPE_PRICE_PREMIUM_YEARLY is not set"
  ]
}
```

### 2. 改进 `src/lib/stripe.ts`

#### 环境变量兼容层
支持多种环境变量命名方式，避免配置错误：

| 主变量名 | 兼容的备用变量名 |
|---------|----------------|
| `STRIPE_SECRET_KEY` | `STRIPE_API_KEY`, `STRIPE_KEY` |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_MONTHLY_PRICE_ID` |
| `STRIPE_PRICE_PREMIUM_YEARLY` | `STRIPE_PRICE_ID_YEARLY`, `STRIPE_YEARLY_PRICE_ID` |
| `STRIPE_PRICE_PREMIUM_FIRST_MONTH` | `STRIPE_PRICE_ID_FIRST_MONTH`, `STRIPE_FIRST_MONTH_PRICE_ID` |

#### 启动时配置检查（开发环境）
应用启动时会自动检查并打印配置状态：

```
[Stripe Config] Configuration check:
  Secret Key: ✓ Set (sk_test...)
  Prices:
    PREMIUM_MONTHLY: ✓ Set (price_1ABC123)
    PREMIUM_YEARLY: ⚠ Using default (NOT REAL) (price_premium_yearly)
    PREMIUM_FIRST_MONTH: ✓ Set (price_1XYZ789)

⚠️  WARNING: Some Price IDs are using DEFAULT values!
   These are NOT real Stripe Price IDs.
   Please set the following environment variables:
     - STRIPE_PRICE_PREMIUM_MONTHLY
     - STRIPE_PRICE_PREMIUM_YEARLY
     - STRIPE_PRICE_PREMIUM_FIRST_MONTH
```

#### 新增 `validateStripeConfig()` 函数
可在代码中调用，验证配置是否完整：

```typescript
import { validateStripeConfig } from '@/lib/stripe';

const validation = validateStripeConfig();
if (!validation.valid) {
  console.error('Stripe configuration errors:', validation.errors);
}
```

## 使用指南

### 步骤 1: 访问验证端点

部署后，访问：
```
https://your-vercel-app.vercel.app/api/checkout/verify-config
```

### 步骤 2: 根据返回的 `issues` 修复配置

**常见问题：**

#### ❌ STRIPE_SECRET_KEY 未设置
```bash
# 在 Vercel 中设置
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

#### ❌ Price ID 格式错误
```
STRIPE_PRICE_PREMIUM_MONTHLY has invalid format: price_premium_monthly (should start with price_)
```

**原因：** 使用了默认占位符，而非真实的 Stripe Price ID

**解决方法：**
1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. 创建产品和价格
3. 复制真实的 Price ID（格式：`price_1ABC123...`）
4. 在 Vercel 中设置环境变量

#### ❌ NEXTAUTH_URL 未设置
```bash
# 在 Vercel 中设置
NEXTAUTH_URL=https://your-domain.com
```

### 步骤 3: 重新部署并测试

1. 保存环境变量后，Vercel 会自动重新部署
2. 再次访问 `/api/checkout/verify-config`
3. 确认 `status: "ok"` 且 `issues: []`

## 环境变量清单

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|-------|------|-----|
| `STRIPE_SECRET_KEY` | Stripe API 密钥 | `sk_test_51ABC...` |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | 月付 Price ID | `price_1ABC123...` |
| `STRIPE_PRICE_PREMIUM_YEARLY` | 年付 Price ID | `price_1DEF456...` |
| `STRIPE_PRICE_PREMIUM_FIRST_MONTH` | 首月特惠 Price ID | `price_1GHI789...` |
| `NEXTAUTH_URL` | 应用域名 | `https://your-app.com` |

### 如何获取 Stripe Price ID

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. 点击 **Products** → **Add product**
3. 创建产品（如 "Premium Monthly"）
4. 添加价格（如 $4.99/month）
5. 保存后，点击价格，查看 **API ID**（以 `price_` 开头）
6. 复制此 ID 到环境变量

## 技术细节

### API 版本
使用 Stripe API 版本：`2026-04-22.dahlia`

如果遇到 API 版本兼容问题，可以在 `src/lib/stripe.ts` 中修改：
```typescript
apiVersion: '2024-11-20.acacia', // 或其他稳定版本
```

### 错误日志改进
所有 Stripe 相关错误现在都包含详细的上下文信息：
- 用户 ID
- 计划类型
- 具体的错误消息
- 堆栈跟踪（开发环境）

## 测试

### 本地测试
```bash
# 1. 设置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入真实的 Stripe 配置

# 2. 启动开发服务器
npm run dev

# 3. 访问验证端点
curl http://localhost:3000/api/checkout/verify-config

# 4. 测试 checkout
curl -X POST http://localhost:3000/api/checkout/create-session \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","planType":"monthly"}'
```

### 生产环境测试
1. 确保在 Vercel 中设置了**生产环境**的 Stripe Key（`sk_live_...`）
2. 使用真实的 Price ID（非测试模式）
3. 测试完整的支付流程

## 相关文档

- [Stripe Checkout 文档](https://stripe.com/docs/payments/checkout)
- [Stripe API 参考](https://stripe.com/docs/api)
- [Next.js 环境变量](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

## 故障排查

### 问题：仍然返回 "Failed to create checkout session"

**可能原因：**
1. Price ID 不存在或已删除
2. Stripe Key 权限不足
3. 网络问题（无法连接 Stripe API）

**解决方法：**
1. 在 Stripe Dashboard 中确认 Price ID 存在且激活
2. 检查 API Key 权限（应该是 "Secret Key"，不是 "Publishable Key"）
3. 查看服务器日志，搜索 `[Subscription]` 或 `[Checkout API]`

### 问题：验证端点显示 "ok" 但仍然失败

可能是运行时错误（不是配置问题）：
1. 检查数据库连接
2. 查看完整的错误日志
3. 确认用户在数据库中存在

## 下一步

- [ ] 测试所有三种订阅计划（monthly, yearly, first-month）
- [ ] 配置 Webhook 处理订阅更新
- [ ] 添加支付成功/失败的邮件通知
- [ ] 实现订阅取消和退款逻辑
