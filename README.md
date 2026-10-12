# PixelToKB

[PixelToKB](https://www.pixeltokb.com) is a privacy-first collection of browser-based image tools. Images are processed locally in the browser and are not uploaded to a PixelToKB server.

## Available tools

- Compress images to an exact size range with real byte validation.
- Use 10, 20, 30, 50, and 100 KB presets or enter a custom target.
- Resize images with Fit, Fill, and Stretch modes.
- Crop images with pointer, touch, keyboard, or exact pixel controls.
- Inspect exact bytes, KB/KiB, dimensions, aspect ratio, transparency, and DPI metadata.
- Work in English, Simplified Chinese, or Traditional Chinese.
- Switch between Light, Dark, and System themes.

The current compression pages are:

| Page | Presets | Default | Custom unit |
|---|---|---:|---|
| `/compress-image/` | 10, 20, 30, 50, 100 KB | 50 KB | KB |
| `/compress-image-200kb-to-500kb/` | 200, 300, 400, 500 KB | 300 KB | KB |
| `/compress-image-500kb-to-1mb/` | 500, 750 KB, 1 MB | 750 KB | KB |
| `/compress-image-2mb-to-5mb/` | 2, 3, 4, 5 MB | 2 MB | MB |

KB, KiB, MB, and MiB conversions preserve the same exact byte budget. The 500 KB preset intentionally appears at the boundary of two adjacent ranges.

## Privacy and limits

- Image processing runs in a browser Web Worker.
- Selected images are not uploaded or assigned a public result URL.
- Static JPEG, PNG, and WebP inputs are supported.
- Animated images and unsupported formats are rejected explicitly.
- The single-file limit is 20,000,000 bytes and the decoded-image limit is 40 megapixels.
- Processing can be canceled, and stale results are cleared when the input or settings change.

Read the published policies and product information at [www.pixeltokb.com](https://www.pixeltokb.com).

## Local setup

Requirements: Node.js 22 or newer and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Validation and build

```sh
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm preview
```

`pnpm build` creates the static site in `dist/`, generates one sitemap, validates every registered route and legacy redirect, and enforces the local Cloudflare output budget. The production site is live at [https://www.pixeltokb.com](https://www.pixeltokb.com); its origin can be supplied explicitly for reproducible builds:

```sh
SITE_ORIGIN=https://www.pixeltokb.com pnpm build
```

The production release gate is intentionally stricter than a local build:

```sh
pnpm check:release
```

It remains blocked until every required production and cross-browser check has genuine evidence. See [SETUP_REQUIRED.md](SETUP_REQUIRED.md) and [DELIVERY.md](DELIVERY.md).

## Deployment

The site is designed for a static Cloudflare Pages project:

- Build command: `pnpm build`
- Output directory: `dist`
- Production branch: `main`
- Production URL: [https://www.pixeltokb.com](https://www.pixeltokb.com)
- R1 uses no Pages Functions, database, or server-side image processing.

## Operator

PixelToKB is operated and reviewed by PixelTokb. Contact: [Support@piexltokb.com](mailto:Support@piexltokb.com).
