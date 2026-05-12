# 需求：支付成功后改用轮询状态方案

## 📋 需求背景

**当前方案问题**：
- 用户支付成功后，Stripe 跳转到 Admin 的 `/checkout/success` 页面
- 用户会短暂看到后台管理系统的页面（体验不好）
- 需要通过 Deep Link 再跳回 App（多一次跳转）

**新方案目标**：
- 用户在 App 内的 WebView 完成支付
- 支付成功后 WebView 自动关闭
- App 轮询后端 API 查询支付状态
- 后端确认成功后，App 在原生界面显示「支付成功」

---

## 🎯 实现方案

### 流程图

```
用户在 App 点「升级会员」
  ↓
App 调用: POST /api/checkout/create-session
  ↓
后端返回: { sessionId, url }
  ↓
App 打开 WebView 加载 Stripe 支付页面
  ↓
App 监听 WebView URL 变化
  ↓
【用户完成支付】
  ↓
Stripe 重定向到: /checkout/success?session_id=xxx
  ↓
App 检测到 URL 包含 "/checkout/success"
  ↓
App 关闭 WebView
  ↓
App 开始轮询: GET /api/checkout/status?session_id=xxx
  ↓
后端返回: { status: "complete", subscription: {...} }
  ↓
App 显示支付成功页面（原生 UI）
```

---

## 🛠️ 需要开发的功能

### 后端（chefchina-admin）

#### 1. 新增 API：查询支付状态
**路径**: `GET /api/checkout/status`

**请求参数**:
```typescript
{
  session_id: string  // Stripe Checkout Session ID
}
```

**响应格式**:
```typescript
// 支付成功
{
  success: true,
  data: {
    status: "complete",  // complete | pending | failed
    subscription: {
      planType: "PREMIUM",
      status: "ACTIVE",
      currentPeriodEnd: "2026-06-11T07:55:00.000Z"
    }
  }
}

// 支付处理中
{
  success: true,
  data: {
    status: "pending"
  }
}

// 支付失败
{
  success: false,
  error: "Payment failed"
}
```

**实现逻辑**:
1. 接收 `session_id` 参数
2. 调用 Stripe API 查询 Session 状态
3. 如果 Session.payment_status === "paid"：
   - 查询数据库 `subscriptions` 表
   - 返回订阅信息
4. 否则返回 pending 或 failed

---

#### 2. 简化 `/checkout/success` 页面
**路径**: `GET /checkout/success`

**用途**: 仅作为 Stripe 跳转的占位页面，不做 Deep Link 跳转

**页面内容**:
```html
✅ 支付成功！
请返回 App 查看订单
（或者 5 秒后自动关闭窗口）
```

**可选功能**:
- 3-5 秒后自动执行 `window.close()`（让 WebView 自动关闭）
- 如果是桌面浏览器，显示「请返回 App」

---

### 前端（chefchina-app）

#### 3. WebView URL 监听
**文件**: `src/screens/Checkout/StripeWebView.tsx`（或类似位置）

**逻辑**:
```typescript
<WebView
  source={{ uri: stripeUrl }}
  onNavigationStateChange={(navState) => {
    // 检测 URL 变化
    if (navState.url.includes('/checkout/success')) {
      // 提取 session_id
      const sessionId = extractSessionId(navState.url);
      
      // 关闭 WebView
      closeWebView();
      
      // 开始轮询
      startPolling(sessionId);
    }
  }}
/>
```

---

#### 4. 轮询支付状态
**文件**: `src/api/payment.ts` 或 `src/hooks/usePaymentStatus.ts`

**逻辑**:
```typescript
async function pollPaymentStatus(sessionId: string) {
  const maxAttempts = 30;  // 最多轮询 30 次
  const interval = 2000;   // 每 2 秒一次
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${API_BASE}/api/checkout/status?session_id=${sessionId}`
    );
    const data = await response.json();
    
    if (data.data.status === 'complete') {
      // 支付成功
      return data.data.subscription;
    }
    
    if (data.data.status === 'failed') {
      // 支付失败
      throw new Error('Payment failed');
    }
    
    // 等待 2 秒后继续轮询
    await sleep(2000);
  }
  
  throw new Error('Payment verification timeout');
}
```

---

#### 5. 显示支付结果
**文件**: `src/screens/Checkout/PaymentResult.tsx`

**逻辑**:
```typescript
// 轮询过程中显示 loading
<View>
  <ActivityIndicator />
  <Text>正在确认支付...</Text>
</View>

// 成功
<View>
  <Text>✅ 支付成功！</Text>
  <Text>会员已激活</Text>
  <Button title="返回首页" onPress={goHome} />
</View>

// 失败
<View>
  <Text>❌ 支付失败</Text>
  <Text>{errorMessage}</Text>
  <Button title="重试" onPress={retry} />
</View>
```

---

## 🔄 与现有代码的关系

### 保留（不改动）
- ✅ `POST /api/checkout/create-session` — 创建支付会话
- ✅ `POST /api/webhook/stripe` — Webhook 更新订阅状态
- ✅ `POSTGRES_PRISMA_URL` 配置（刚修复的连接池）

### 新增
- ✅ `GET /api/checkout/status` — 查询支付状态（后端）
- ✅ WebView URL 监听逻辑（App）
- ✅ 轮询 hook：`usePaymentStatus` 或 `pollPaymentStatus` 函数（App）

### 修改
- ✅ `GET /checkout/success` 页面 — 简化为静态提示，不做 Deep Link

---

## 📝 分工建议

### PM 验收标准
1. 用户在 App 内完成支付后，不会跳出 App
2. WebView 自动关闭，显示「正在确认支付...」
3. 2-5 秒内显示支付结果（成功/失败）
4. 支付成功后，用户资料显示「Premium」标识

### Dev1（后端研发）
- 新增 `GET /api/checkout/status` API
- 简化 `/checkout/success` 页面

### Dev2（App 研发）
- WebView URL 监听
- 轮询逻辑实现
- 支付结果页面 UI

### QA 测试用例
1. 支付成功：轮询返回 complete，显示成功页面
2. 支付失败：轮询返回 failed，显示失败页面
3. 轮询超时：30 次后仍 pending，显示超时提示
4. 网络断开：轮询报错，显示网络错误

---

## ⚠️ 注意事项

### 1. Webhook 仍然是主要更新方式
- 轮询只是给用户即时反馈
- 真正的订阅状态更新仍然由 Webhook 完成
- 如果 Webhook 失败，后续可以补偿（定时任务/手动触发）

### 2. 轮询性能优化
- 最多轮询 30 次（60 秒）
- 间隔 2 秒（不要太频繁）
- 后端可以缓存 Stripe 查询结果（避免频繁调用 Stripe API）

### 3. 边界情况
- 用户关闭 WebView（支付未完成）：不轮询
- 用户杀掉 App：下次打开时检查订阅状态
- Stripe Webhook 延迟：轮询会等待，直到数据库更新

---

## 🎯 预期效果

**用户视角**:
```
打开支付页面（WebView）
  ↓ 输入卡号
点击「支付」
  ↓ [WebView 自动关闭]
看到 App 原生页面：「正在确认支付...」⏳
  ↓ 2-5 秒后
显示：「✅ 支付成功，会员已激活」
```

**不会再看到 Admin 后台的任何页面** ✅

---

**优先级**: P1（用户体验优化）  
**预估工作量**: M（后端 0.5 天 + App 1 天）  
**依赖**: 无（独立功能）
