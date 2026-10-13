# SEO / AdSense 技术审计

日期：2026-10-13
用途：供人工复核的事实记录。线上事实仅记录本轮实际响应和浏览器证据，不把 AdSense 后台状态推断为已批准。

## 当前生产只读事实

| 项目 | 实测结果 |
|---|---|
| `https://www.pixeltokb.com/robots.txt` | HTTP 200，`text/plain`；包含 `Sitemap: https://www.pixeltokb.com/sitemap.xml` |
| `https://www.pixeltokb.com/sitemap.xml` | HTTP 200，`application/xml`；当前线上响应含 60 个 `<loc>`，不含旧规格 slug |
| `https://www.pixeltokb.com/ads.txt` | HTTP 200，`text/plain`；内容为 `google.com, pub-9264530196706730, DIRECT, f08c47fec0942fa0` |
| `/blog/`、`/zh-cn/`、`/zh-tw/` | 当前线上页面可读取 self-canonical、`en`、`zh-CN`、`zh-TW` 和 `x-default` alternate |
| 三语言九个旧规格地址 | HTTP 301；`Location` 指向对应语言 `/compress-image/?preset=...`，一跳完成 |
| AdSense JavaScript | 当前生产页面没有 `adsbygoogle` / `pagead.googlesyndication` loader；`adsMode` 仍为 off |

## 本地源码与构建事实

- 规范压缩页面：`/compress-image/`；主工具目标为 1 KB–5 MB。
- 查询入口：`preset=10-100kb`、`preset=200-500kb`、`preset=500kb-1mb`、`preset=2mb-5mb`；查询页面 canonical 仍是不带参数的语言主 URL，查询 URL 不进入 Sitemap。
- 三语 canonical/hreflang 由 `BaseLayout.astro` 输出；旧三规格页面不再由静态路由生成。
- `public/_redirects` 提供三语旧规格到主工具的一跳 301；`scripts/validate-redirects.mjs` 在最终构建中验证目标文件和跳转链。
- `scripts/generate-sitemap.mjs` 只从 `routes.json` 的 R1 生成页面和 canonical 计算 Sitemap；迁移的三个旧规格条目改为 R2，不会进入 indexable URL 集合。
- 页面元信息由 `BaseLayout.astro` 输出：title、description、author、robots、canonical、hreflang、Open Graph、Twitter 和 JSON-LD。最终本地构建已成功：85 个页面、84 个 R1 路由、60 个可索引 Sitemap URL；查询参数不新增 Sitemap URL。
- Cloudflare/GitHub 仍沿用现有架构；本轮未改 `wrangler.jsonc`、Worker 绑定、GitHub 远端或部署凭据。
- 本轮最终提交为 `c30b520`，Cloudflare 构建版本为 `e6277530`；构建详情中的初始化、克隆、安装、构建和部署阶段均已完成，生产页面已返回修正后的繁体词组。

## AdSense 边界

`ads.txt` 只能声明授权卖方，不会渲染广告。当前站点没有广告 loader 或广告位，因此本文件不声称广告展示、CMP 或 AdSense 审批通过。若未来面向 EEA、英国或瑞士投放广告，仍需在账户中配置 Google 认证并接入 IAB TCF 的 CMP。

## 待人工复核

- AdSense 专用爬虫（`Mediapartners-Google` / `Google-Display-Ads-Bot`）是否被账户和 Cloudflare 安全规则允许；普通 Googlebot 200 不能替代该后台证据。
- GSC URL Inspection、索引状态和性能数据（账号配置由运营者确认正常，但本文件不保存凭据）。
- 邮箱收发、AdSense 站点审核、CMP 账户配置和真实设备/跨浏览器下载矩阵。
