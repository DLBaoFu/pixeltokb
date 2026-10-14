# R2 lossless PNG optimizer and batch evidence

Checked through 2026-10-14 against the final local static build. This record covers `/compress-png/` single-file lossless optimization and its local PNG batch queue. It does not claim deployment or native mobile-device coverage.

## Functional result

- The browser validates PNG signature, MIME, IHDR, chunk bounds, CRC values, IDAT/IEND presence, animation markers, 20,000,000-byte input limit, and 40MP decoded-size limit before encoding.
- Processing runs in the existing image Worker. A deterministic encoder selects PNG row filters and streams deflate output. Opaque sources remain RGB PNGs; transparent sources remain RGBA PNGs.
- The output is offered only when it is smaller and a second browser decode has zero RGBA channel mismatches. Dimensions are never resized. APNG is refused; no JPEG or WebP conversion is part of this tool.
- Embedded eXIf, tEXt, zTXt, iTXt, and tIME chunks are absent from the accepted output. The output declares sRGB; the public copy does not promise that unusual source profiles display identically in every color-managed application.
- Every new selection, cancellation, error, timeout, or no-saving result revokes the prior Blob URL and removes the download action.

## Actual file evidence

| Browser/case | Input | Output | Verification |
|---|---:|---:|---|
| Chrome 155 RGBA | 307,892 bytes | 3,891 bytes | Saved to disk; PNG signature `89504e470d0a1a0a`; 320×240; independent full decoded comparison reported 0 channel mismatches; alpha corner 0 and center 255; no private metadata; sRGB present. |
| Firefox 155 RGBA | 307,892 bytes | 3,831 bytes | Saved to disk; PNG signature; 320×240; alpha corner 0 and center 255; second run unchanged with no download; no console errors. |
| WebKit 26.6 RGBA | 307,892 bytes | 3,878 bytes | Saved to disk; PNG signature; 320×240; alpha corner 0 and center 255; second run unchanged with no download; no console errors. |
| Chrome opaque RGB | 175,636 bytes | 790 bytes | Output Blob has PNG signature, reports no alpha, and retains PNG color type 2. |
| Chrome metadata case | tIME/tEXt and added eXIf | smaller PNG | Output state reports verified removal; parser/unit checks confirm the private chunks are absent. |

The different compressed byte counts across engines are expected deflate differences; acceptance is based on each output's real bytes, PNG structure, and decoded pixels, not byte-for-byte equality between encoders.

## Negative and state evidence

- Reprocessing the optimized PNG: `unchanged`, no result card, no download.
- APNG with `acTL`: explicit animation error, no result/download.
- JPEG bytes with a `.png` name: format error, no result/download.
- Immediate cancellation: cancelled state, no result/download.
- Unit coverage: corrupted CRC, byte/pixel ceilings, unavailable encoder, output pixel mismatch, no-saving output, RGB/RGBA container parity, metadata removal, and bitmap release.
- English, Simplified Chinese, and Traditional Chinese success states were run through the real Worker.

## Route, SEO, visual, and accessibility evidence

- Final build: 0 Astro diagnostics, TypeScript pass, 45/45 unit tests, 88 generated pages including 404, 87 current-build/indexable routes, 82 one-hop redirects, canonical/hreflang/robots/sitemap/internal-link validation pass, and Cloudflare static budgets pass.
- Routes: `/compress-png/`, `/zh-cn/compress-png/`, `/zh-tw/compress-png/`; `/en/compress-png/` redirects once to the English canonical.
- Final Chrome whole-site matrix: 792 route/viewport/theme states, 0 failures; 75 saved screenshots across every published page family and locale at representative 360/390/768/1366 widths and Light/Dark themes.
- Accessibility: 87 routes, 174 audits, 174 keyboard checks, 87 accessibility trees, 0 failures.
- Representative PNG tool, Tools directory, Blog article, Privacy, and 404 screenshots were visually inspected. No new alignment, typography, wrapping, control, responsive, theme, or footer inconsistency was found.
- The repository-wide `pnpm check:release` remains stopped by the older `imageFixtureE2E` and `crossBrowserDownloadAndAlpha` evidence records. This R2 evidence improves PNG browser coverage but does not relabel the remaining R1 metadata, Edge, or physical-device evidence as complete.

Raw local evidence is under `artifacts/2026-10-13-r2-png-optimizer-*` and `artifacts/2026-10-13-r2-png-cross-browser*`. The repeatable Chrome command is `pnpm check:png artifacts/2026-10-13-r2-png-optimizer-e2e.json`.

## Batch PNG queue and ZIP evidence

- The batch entry is part of the same three canonical `/compress-png/` pages. It accepts at most 20 static PNG selections, at most 100,000,000 bytes in total, and applies the existing 20,000,000-byte per-file limit.
- The queue starts at two Workers, uses one Worker on a device reporting 4 GB or less, and drops to one Worker after a recoverable `OUT_OF_MEMORY` result. Every file exposes queued, processing, optimized, unchanged, failed, or cancelled status; a failed item cannot enter the ZIP.
- Chrome 155 selected five real cases: RGBA PNG, opaque RGB PNG, APNG, JPEG bytes disguised as PNG, and an already optimized PNG. The first two produced 3,891-byte and 790-byte verified PNGs. APNG and disguised JPEG were rejected, the prior optimized PNG remained unchanged, and the downloaded ZIP contained exactly `unoptimized-alpha-optimized.png` and `opaque-rgb-optimized.png` with PNG signatures.
- Chrome also exercised the 21-file refusal, a device-memory=4 serial-queue notice, cancellation of ten queued files, individual result downloads, and successful two-file batch runs in Simplified and Traditional Chinese. The result-state screenshot is `artifacts/2026-10-13-r2-png-batch-ui/76-en-compress-png-batch-results-1366-light.png`.
- Firefox 155 and WebKit 26.6 each completed two-file batches with two individual downloads and a two-entry ZIP. Firefox entries were 3,831 bytes each; WebKit entries were 3,878 bytes each. Both ZIPs had PNG signatures, no browser-console errors, and a 390px dark-mode page had no horizontal overflow.
- Batch unit coverage verifies count/total/per-file limits, low-memory concurrency selection, stored ZIP structure, filename cleanup and de-duplication, only-success entry inputs, and empty-ZIP refusal.

## Explicitly not claimed

- No Git commit, push, Cloudflare deployment, or production URL verification was performed in this task.
- The WebKit run is engine-level evidence, not a native physical Safari/iPhone sign-off. Microsoft Edge was not installed, and Android Chrome/iOS Safari physical devices were unavailable.
- A genuine browser out-of-memory event was not forced. The Worker has an explicit `OUT_OF_MEMORY` mapping and recovery path, while deterministic failure/resource-release behavior is unit-tested.
- Fixed target-size promises and JPEG/WebP conversion remain outside this R2 capability.
