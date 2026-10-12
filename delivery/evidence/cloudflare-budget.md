# Cloudflare static budget evidence

Status: **pass for the local static build budget**. Account and deployment checks remain pending.

`pnpm build` measures the complete local build and writes `artifacts/cloudflare-budget-report.json`. The report contains the required `siteId`, file count, largest asset bytes/path, build seconds, function route include/exclude arrays, CMS state, check time, official quota sources, and each internal budget result. The build fails if the output exceeds 18,000 files, a 24 MiB asset, or 15 minutes.

R1 has no `functions/` directory and no `_routes.json`; the root and localized pages are static. `cmsEnabled` is false. Static upload limits were rechecked on 2026-10-12 against Cloudflare's official Pages limits, Pages Functions pricing, Workers limits, and Functions routing documentation.

Boundary: Cloudflare account plan/shared usage, deployed build duration, live response headers, redirects, Functions metrics, and automatic deployment cannot be proven without the real account and deployment. They remain CF/GH pending items even though the local bundle budget passes.
