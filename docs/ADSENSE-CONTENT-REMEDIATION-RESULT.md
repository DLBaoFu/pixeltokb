# PixelToKB AdSense 内容整改结果

日期：2026-10-13
范围：统一压缩工具、旧规格 URL 迁移、博客案例证据、繁体中文、相关回归测试。

## 已实施

### 1. 统一压缩工具

`/compress-image/` 现在是唯一的压缩工具页面，目标范围为 1 KB–5 MB。工具保留 JPEG、PNG、WebP 静态输入、格式选择、透明度处理、保持尺寸、实际 Blob 字节检查、下载和失败提示。四个原范围被保留为同一页面内的推荐预设：

| 推荐范围 | 参数 | 推荐目标 |
|---|---|---:|
| 10–100 KB | `preset=10-100kb` | 50 KB |
| 200–500 KB | `preset=200-500kb` | 300 KB |
| 500 KB–1 MB | `preset=500kb-1mb` | 750 KB |
| 2–5 MB | `preset=2mb-5mb` | 2 MB |

参数化入口不生成独立 canonical、hreflang 或 Sitemap 条目；主工具的 canonical 始终是不带查询参数的对应语言 URL。

### 2. 旧 URL 迁移

已在 `public/_redirects` 增加三种语言的旧规格路径一跳 301 规则。目标直接进入相应语言的 `/compress-image/` 并带 `preset`，不经过第二个旧页面。其他已有 `compress-jpg`、`compress-jpeg` 和 `target` 别名也改为直接指向统一工具。

本地构建后的规则由 `scripts/validate-redirects.mjs` 校验。提交 `c30b520` 已推送 `main`，Cloudflare 已生成版本 `e6277530`；生产复核确认九个三语旧规格地址均为一跳 HTTP 301，分别指向对应语言的统一工具并保留 `preset`。

### 3. 博客真实案例

新增 `scripts/audit-blog-cases.mjs` 与 `pnpm audit:blog-cases`，使用真实仓库 fixture、浏览器压缩流程和实际下载目录校验。证据写入 `docs/blog-case-evidence.json`。五篇文章的核心案例现在对应不同源文件或独立检查问题；没有证据支持的“10 KB 失败”和未实际采集的多格式检查结果已从正文删除。

### 4. 繁体中文

统一检查了压缩工具、工具目录、博客案例和元数据相关文案，保留 JPEG、PNG、WebP、KB、MB、DPI 等标准缩写；繁体文章不再使用未经实测支持的失败数字。

## 验证命令与结果

- `pnpm audit:blog-cases`：5 个案例，4 个真实下载，4/4 输出不超过目标；检查器读取 2,930 bytes、320 × 240 JPEG、无透明度和无 DPI 数值。
- `pnpm check`：0 errors、0 warnings、0 hints。
- `pnpm test`：38/38。
- `pnpm build`：成功；85 个页面、84 个 R1 路由、60 个可索引 URL、2,773 个静态链接，301 规则、canonical/hreflang、Sitemap、robots 和 Cloudflare 本地预算校验均通过。
- `validate-browser-matrix.mjs`：768 项，桌面/平板/移动、三语言、明暗主题均无失败；还验证了带 `preset` 的压缩 URL 切换语言时保留查询参数；最终截图目录为 `/private/tmp/pixeltokb-ads-report-fix-final-merge-2026-10-13-final/`。
- `validate-accessibility.mjs`：84 routes、168 audits、168 keyboard checks、84 accessibility trees，0 failures。

## 仍待人工或生产环境确认

- 生产域名的旧规格 301、主工具 200、sitemap/robots/ads.txt 可读和繁体文案已完成线上复核；Cloudflare 构建详情显示 `c30b520` 的构建与部署阶段完成。
- Safari、Edge、真实 iOS/Android 设备的视觉与下载矩阵不由本地 Chrome 证据替代。
- AdSense 审批结果、CMP 账户配置和 Search Console 报告不由源码或本地构建推断。
