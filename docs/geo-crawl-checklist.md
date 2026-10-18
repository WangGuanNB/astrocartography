# GEO 方案 A — 抓取与索引检查清单

更新：2026-10-18  
用途：部署到 **生产** 后逐项勾选（本地 build 不能替代 WAF/CDN 验证）。

## 1. robots.txt

- [ ] `https://astrocarto.org/robots.txt` 返回 200
- [ ] 存在 `User-agent: OAI-SearchBot` + `Allow: /`（或与全站策略一致的 Allow 规则）
- [ ] `Sitemap: https://astrocarto.org/sitemap.xml` 可访问
- [ ] `Disallow: /chart` 仍生效（个人结果页不索引）

## 2. 关键 URL HTTP 200 + 可索引 HTML

对每种语言抽测 EN + ZH（其余语言 spot check）：

| URL | index | 主文案在 HTML 中 | canonical 自指 |
|-----|-------|------------------|----------------|
| `/` | yes | H1 + product-access | yes |
| `/astrocartography-where-to-live/` | yes | user-paths + workflow-demo | yes |
| `/relocation-chart-calculator/` | yes | tool + reading-guides | yes |
| `/astrocartography-calculator/` | yes | introduce/benefit | yes |
| `/chart?birthDate=...` | **no** | n/a | n/a |

验证方式示例：

```bash
curl -sI "https://astrocarto.org/astrocartography-where-to-live/"
curl -s "https://astrocarto.org/relocation-chart-calculator/" | head -c 8000
```

## 3. hreflang / x-default

- [ ] 首页、`where-to-live`、`relocation-chart-calculator` 的 `<link rel="alternate" hreflang="x-default">` 指向默认语言规范 URL
- [ ] 语言切换器生成的链接均可 200（无 404 locale 路径）

## 4. 爬虫与 WAF（生产）

- [ ] Google Search Console → URL 检查：首页 + 上述 P0 页「可编入索引」
- [ ] 用 GSC 或服务器日志确认 **Googlebot** 无大量 403/429
- [ ] 若使用 Cloudflare/WAF：确认 **OAI-SearchBot**、**Googlebot** 不在误杀规则中（需运维配合）
- [ ] `GPTBot` 策略已单独决定（训练抓取 ≠ OAI-SearchBot 搜索发现）

## 5. 结构化数据（抽样）

- [ ] 首页 JSON-LD：Organization / WebSite 为 `Astrocarto.org`
- [ ] 无无法核实的 `AggregateRating` / 虚假评论数 on P0 页
- [ ] FAQ 可见文本与 FAQPage JSON-LD 一致（不依赖富结果必出）

## 6. 回归 smoke

- [ ] 首页「生成地图」→ `#generator` 可用
- [ ] 地图加载 → Compare Cities（最多 4 城）可打开
- [ ] 搬迁盘：提交 → 结果 →「计算另一城」「复制摘要」
- [ ] 移动端宽度 390–430px：Where to Live 双路径卡片无横向溢出

记录人 / 日期 / 截图路径：____________________
