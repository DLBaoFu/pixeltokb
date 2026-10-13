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

## 生产基线（本次改动部署前）

在 2026-10-13 本次本地修改完成前，以下三个英文旧地址由 `curl -I https://www.pixeltokb.com/<path>/` 读取为 HTTP 200，未返回 Location。这是部署前基线，不是本次整改后的线上结果：

| 地址 | 当前生产基线 |
|---|---|
| `/compress-image-200kb-to-500kb/` | 200，无 Location |
| `/compress-image-500kb-to-1mb/` | 200，无 Location |
| `/compress-image-2mb-to-5mb/` | 200，无 Location |

部署后必须重新执行各语言、普通 UA、Googlebot UA 的 `curl -I`，确认 301、Location、最终主工具 200，以及参数页面的 canonical 无查询参数。
