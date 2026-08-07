# DeepSeek 响应优化

**版本：** v1.2
**开始日期：** 2026-08-05
**最近更新：** 2026-08-07
**目标：** 在不改变占星计算、积分扣除或支付流程的前提下，提高 Astro Chat 的最终回答可靠性，并确认 AI 质量是否影响付费转化。

> **阅读说明：** 前两部分是决策和观察口径；后面的「执行流程」用于每次上线后照着检查，避免凭感觉判断。

---

## 一、已确认的事实

### 1.1 近期订单变化

以数据库中状态为 `paid` 的订单为准：

| 时段 | 日均注册 | 日均 AI 使用用户 | 日均 AI 交易 | 日均已支付订单 |
|---|---:|---:|---:|---:|
| 2026-07-26 至 2026-08-01 | 316 | 236 | 467 | 3.86 |
| 2026-08-02 至 2026-08-04 | 278 | 200 | 370 | 1.00 |

流量和 AI 使用量有下降，但付费订单下降更明显。因此先重点检查「AI 回答体验 -> 购买」这一段；不能仅凭某一封投诉邮件断言 DeepSeek 升级就是唯一原因。

### 1.2 Worker 日志发现

2026-07-31 之后的 Astro Chat Worker 日志显示：

- DeepSeek 出现过多次空回答或失败；已记录的典型错误是 `finish_reason=length`，即模型产生了思考内容但没有产生可展示的正文。
- 2026-08-05 的质量优先改动把第二次请求也设成 `thinking: enabled`。这保住了推理模式，但在首个思考请求已耗尽或空回复时，会让用户再等待一轮相同的高耗时请求。
- 已观察到 DeepSeek 思考模式完整回答通常在约 29 秒左右完成；无思考回答明显更快。Kie 兜底本身较快，但只有在主路径失败后才会开始。
- 页面目前会在后端拿到完整回答后再把文本分段返回；因此用户看到第一段文字之前，仍会先经历供应商的完整生成等待。

这不是「用户完全收不到回复」的唯一原因，但确实会让前两次免费试用得到较浅回答的风险明显增加。

---

## 二、本次改动

### 2.1 v1.2：普通对话优先首字速度，付费报告保留深度路径

普通聊天的实际顺序改为：

```text
DeepSeek V4 Flash（thinking disabled，首字 18 秒上限，2200 tokens，真实流式输出）
  -> Kie / Gemini 2.5 Flash（仅在首字前失败时兜底，1600 tokens）
  -> 全部失败：返回 503，且不扣积分
```

城市对比付费报告使用相同顺序，但保留更高的额度：

```text
DeepSeek V4 Flash（thinking enabled，45 秒上限，5200 tokens）
  -> DeepSeek V4 Flash（thinking disabled，20 秒恢复，2400 tokens）
  -> Kie / Gemini 2.5 Flash（45 秒恢复，2400 tokens）
```

设计原则：

- **普通聊天先让用户看见回答：** 不再先等待隐藏的 thinking 内容；DeepSeek 产生第一段可见正文后立即流式发送到页面。
- **付费报告保留深度：** 50 credits 的城市对比报告继续走 thinking -> 非 thinking 恢复 -> Kie 兜底，不与普通聊天混用。
- **独立供应商最终兜底：** 恢复请求仍失败时才使用 Kie；Kie 不取代 DeepSeek 的主路径。
- **不为可用性扣错费：** 只有拿到非空最终回答后，才结算一次积分。

### 2.2 本次新增日志口径

每个 `traceId` 会记录以下关键字段：

| 事件 | 需要查看的字段 | 用途 |
|---|---|---|
| `provider_started` | `provider`、`thinking`、`maxTokens`、`timeoutMs` | 确认实际走了哪条模型路径 |
| `provider_completed` | `finishReason`、`firstTextLatencyMs`、`latencyMs`、`textCharacters`、`reasoningCharacters` | 判断回答是否真正有正文、等待在哪里发生 |
| `provider_empty` / `provider_failed` | `thinking`、`timeoutMs`、`error` | 区分空回答、超时、认证或供应商错误 |
| `provider_retry_scheduled` | `nextThinking`、`nextMaxTokens` | 确认 DeepSeek 已切到非思考恢复而非重复思考 |
| `fallback_started` / `fallback_recovered` | `fallbackMaxTokens`、`provider`、`model` | 衡量 Kie 的实际兜底比例 |
| `credits_settled` / `request_completed` | 相同 `traceId`、`provider`、`model` | 核验回答成功后才扣一次积分 |

### 2.3 新增 D1 可观察性事件表

