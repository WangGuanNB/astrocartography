# 域名邮箱配置操作手册

## 一、配置概述

使用 Cloudflare Email Routing 接收邮件，Resend 发送邮件，Gmail SMTP 回复邮件。

**所需服务：**
- Cloudflare（域名 DNS 托管）
- Resend（发送邮件）
- Gmail（接收和回复）

---

## 二、Cloudflare Email Routing 配置（接收邮件）

### 2.1 启用 Email Routing

1. Cloudflare Dashboard → 域名 → Email → Email Routing
2. 点击 "添加记录并启用"
3. Cloudflare 自动添加 MX 和 TXT 记录

### 2.2 创建路由规则

1. Email Routing → 路由规则 → 创建地址
2. 配置：
   - 自定义地址：`support`
   - 操作：发送到电子邮件
   - 目标：`yourname@gmail.com`
3. 保存并验证目标邮箱

### 2.3 验证结果

- 路由状态：已启用
- DNS 记录：已配置
- 自定义地址：`support@yourdomain.com` → `yourname@gmail.com`

---

## 三、Resend 配置（发送邮件）

### 3.1 添加域名

1. Resend Dashboard → Domains → Add domain
2. 输入域名，选择区域（North Virginia）
3. 添加域名

### 3.2 配置 DNS 记录

在 Cloudflare DNS 中添加以下记录：

**DKIM 记录（必需）：**
- 类型：TXT
- 名称：`resend._domainkey`
- 内容：从 Resend Dashboard 复制完整值
- TTL：自动

**SPF 记录（更新主域）：**
- 类型：TXT
- 名称：`yourdomain.com`
- 内容：`"v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all"`
- TTL：自动

### 3.3 验证域名

1. Resend Dashboard → Domains → `yourdomain.com`
2. 等待 DNS 验证（5-10 分钟）
3. 所有记录状态显示 "Verified"

### 3.4 获取 API Key

1. Resend Dashboard → API Keys → Create API Key
2. 配置权限和域名
3. 复制 API Key（只显示一次）

---

## 四、代码配置

### 4.1 环境变量

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
```

### 4.2 代码示例

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
  to: "support@yourdomain.com",
  subject: "Subject",
  html: "<p>Email content</p>",
});
```

---

## 五、Gmail SMTP 配置（回复邮件）

### 5.1 添加发送地址

1. Gmail → 设置 → 查看所有设置
2. 账号和导入 → 用这个地址发送邮件
3. 添加其他电子邮件地址

### 5.2 配置信息

- 姓名：你的名字
- 电子邮件地址：`support@yourdomain.com`
- 勾选 "将其视为别名"

### 5.3 SMTP 服务器配置

- SMTP 服务器：`smtp.resend.com`
- 端口：`465`（SSL）或 `587`（TLS）
- 用户名：`resend`
- 密码：`RESEND_API_KEY`（不是邮箱密码）
- 勾选 "使用安全连接（TLS）"

### 5.4 验证和使用

1. 验证邮箱地址（邮件会转发到 Gmail）
2. 写邮件时选择 `support@yourdomain.com` 作为发件人

---

## 六、DNS 记录清单

### 6.1 Cloudflare Email Routing

- MX 记录（3条）：`yourdomain.com` → `route1/2/3.mx.cloudflare.net`
- TXT（SPF）：`yourdomain.com` → `"v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all"`
- TXT（DKIM）：`cf2024-1._domainkey` → Cloudflare 自动生成

### 6.2 Resend

- TXT（DKIM）：`resend._domainkey` → 从 Resend Dashboard 复制

---

## 七、验证测试

### 7.1 测试接收

从外部邮箱发送到 `support@yourdomain.com`，检查 Gmail 是否收到。

### 7.2 测试发送

从网站发送邮件，检查 Resend Dashboard 状态为 "Delivered"。

### 7.3 测试回复

在 Gmail 中使用 `support@yourdomain.com` 发送，检查发件人显示正确。

---

## 八、常见问题

### 8.1 邮件无法接收

- 检查 Cloudflare Email Routing 是否启用
- 检查路由规则和目标邮箱验证
- 检查 MX 记录

### 8.2 邮件无法发送（Bounced）

- 检查 SPF 记录包含 `include:resend.com`
- 检查 `resend._domainkey` DKIM 记录
- 从 Resend 抑制列表中移除地址

### 8.3 Gmail SMTP 无法连接

- 确认密码是 `RESEND_API_KEY`
- 尝试不同端口（465 或 587）
- 确认已勾选安全连接

---

## 九、配置检查清单

- [ ] Cloudflare Email Routing 已启用
- [ ] 路由规则已创建并验证
- [ ] Resend 域名已添加并验证
- [ ] `resend._domainkey` DKIM 记录已添加
- [ ] SPF 记录已更新
- [ ] Resend API Key 已配置
- [ ] Gmail SMTP 已配置并验证
- [ ] 接收、发送、回复功能测试通过

---

## 十、参考链接

- [Cloudflare Email Routing 文档](https://developers.cloudflare.com/email-routing/)
- [Resend 文档](https://resend.com/docs)
- [Resend SMTP 配置](https://resend.com/docs/send-with-smtp)

