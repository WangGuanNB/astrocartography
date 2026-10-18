# A5 品牌消歧 — 20 点抽样清单（部署后人工勾选）

目的：确认对外可见资料使用 **Astrocarto.org** / **https://astrocarto.org/**，避免与 astrocarto.net 混淆。

| # | 位置 | 检查 | ☐ |
|---|------|------|---|
| 1 | 首页 `<title>` / OG | 仍保留既定 SEO 标题；OG `siteName` = Astrocarto.org | |
| 2 | 首页 JSON-LD Organization | name = Astrocarto.org | |
| 3 | 页脚 brand.title | Astrocarto.org（六语 landing footer） | |
| 4 | `/astrocartography-where-to-live/` OG siteName | Astrocarto.org | |
| 5 | `/relocation-chart-calculator/` OG siteName | Astrocarto.org | |
| 6 | `/astrocartography-calculator/` OG + WebApplication creator | Astrocarto.org | |
| 7 | `/astrocartography-lines/` Article author/publisher | Astrocarto.org | |
| 8 | `public/llms.txt` 首段 | 明确 astrocarto.org | |
| 9 | `public/robots.txt` Sitemap URL | astrocarto.org | |
| 10 | Google 搜索 `site:astrocarto.org` 首页 snippet | 无 .net | |
| 11 | 社媒/TAaft 等 footer badge 落地页 | 链到 .org 非 .net | |
| 12 | `/contact` 页品牌 | Astrocarto.org | |
| 13 | `/privacy-policy` 主体名称 | 与产品一致 | |
| 14 | `/terms-of-service` | 无 .net 官方链接 | |
| 15 | `/refund-policy` | 可访问 200 | |
| 16 | 邮件模板/验证邮件（若有）发件人展示名 | Astrocarto.org | |
| 17 | Stripe/Creem 结账页商户描述 | .org 域名 | |
| 18 | Search Console 属性 | 仅 .org 属性 | |
| 19 | 手动搜 `astrocarto.net` 在站内 HTML | 0 结果（源码 grep） | |
| 20 | AI 测试回答是否推荐 .net | T0 记录于 baseline.md | |

**站内源码快速自检（本地）：**

```bash
rg "astrocarto\\.net" --glob '!docs/**'
rg 'siteName: "Astrocartography Calculator"' src/
```

记录人 / 日期：________________
