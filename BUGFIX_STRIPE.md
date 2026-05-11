# Stripe 支付问题 Bug 清单

## 🔴 P0 阻断级（2个）

### Bug 1: Webhook 报错 Invalid Date
- **路径**: `/api/webhook/stripe`
- **现象**: 
  ```
  Invalid `prisma.subscription.update()` invocation:
  Invalid value for argument `currentPeriodStart`: Provided Date object is invalid.
  ```
- **根因**: Stripe 返回 Unix 时间戳（秒），但直接 `new Date()` 需要毫秒
- **影响**: 支付成功后无法更新订阅状态到数据库
- **受影响文件**:
  - `src/lib/subscription.ts` 的 `handleCheckoutComplete()` 函数（约第 210 行）
  - `src/lib/subscription.ts` 的 `handleSubscriptionUpdate()` 函数（约第 270 行）

**修复方案**:
```typescript
// ❌ 错误（直接转换可能返回 Invalid Date）
currentPeriodStart: new Date(subscription.current_period_start * 1000)

// ✅ 正确（先验证再转换，提供默认值）
const currentPeriodStart = subscription.current_period_start
  ? new Date(subscription.current_period_start * 1000)
  : new Date();
const currentPeriodEnd = subscription.current_period_end
  ? new Date(subscription.current_period_end * 1000)
  : new Date();
const trialStart = subscription.trial_start
  ? new Date(subscription.trial_start * 1000)
  : null;
const trialEnd = subscription.trial_end
  ? new Date(subscription.trial_end * 1000)
  : null;

await prisma.subscription.update({
  where: { userId },
  data: {
    stripeSubscriptionId: subscriptionId,
    planType: 'PREMIUM',
    status: subscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
    currentPeriodStart,
    currentPeriodEnd,
    trialStart,
    trialEnd,
  },
});
```

---

### Bug 2: 支付成功后跳转到 localhost
- **路径**: `/api/checkout/create-session`
- **现象**: 支付成功后跳转到 `http://localhost:3000/checkout/success?session_id=xxx`
- **根因**: `baseUrl` 只用了 `NEXTAUTH_URL`，未配置时回退到 localhost
- **影响**: 生产环境用户支付成功后跳转到错误地址
- **受影响文件**: `src/app/api/checkout/create-session/route.ts`（约第 97 行）

**修复方案**:
```typescript
// ❌ 错误
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// ✅ 正确（优先使用 PUBLIC_URL）
const baseUrl = process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
```

**配套环境变量**（需要在 `.env` 和部署平台配置）:
```bash
PUBLIC_URL="https://你的域名.com"
NEXTAUTH_URL="https://你的域名.com"
```

---

## 📝 任务要求

### 1. 修复代码
- ✅ 修复 `src/lib/subscription.ts` 的两处时间戳转换（Bug 1）
- ✅ 修复 `src/app/api/checkout/create-session/route.ts` 的 baseUrl 逻辑（Bug 2）

### 2. 补充配置文件
- ✅ 更新 `.env.example`，添加 `PUBLIC_URL` 说明
- ✅ 创建 `STRIPE_FIX.md` 修复说明文档

### 3. 提交代码
- 创建新分支 `fix/stripe-webhook-and-redirect`
- 提交信息：`fix: Stripe webhook Invalid Date & localhost redirect`
- 推送并创建 PR

### 4. 验证清单
- [ ] 重启开发服务器后不再报错
- [ ] 配置 `PUBLIC_URL` 后支付成功跳转到正确域名
- [ ] 数据库 `subscriptions` 表的时间字段正常
- [ ] Stripe Webhook 日志无错误

---

## 🧑 待老板确认

1. **生产环境域名是什么？** 需要配置到 `PUBLIC_URL` 和 `NEXTAUTH_URL`
2. **是否需要在 Stripe Dashboard 重新配置 Webhook URL？**

---

## 📂 参考文件

- Stripe 集成代码：`src/lib/stripe.ts`、`src/lib/subscription.ts`
- API 路由：`src/app/api/checkout/create-session/route.ts`、`src/app/api/webhook/stripe/route.ts`
- 现有环境变量：`.env`

---

**优先级**: P0 阻断级  
**预估工作量**: S（< 1 小时）  
**涉及范围**: 后台 API + 环境配置
