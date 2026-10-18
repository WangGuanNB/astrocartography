# GEO 方案 A QA 记录

更新：2026-10-18

## A1 首页验证

| 检查项 | 结果 | 证据 |
|---|---|---|
| 生产构建 | 通过 | `pnpm build`，249 个静态页面完成生成 |
| JSON 语法 | 通过 | 六个首页语言文件均可解析 |
| H1 数量 | 通过 | en/zh/de/es/it/pt 均为 1 个 H1 |
| 新权益区块 | 通过 | 六种语言均输出 `#product-access` |
| 本地化内容 | 通过 | 六种语言显示各自的权益标题与文案 |
| HTML language | 通过 | en/zh/de/es/it/pt 与当前路由一致 |
| 桌面视觉 | 通过 | 两张权益卡、真实界面图和免责声明无重叠或横向溢出 |
| SEO 主元素 | 未改 | Title、H1、URL、canonical 保持原值 |
| 支付与计算回归 | 不涉及 | 本轮未修改相关代码 |

## A2 Where to Live（本地/构建）

| 检查项 | 结果 | 证据 |
|---|---|---|
| user-paths 双卡片 | 通过 | `GuideUserPaths` + 六语 JSON |
| workflow-demo 截图 | 通过 | `Feature3` + `imageCaption` Demo 声明 |
| map vs relocation | 通过 | `Feature2` mapVsRelocation |
| FAQ 报告五类 | 通过 | EN/ZH 完整；de/es/it/pt 含英文 FAQ 扩展 |

## A3 Relocation（本地/构建）

| 检查项 | 结果 | 证据 |
|---|---|---|
| 隐私说明 | 通过 | form.privacyNote + benefit 文案 |
| 再算 / 复制摘要 | 通过 | client 按钮 + tool labels |
| readingGuides ×4 | 通过 | Feature 区块 |
| 虚假 AggregateRating | 已移除 | astrocartography-calculator page schema |

## 建议你本地/预发测试（提交生产前）

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 打开 `/` → 生成地图 CTA | 滚到 `#generator`，地图可生成 |
| 2 | 地图 → Compare Cities | 最多 4 城；无 credits 时 AI 报告有提示 |
| 3 | `/astrocartography-where-to-live/` | 双路径按钮、`workflow-demo` 截图与 Demo 说明 |
| 4 | `/relocation-chart-calculator/` | 提交后「计算另一城」「复制摘要」 |
| 5 | 390px 宽 | WTL 双列卡片不横向溢出 |
| 6 | 查看页源代码 | 主文案在 HTML 中（非空壳） |
| 7 | `/chart?...` | robots noindex（不应作为 SEO 着陆页） |

## A4 / T0（需生产）

- 见 `docs/geo-crawl-checklist.md` — **部署后勾选**。
- 见 `docs/baseline.md` — **T0 人工填表**。

## 已知非阻断项

- 构建仍显示 `src/db/index.ts` 的动态依赖警告；该警告在本轮前已存在，本轮未引入数据库代码变更。
- 部署前仍需人工查看真实手机宽度下的首页与 Where to Live 区块，并点击“生成免费地图”确认锚点回到生成器。
- 全站品牌统一与 `.net` 抽样未关闭（A5 余量）。