新增 `ai_chat_events_astrocarto`，把现有 Worker 结构化日志写成可查询事件。它**不保存**问题正文、回答正文、出生资料或邮箱；完整聊天仍由 R2 会话历史保存。

记录字段包括：`traceId`、匿名用户 ID、事件、模型、是否 thinking、是否 Kie 兜底、首字耗时、供应商耗时、token 数、结果长度、扣积分与错误类别。

写入使用 Worker `waitUntil` 旁路执行；写库失败只会产生 warning，绝不会中断 AI 回复、积分扣除或支付。

生产建表文件：`scripts/d1-ai-chat-observability.sql`

```bash
npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-ai-chat-observability.sql
```

### 2.4 本次明确不改的内容

- 不修改 `getSystemPrompt` 或占星提示词。
- 不修改地图计算、行星线数据、积分单价、扣积分时机。
- 不修改 Creem / PayPal 的支付请求、Webhook 或发积分逻辑。
- 不把 Kie 设为主模型；DeepSeek 仍是第一顺位。

### 2.5 必需生产配置

| 变量 | 作用 | 建议 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 主模型密钥 | 必填 |
| `DEEPSEEK_ASTRO_CHAT_MODEL` 或 `ASTRO_CHAT_MODEL` | 主模型名 | 使用当前确认可用的 `deepseek-v4-flash` |
| `KIE_AI_API_KEY` | DeepSeek 两次失败后的兜底 | 必填 |
| `KIE_AI_FALLBACK_ENABLED` | 是否启用 Kie 兜底 | 不填或 `true`；不要设为 `false` |
| `KIE_AI_FALLBACK_MODEL` | Kie 兜底模型 | `gemini-2.5-flash` |

密钥只配置在 Cloudflare Worker 的「变量和密钥」中，不提交到 Git，也不写进 `wrangler.jsonc`。

---

## 三、观察周期和通过条件

### 第一段：技术稳定性，72 小时

上线后连续观察 **3 天**。每天检查 Worker 日志和 D1 的 `paid` 订单。

必须满足：

| 指标 | 通过标准 | 数据来源 |
|---|---|---|
| 最终 AI 请求失败 | `< 1%` | `request_failed_no_charge` / `request_received`，按同一批完整日志核对 |
| DeepSeek 普通首答 | 主路径 | `provider_started` 应为 `thinking: disabled`、`delivery: streaming` |
| Kie 兜底成功 | 有则记录，不要求为 0 | `fallback_started`、`fallback_recovered` |
| 思考首答耗尽正文 | 持续下降 | `provider_empty` / `provider_failed` 中的 `finish_reason=length` |
| 首字等待 | P95 不高于 5 秒 | D1 `first_text_ready.first_text_latency_ms` |
| 用户被扣积分却无回答 | `0` | `credits_settled` 必须发生在 `request_completed` 前后同一 trace 链路中 |
| 支付成功和积分到账 | `0` 个新增异常 | `ORDER_PAID`、`CREDITS_ISSUED`、D1 订单状态 |

若 72 小时内出现任一真实用户的「扣积分但没有回答」或「支付成功未到账」，先暂停后续产品功能，上线修复或回滚本次 AI 改动。

### 第二段：转化判断，14 个完整自然日

完成技术稳定性后，再累计观察到 **14 个完整自然日**。对比上线前连续 14 天及上线后 14 天，并按相同星期几比较。

重点看：

| 漏斗节点 | 当前已有口径 | 判断方式 |
|---|---|---|
| 地图生成 | `home_inline_map_generated` | 是否有明显流量/工具入口波动 |
| AI 对话打开 | `ai_dialog_opened` | 地图用户是否愿意进入对话 |
| AI 提问 | `ai_question_sent` | 用户是否愿意开始试用 |
| AI 回答 | `ai_response_received` + Worker `request_completed` | 回答率、等待时间、模型路径 |
| 积分不足 / 定价弹窗 | `ai_insufficient_credits`、`pricing_modal_opened` | 回答后是否产生购买意图 |
| 购买点击 | `pricing_buy_clicked`、`payment_initiated` | 付费页到支付的流失 |
| 实际成交 | D1 `orders_astrocarto.status = 'paid'`、`ORDER_PAID` | 唯一订单口径 |

观察目标：

- AI 回答后的定价弹窗率、购买点击率不低于上线前同类流量。
- `paid` 订单的日均数不再维持当前约 1 单的水平，且 AI 使用用户到付费订单的转化不继续恶化。
- 普通聊天的 DeepSeek 主路径应为 `thinking: disabled` 且 `delivery: streaming`；Kie 只处理首字前的少量异常，不应长期成为主路径。

