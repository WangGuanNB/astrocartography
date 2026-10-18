# GEO 方案 A 变更记录

## 2026-10-18 — A1 首页收尾

### 页面与组件

- `src/app/[locale]/(default)/page.tsx`
  - 保留现有 SEO 主框架。
  - 接入真实产品与权益边界区块。
- `src/components/blocks/homepage-product-proof/index.tsx`
  - 新增响应式产品证明区块。
  - 展示免费核心工具、可选付费深度、真实界面示例和生成地图 CTA。
- `src/types/pages/landing.d.ts`
  - 增加 `productProof` 区块类型。

### 多语言内容

- 更新 `en`、`zh`、`de`、`es`、`it`、`pt` 六个首页 JSON。
- 免费范围明确为地图生成、行星线探索及会话内基础城市检查/比较流程。
- 付费范围仅描述为可选 AI 解读、结构化报告、保存研究与时间窗口，不改动价格或积分。
- 真实截图明确标记为 Demo，不将示例信息描述成真实用户预测。
- 商业用途 FAQ 改为先联系支持确认条款与地图署名要求。
- 隐私表述改为出生资料会发送给计算服务，但不会公开展示，并指向隐私政策。

### 未改动

- 首页 Title、H1、URL、canonical。
- Stripe、PayPal、订阅、一次性套餐及积分规则。
- Swiss Ephemeris、地图线路和城市比较计算逻辑。

## 2026-10-18 — A2 / A3 / A1 文案收尾

### Where to Live（A2）

- 新增 `GuideUserPaths` 组件与 `userPaths` / `workflowDemo` / `mapVsRelocation` 六语 JSON。
- `astrocartography-where-to-live/page.tsx`：渲染上述区块；OG `siteName` 与 Article schema 改为 Astrocarto.org；hreflang 增加 `x-default`。
- FAQ / CTA 对齐真实路径：地图 Compare Cities（最多 4 城）、搬迁盘每次一城、AI 报告消耗 credits。

### Relocation Chart（A3）

- 文案修正：不再声称数据「仅留在设备」；metadata 与功能描述区分「单城搬迁盘」vs「地图多城对比」。
- 新增 `readingGuides` 四模块；工具区隐私说明、「计算另一城」「复制摘要」按钮。
- `relocation-chart-calculator/page.tsx`：`x-default`、Astrocarto.org 品牌、JSON-LD creator。

### 首页与全站 meta（A1 尾）

- 六语 `messages/*.json` 全局 description 与 landing 免费档「无限地图」表述修正。
- `public/robots.txt`：显式 `User-agent: OAI-SearchBot` Allow。

## 2026-10-18 — A2/A4/A5 收尾（第二轮）

- `Feature3`：可选 `section.image` + `imageCaption`（Where to Live workflow Demo 截图）。
- Where to Live：演示城流程、报告建议 FAQ 三项（事业线/出生时间/无线条附近）；EN/ZH 本地化。
- 首页与 `astrocartography-calculator`：Schema/OG 品牌 Astrocarto.org；移除 calculator 页虚假 AggregateRating；修正 calculator EN 文案（去 1-mile/unlimited/本地计算/免许可商业声明）。
- `pricing/*`：免费档 unlimited maps 表述与 landing 对齐。
- 新增 `docs/geo-crawl-checklist.md`、`docs/baseline.md`；更新 `geo-audit.md` / `geo-qa.md` 状态。

## 2026-10-18 — 方案 A 收尾（第三轮）

- **A5**：约 30 个页面 `siteName` / Organization JSON-LD → Astrocarto.org；六语 landing footer 品牌；`docs/brand-spot-check.md`；`src/lib/site-brand.ts`。
- **A6（最小）**：Where to Live 六语内链 → 地图解读文章；guideHero 主 CTA → `/#generator`。
- **声明一致**：`astrocartography-lines` CTA；calculator/relocation/pricing 多语同步；`astro-chat` 去「无限提问」；pricing zh 地图次数。
- **A4**：`robots.txt` GPTBot 注释说明。
- **文档**：`geo-audit.md` 标记方案 A 代码交付完成；`geo-qa.md` 增加提交前测试表。

