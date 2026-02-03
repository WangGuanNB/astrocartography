# PayPal 支付集成完成总结

## ✅ 已完成的工作

### 1. 数据库 Schema 更新
- ✅ 在 `orders_astrocarto` 表添加 `pay_type` 字段

### 2. 核心服务模块
- ✅ `src/services/payment-selector.ts` - 支付方式选择器
- ✅ `src/services/paypal.ts` - PayPal API 封装（创建订单、捕获支付、获取 token 等）
- ✅ `src/services/order.ts` - 添加 `handlePayPalOrder` 函数

### 3. API 端点
- ✅ `src/app/api/checkout/route.ts` - 重构为统一支付入口，支持多支付方式
- ✅ `src/app/api/paypal-notify/route.ts` - PayPal webhook 处理器

### 4. 支付成功页面
- ✅ `src/app/[locale]/pay-success/paypal/page.tsx` - PayPal 支付成功页面（含 capture 调用）

## 🔒 向后兼容保证

### 现有 Creem 支付完全不受影响：

1. **默认行为保持不变**
   - 如果前端不传 `payment_method` 参数，系统会检查是否配置了 Creem
   - 如果配置了 Creem，默认使用 Creem（保持现有行为）

2. **Creem API 保持独立**
   - `/api/checkout/creem` 路由保持不变
   - 现有的 Creem 支付流程完全不受影响

3. **数据库兼容**
   - `pay_type` 字段为可选字段
   - 现有订单不受影响

## 📝 需要执行的 SQL

```sql
-- 添加 pay_type 字段到 orders_astrocarto 表
ALTER TABLE orders_astrocarto
ADD COLUMN pay_type VARCHAR(50);

-- 可选：为现有订单设置默认值
UPDATE orders_astrocarto
SET pay_type = 'creem'
WHERE pay_type IS NULL AND status = 'paid';
```

## 🔧 环境变量配置

在 `.env.local` 或 `.env.production` 中添加：

```bash
# PayPal 配置
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
PAYPAL_ENVIRONMENT=sandbox  # 或 live（生产环境）

# 现有的 Creem 配置保持不变
CREEM_API_KEY=xxx
NEXT_PUBLIC_CREEM_PRODUCT_ID=xxx
```

## 🎯 使用方式

### 方式 1：前端指定支付方式（推荐）

```typescript
const response = await fetch("/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    credits: 100,
    currency: "usd",
    amount: 999,
    interval: "one-time",
    product_id: "standard",
    product_name: "Standard Plan",
    valid_months: 1,
    locale: "en",
    payment_method: "paypal",  // 指定使用 PayPal
  }),
});

const data = await response.json();

// PayPal 返回
if (data.payment_method === "paypal") {
  window.location.href = data.approval_url;
}

// Creem 返回（保持原有逻辑）
if (data.payment_method === "creem") {
  // 调用 /api/checkout/creem
}
```

### 方式 2：自动选择（向后兼容）

```typescript
// 不传 payment_method，系统会自动选择
// 如果配置了 Creem，优先使用 Creem（保持现有行为）
const response = await fetch("/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    credits: 100,
    currency: "usd",
    amount: 999,
    interval: "one-time",
    product_id: "standard",
    product_name: "Standard Plan",
    valid_months: 1,
    locale: "en",
    // 不传 payment_method
  }),
});
```

## 🔔 PayPal Webhook 配置

1. 登录 [PayPal Developer Dashboard](https://developer.paypal.com/)
2. 进入 **Apps & Credentials** → 选择你的应用
3. 点击 **Webhooks** 标签
4. 添加 Webhook URL: `https://yourdomain.com/api/paypal-notify`
5. 订阅事件：
   - ✅ `PAYMENT.CAPTURE.COMPLETED`
   - ✅ `PAYMENT.SALE.COMPLETED`

## 🧪 测试步骤

### 1. 执行 SQL
在 Supabase 执行上面的 SQL 语句

### 2. 配置环境变量
添加 PayPal 的环境变量到 `.env.local`

### 3. 重启服务
```bash
pnpm dev
```

### 4. 测试 PayPal 支付
- 前端调用 `/api/checkout`，传入 `payment_method: "paypal"`
- 跳转到 PayPal 支付页面
- 完成支付后，会跳转回 `/pay-success/paypal`
- 系统会自动 capture 订单
- PayPal 发送 webhook
- 订单状态更新为 `paid`

### 5. 验证 Creem 支付不受影响
- 前端调用 `/api/checkout`，不传 `payment_method` 或传 `payment_method: "creem"`
- 确认 Creem 支付流程正常工作

## ⚠️ 重要注意事项

1. **PayPal Capture 是关键**
   - PayPal 支付成功后，必须调用 `capturePayPalOrder`
   - 只有 capture 成功后，PayPal 才会发送 webhook
   - 已在 `/pay-success/paypal/page.tsx` 中实现

2. **Webhook 延迟**
   - PayPal Sandbox 环境的 webhook 可能有 1-2 分钟延迟
   - 生产环境通常更快

3. **金额单位**
   - PayPal 使用美元（dollars）
   - 代码中会自动将分转换为美元：`(amount / 100).toFixed(2)`

4. **向后兼容**
   - 现有的 Creem 支付完全不受影响
   - 如果不配置 PayPal 环境变量，系统会继续使用 Creem

## 📊 支付方式优先级

当不指定 `payment_method` 时：

1. 检查是否配置了 Creem → 使用 Creem（向后兼容）
2. 如果没有 Creem，按以下顺序自动选择：
   - Stripe（如果配置了 `STRIPE_PRIVATE_KEY`）
   - PayPal（如果配置了 `PAYPAL_CLIENT_ID` 和 `PAYPAL_CLIENT_SECRET`）
   - Creem（如果配置了 `CREEM_API_KEY` 或 `NEXT_PUBLIC_CREEM_PRODUCT_ID`）

## 🎉 完成

PayPal 支付已成功集成到项目中，同时完全保持了现有 Creem 支付的兼容性！