> 不使用「创建订单数」判断转化，因为当前支付入口会产生未支付订单记录；只用 `paid` 状态和 Creem 的 `ORDER_PAID` 判断成交。

---

## 四、每日检查流程

### 每天一次，前 3 天

1. 在 D1 查询 `ai_chat_events_astrocarto`，按 `trace_id` 汇总 `request_completed`、`request_failed_no_charge`、`fallback_started`、`fallback_recovered`。
2. 检查普通聊天 `provider_started`：正常首答应为 `thinking: disabled`、`delivery: streaming`。
3. 查看 `first_text_ready.first_text_latency_ms` 与 `provider_completed.provider_latency_ms`，区分首字慢和完整回答慢。
4. 检查 `credits_settled` 后是否都有同一 trace 的 `request_completed`。
5. 搜索 `[CREEM][ORDER_PAID]` 与 `[CREEM][CREDITS_ISSUED]`，确认没有新增支付到账异常。
6. 用一张真实测试星图走一遍：登录 -> 提问 -> 收到回答 -> 查看积分减少 10 -> 打开定价页 -> 不实际付款。

### 第 4 天和第 7 天

1. 从 D1 / 后台导出 `paid` 订单，按日期统计。
2. 在 GA4 查看上述漏斗事件，不用单个事件的绝对数下结论。
3. 查看投诉、退款和「回答太浅 / 没回答 / 等待太久」的邮件数量。
4. 将结果记入本文件的「观察记录」。

### 第 14 天：做一次决策

| 结果 | 下一步 |
|---|---|
| 回答稳定，订单和 AI 到购买转化回升或稳定 | 保持本模型顺序，进入下一项产品转化工作 |
| 回答稳定，但购买仍低 | 分析定价弹窗、套餐表达、支付跳转，而不是继续换模型 |
| Kie 兜底比例高 | 排查 DeepSeek API / 模型行为与 Key；不要增加第二次思考重试。可评估首答上限或主模型，但先保留一次短的无思考恢复 |
| 用户仍说回答浅 | 优先补充可验证的占星数据输入（相位、宫位、行运、Chiron 等），再评估提示词；只换模型不能补回未提供的数据 |
| 最终失败或扣费异常 | 优先修复可靠性，暂停新的付费功能上线 |

---

## 五、发布前人工核验

### 正常路径

1. 使用已登录测试账号生成地图。
2. 发送一个普通问题，确认获得完整回答，积分只扣一次。
3. 发送一个追问，确认追问建议失败不会影响普通对话。
4. 使用城市对比完整报告，确认 50 credits 只在生成完整报告后扣除。

### 兜底路径

1. 在本地临时使用无效的 `DEEPSEEK_API_KEY`，不要改生产密钥。
2. 确认普通对话的 DeepSeek 首字前失败后，日志出现 `fallback_started`，且 Kie 使用 `gemini-2.5-flash`。
3. 确认 Kie 成功后前端能收到回答，且仅扣一次积分。
4. 临时关闭 Kie 或使用无效本地 Kie Key，确认最终返回「暂时不可用」并且不扣积分。
5. 测试结束后恢复本地配置；生产环境不以错误 Key 测试。

### 每日 D1 查询入口

生产环境已完成建表后，可先用下面查询检查最近 20 条事件。`datetime(..., '+8 hours')` 显示北京时间：

```sql
SELECT
  datetime(created_at, 'unixepoch', '+8 hours') AS time_beijing,
  trace_id,
  event,
  provider,
  model,
  thinking,
  delivery,
  first_text_latency_ms,
  provider_latency_ms,
  error_kind
FROM ai_chat_events_astrocarto
ORDER BY id DESC
LIMIT 20;
```

---

## 六、观察记录

| 日期 | AI 完成/失败 | Thinking enabled / Kie 兜底 | P95 响应耗时 | Paid 订单 | 投诉 / 退款 | 结论 |
|---|---|---|---:|---:|---:|---|
| 2026-08-05 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 本次版本上线 |
| 2026-08-07 | 本地普通对话成功；DeepSeek 首字 447ms、完整 6585ms，无兜底 | `thinking: disabled` / 无 Kie | 447ms 首字 | 待填写 | 待填写 | v1.2：普通聊天已改为真实流式；生产 D1 事件表已建成并确认可写入。全量构建仍受仓库既有缺失页面路由阻断，类型检查通过。 |
| 2026-08-08 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 72 小时检查 |
| 2026-08-12 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 第 7 天检查 |
| 2026-08-19 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 第 14 天决策 |
