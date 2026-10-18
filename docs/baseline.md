# GEO 方案 A — T0 基线记录（模板）

**请在方案 A 部署到生产后填写。** 用于 T+7 / T+30 对比，勿覆盖历史 Excel/AI 原始回答。

## 元信息

| 字段 | 值 |
|------|-----|
| 基线日期 (T0) | YYYY-MM-DD |
| Git commit / 部署版本 | |
| 记录人 | |

## 搜索与索引（GSC）

| 指标 | T0 值 | 备注 |
|------|-------|------|
| 首页 Last crawl | | GSC URL Inspection |
| where-to-live 索引状态 | | |
| relocation-calculator 索引状态 | | |
| 近 28 天首页展示 / 点击 | | 可选 |

## 性能（Lighthouse 移动，生产 URL）

| 页面 | Performance | LCP | CLS | 截图文件 |
|------|-------------|-----|-----|----------|
| `/` | | | | |
| `/astrocartography-where-to-live/` | | | | |
| `/relocation-chart-calculator/` | | | | |

## 页面截图存档

存放建议：`docs/baseline-screenshots/T0/`（勿提交含真实出生数据的截图）

- [ ] 首页 Hero + product-access
- [ ] Where to Live 双路径 + workflow demo 图
- [ ] Relocation 表单 + 结果区按钮
- [ ] 地图 Compare Cities UI（**仅用 Demo 数据**）

## AI 推荐基线（独立会话，勿在提示词中预填 .org）

参考报告 Q01–Q12；每题每平台 ≥3 次（扩展期）。

| 平台 | 模型/地区/联网 | 精确推荐 astrocarto.org | 混淆 astrocarto.net | 原始回答存档 |
|------|----------------|-------------------------|---------------------|--------------|
| ChatGPT | | | | 文件/链接 |
| Claude | | | | |
| Gemini | | | | |

## 产品指标（GA4，可选）

| 事件/指标 | T0 7 日均值 |
|-----------|-------------|
| map_generated | |
| 注册 / 付费 | |

---

**T+7 复查：** crawl checklist（`docs/geo-crawl-checklist.md`）+ 索引是否稳定。  
**T+30 复查：** 同上 AI 问题集 + GSC 对比。
