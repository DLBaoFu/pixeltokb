# Performance evidence

Status: **pass for PF01 and PF02 local laboratory acceptance; PF03 field data remains pending**.

Lighthouse 12.8.2 ran three times against the final local `/compress-image/` static preview in Headless Chrome 154. Every run scored Performance 100, Accessibility 100, Best Practices 100, and SEO 100; therefore all four medians are 100. LCP was 1,357.88 ms, 1,354.85 ms, and 1,654.38 ms; CLS and total blocking time were 0 in all three runs. The repository-resident raw reports are `performance/lighthouse-1.json`, `performance/lighthouse-2.json`, and `performance/lighthouse-3.json`.

PF02 is independently checked from the final `dist/` output. All built JavaScript totals 96,983 gzip bytes and all built CSS totals 6,973 gzip bytes; this conservative whole-bundle total is below the 180 KB JavaScript budget. Each Lighthouse run loaded 8 requests and transferred 95,378 bytes, below the 500 KB base-transfer budget. No global WASM or advertising bundle is present.

Environment: macOS, local static preview, Lighthouse 12.8.2, Headless Chrome 154.0.0.0, 2026-10-12. PF03 production Core Web Vitals remains pending until real traffic exists; these laboratory measurements are not presented as field data.
