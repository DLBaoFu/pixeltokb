# PixelToKB 旧规格 URL 跳转核验

日期：2026-10-13

## 目标规则

| 语言 | 旧 URL | 新目标 |
|---|---|---|
| English | `/compress-image-200kb-to-500kb/` | `/compress-image/?preset=200-500kb` |
| English | `/compress-image-500kb-to-1mb/` | `/compress-image/?preset=500kb-1mb` |
| English | `/compress-image-2mb-to-5mb/` | `/compress-image/?preset=2mb-5mb` |
| 简体中文 | `/zh-cn/compress-image-200kb-to-500kb/` | `/zh-cn/compress-image/?preset=200-500kb` |
| 简体中文 | `/zh-cn/compress-image-500kb-to-1mb/` | `/zh-cn/compress-image/?preset=500kb-1mb` |
| 简体中文 | `/zh-cn/compress-image-2mb-to-5mb/` | `/zh-cn/compress-image/?preset=2mb-5mb` |
| 繁體中文 | `/zh-tw/compress-image-200kb-to-500kb/` | `/zh-tw/compress-image/?preset=200-500kb` |
| 繁體中文 | `/zh-tw/compress-image-500kb-to-1mb/` | `/zh-tw/compress-image/?preset=500kb-1mb` |
| 繁體中文 | `/zh-tw/compress-image-2mb-to-5mb/` | `/zh-tw/compress-image/?preset=2mb-5mb` |

## 本地发布产物核验

`public/_redirects` 已包含以上 9 条一跳 301 规则；目标路径在构建产物中只对应统一的 `/compress-image/` 页面。`scripts/validate-redirects.mjs` 会检查状态码为 301、目标文件存在、无自身跳转和无已知跳转链。查询参数不会生成新的静态页面，客户端压缩器会读取 `preset` 并选中对应推荐目标。

## 生产线上核验

提交 `c30b520`（Cloudflare 版本 `e6277530`）部署后，普通 UA 线上核验确认上表九个地址均返回一跳 HTTP 301，`Location` 分别为对应语言的 `/compress-image/?preset=...`；主工具返回 200，查询参数页面的 canonical 不带查询参数。`Googlebot` UA 访问 `/compress-image/` 返回 200。旧规格 slug 不在生产 `sitemap.xml`。
