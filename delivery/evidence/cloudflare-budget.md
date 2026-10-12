# Cloudflare static budget evidence

Status: **pass for the local static build budget and first production deployment**. Shared-account usage and a real rollback exercise remain pending.

`pnpm build` measures the complete local build and writes `artifacts/cloudflare-budget-report.json`. The report contains the required `siteId`, file count, largest asset bytes/path, build seconds, function route include/exclude arrays, CMS state, check time, official quota sources, and each internal budget result. The build fails if the output exceeds 18,000 files, a 24 MiB asset, or 15 minutes.

R1 has no `functions/` directory and no `_routes.json`; the root and localized pages are static. `cmsEnabled` is false. Static upload limits were rechecked on 2026-10-12 against Cloudflare's official Pages limits, Pages Functions pricing, Workers limits, and Functions routing documentation.

Production evidence captured on 2026-10-12:

- Native Git repository: `DLBaoFu/pixeltokb`, production branch `main`.
- Source commit: `78ae484`; Cloudflare build: `39d17f0a-ae4a-4172-b64c-9a6b17189a97`; Worker version: `06841a4a-54f7-4134-9a7b-354de7ad61d0`.
- Build command `pnpm build` completed in 20.195 seconds; deploy uploaded 106 static assets and reported no runtime bindings.
- Worker URL: `https://pixeltokb.dawei6340.workers.dev`; production custom domain: `https://www.pixeltokb.com`.
- Live checks: root 200; `/en/` 301 to `/`; unknown route 404; apex path/query 301 to the matching `www` URL; CSP, COOP, Permissions-Policy, Referrer-Policy, and `X-Content-Type-Options` are present.

Boundary: the Cloudflare zone visibly uses the Free plan, but shared account request/build consumption is ongoing operational data. A real production rollback has not been exercised.
