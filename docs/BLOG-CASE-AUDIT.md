# PixelToKB 博客真实案例审计

日期：2026-10-13
证据命令：`PREVIEW_ORIGIN=http://127.0.0.1:4321 pnpm audit:blog-cases`
机器证据：`docs/blog-case-evidence.json`
浏览器截图：`public/blog-workflows/{en,zh-cn,zh-tw}/`

所有数字均来自仓库中的测试 fixture、同源浏览器工具和实际下载文件；不是用户上传、品牌设备或第三方机构要求的声明。

| 文章 | 独立问题 | 真实素材/结果 | 状态 |
|---|---|---|---|
| `compress-without-changing-dimensions` | 保持像素尺寸时减少编码字节 | `opaque-gradient.jpg`，320 × 240，2,930 bytes JPEG → 20,000-byte target，实际下载 6,364 bytes JPEG，320 × 240 | pass |
| `why-image-wont-fit-50kb` | 同一上限下格式和内容如何影响结果 | `textured.webp`，320 × 240，15,968 bytes WebP → 50,000-byte target，实际下载 23,906 bytes WebP；正文另列已实测 JPEG 与透明 PNG 对比 | pass |
| `kb-vs-kib` | 十进制 KB 与二进制 KiB 的换算 | `alpha-shapes.png`，320 × 240，7,287 bytes RGBA PNG → 75,000-byte target，实际下载 4,000 bytes WebP；75 KB = 75,000 bytes，约 73.2421875 KiB | pass |
| `check-image-size-and-dpi` | 分开读取 bytes、像素、透明度和 DPI | `opaque-gradient.jpg`，实际检查 2,930 bytes、2.93 KB、2.86 KiB、320 × 240、JPEG、无透明度；未嵌入 DPI 不补写数值 | pass |
| `compress-image-to-100kb` | 上传上限场景下核对实际保存文件 | `unoptimized-alpha.png`，320 × 240，307,892 bytes RGBA PNG → 100,000-byte target，实际下载 4,016 bytes WebP，320 × 240 | pass |

## 已移除或修正的无证据内容

- 删除“高透明度 PNG 在保持尺寸时无法达到 10 KB”的结论；当前证据只支持透明 PNG 在 50/75 KB 目标下生成实际 WebP，不支持该失败断言。
- 删除检查文章中没有对应截图、下载文件或 JSON 证据的 opaque WebP、transparent WebP 和 cropped PNG 行。
- 保留原文章的限制说明、单位解释、格式选择和失败处理建议；未声称第三方机构的具体上传规定。

## 来源与隐私

四个压缩 fixture 位于 `tests/fixtures/images/`，由项目维护并用于公开演示；没有身份证、面孔、住址、订单、聊天内容、定位或用户私人文件。输出下载文件只在临时 Chrome 下载目录读取，未提交临时下载物。
