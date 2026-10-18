# Astrocarto.org GEO 方案 A 审计记录

更新：2026-10-18（方案 A 代码交付完成）  
范围：仅方案 A；不执行方案 B；不修改支付价格、积分规则与 Swiss Ephemeris 计算核心。

## 交付状态总览

| 任务 | 代码/内容 | 需你部署后人工 |
|------|-----------|----------------|
| A0 审计文档 | ✅ geo-audit / changelog / qa / crawl-checklist / baseline 模板 / brand-spot-check | T0 填 baseline.md |
| A1 首页 | ✅ | 手机 smoke、`/#generator` 点击 |
| A2 Where to Live | ✅ | 实机 Compare Cities 路径 |
| A3 Relocation | ✅ | 表单提交与复制摘要 |
| A4 技术 SEO | ✅ robots OAI-SearchBot、x-default、/chart noindex | `geo-crawl-checklist.md` 生产勾选 |
| A5 品牌 | ✅ P0 OG/Schema、六语 footer、30+ 内页 siteName；spot-check 清单 | `brand-spot-check.md` 20 点 |
| A6 内容 P1 | ✅ 内链至 `/posts/astrocartography-map-interpretation`（六语 WTL + landing 已有） | 新增长文/外链分发未做 |

## P0 页面

- `/` — Title/H1/canonical **未改**（产品决策）；权益与 Schema Astrocarto.org。
- `/astrocartography-where-to-live/` — 双路径、Demo 截图流程、FAQ、地图解读内链。
- `/relocation-chart-calculator/` — 隐私、单城逻辑、readingGuides、工具按钮。
- `/astrocartography-calculator/` — 文案与 Schema 对齐；无虚假评分。
- `/astrocartography-lines/` — CTA 文案对齐（去 1-mile/unlimited 误导）。

## 仍建议在后续迭代（非方案 A 阻断）

- 其他工具页（natal-chart、rising-sign 等）「unlimited」营销句未全站 sweep。
- `about` 路由仍为旧 Wplace 模板（若 `/about` 未对公众开放可忽略）。
- de/es/it/pt 部分 GEO 块为英文（fallback 可读）。
- A6 竞品对比文、视频分发 — 报告 P1，未纳入本轮代码。

## 测试入口（给你）

1. `pnpm build` — 应通过。  
2. `docs/geo-qa.md` — 本地已验项 + 生产待验项。  
3. `docs/geo-crawl-checklist.md` — 上线后勾选。  
4. `docs/baseline.md` — T0 存档。  
5. `docs/brand-spot-check.md` — A5 抽样。
