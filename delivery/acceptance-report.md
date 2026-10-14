# R1 acceptance report

Checked 2026-10-13 on macOS against the final local static build. Status vocabulary: **pass** means the stated local acceptance was actually exercised; **partial** means the local portion passed but a named external or production check remains; **pending** means required evidence is unavailable; **not applicable** means the capability is intentionally unpublished in R1. Evidence summaries are in `delivery/evidence/`; raw browser artifacts remain in the local `artifacts/` tree.

Operator publication confirmation: the operator confirmed the contact inbox and the eight identity/policy/editorial page families for R1. Those pages are now eligible for indexing; the remaining image metadata and cross-browser evidence is explicitly deferred to the next version and is not marked as passed without evidence.

## Image tools and pages

| ID | Status | Result and evidence |
|---|---|---|
| KB01 | pass | Static JPEG/PNG/WebP signature, MIME, and container checks pass; corrupt, mismatched, APNG, and animated WebP inputs are rejected before decoding. |
| KB02 | pass | Real JPEG/WebP 20/50/100 KB downloads are within byte budgets, independently decoded at 320×240, and recorded in `image-fixture-e2e.md`. |
| KB03 | pass | Unreachable 10 KB keep-dimensions case returns `TARGET_UNREACHABLE` with no download; successful downloads do not exceed the selected byte budget. |
| KB04 | pass | Worker has a shared 20-encode and 30-second ceiling; search validates actual Blob bytes rather than assuming monotonic quality. Unit tests and UI cancellation passed. |
| KB05 | pass | Auto output matches returned MIME; WebP keeps alpha; explicit JPEG flattening uses visible white/custom background controls and decoded pixel evidence. |
| KB06 | pass | Ratio lock, Fit background, centered Fill crop, Stretch, preview geometry, and exact 160×120 crop output passed saved-file/pixel checks. |
| KB07 | pass | Exact bytes, decimal KB, binary KiB, pixels, ratio, alpha, and absent-DPI states passed; missing DPI is not reported as 72. |
| KB08 | pass (local browser fixture) | Dedicated generated JPEG with EXIF orientation 6 and GPS latitude/longitude was processed through the compression UI; output and saved download were re-read with no EXIF/GPS/orientation tag and dimensions correctly changed from 320×240 source orientation to 240×320. A PNG carrying the real Display P3 ICC profile was processed through the PNG optimizer; output retained 320×240 and alpha, removed `iCCP`/private metadata, and included `sRGB`. Raw result: `delivery/evidence/image-fixture-e2e.json`; run: `pnpm check:image-fixtures`. This does not claim native Safari/Edge/mobile or third-party color-management behavior. |
| KB09 | pass | 20 MB, 40 MP, corrupt, animation, timeout, cancel, Worker termination, and recovery paths were exercised with no stale download. |
| KB10 | pass | Repeated selection, setting changes, cancellation, invalid replacement, reset, output filename, MIME, signature, and stale-result invalidation passed. |
| KB11 | pass | Four range pages expose the required presets, defaults, custom ranges, and KB/MB defaults in all three locales; no personal public result URL exists. |
| KB12 | pass | Pages share one component/Worker, enforce exact range boundaries, preserve the shared 500 KB boundary without duplicate URLs, and synchronize units/FAQ/results. |
| PG01 | pass | All 30 route families × 3 locales have substantive content and non-empty categories; the eight R1 identity/policy/editorial page families were confirmed complete by the operator and are now indexable. |
| PG02 | pass | Local 404 and 71 explicit single-hop redirects pass validation; production checks confirm HTTPS 200, `/en/` → `/` as 301, the custom 404 as 404, and the apex-domain 301 with path/query preservation. |
| PG03 | pass | PixelTokb identity, real page copy, the live `https://www.pixeltokb.com` production origin, and the operator-confirmed `support@pixeltokb.com` inbox pass for R1 publication. |

## Visual, navigation, content, and languages

| ID | Status | Result and evidence |
|---|---|---|
| UI01 | pass | All required page families use the same visual system in the saved whole-site matrix. |
| UI02 | pass | Tool setting groups, selected states, custom target row, responsive rearrangement, and keyboard use pass the Chrome matrix. |
| UI03 | pass | Dynamic FAQ answers track the current target without implementation badges or stale-language copy. |
| UI04 | pass | Hierarchy, spacing, card density, controls, borders, shadows, gradients, and responsive structure passed visual review. |
| UI05 | pass | Tool/Blog directories have real categories, summaries, and actions; articles have sections and related tools; identity is not fabricated. |
| UI06 | pass | 744 Chrome states, 69 Chrome screenshots, 180 axe audits, 90 accessibility trees, 180 skip-link checks, and 69 Firefox screenshots are recorded in `visual-accessibility.md`. |
| UI07 | pass | No extra four-range grid appears above the tool on home or range pages; the four range links remain in the footer. |
| NAV01 | pass | English internal navigation is unprefixed and every generated internal destination resolves; `/en/` appears only as a legacy redirect source. |
| I18N06 | partial | English, Simplified Chinese, and Traditional Chinese route/content parity passed local review; independent named native-language sign-off is pending. |
| I18N07 | pass | Generated-page and interactive checks cover navigation, controls, validation, states, FAQ, articles, policies, metadata, footer, and accessible names. |
| I18N08 | pass | Equivalent language routes, unique canonicals, reciprocal/self hreflang, sitemap membership, and `zh-TW` language output validate. |
| I18N09 | pass | Menu width, localized names, unique current item, keyboard behavior, viewport containment, and real equivalent destinations pass. |
| I18N10 | pass | The 13-locale plan is preserved; only the three complete R1 locales are exposed. The other ten locales are not advertised or routed. |
| SE01 | pass | Static HTML includes readable headings, methods, limits, examples, and FAQs without requiring JavaScript. |
| SE02 | pass | Title, description, H1, task intent, parameter canonical behavior, and non-duplication rules pass route validation. |
| SE03 | pass | One sitemap contains only current indexable canonical pages, robots is aligned, and every canonical uses the live `https://www.pixeltokb.com` production origin. |
| SE04 | pass | Breadcrumb, WebApplication, and Article usage is constrained to accurate cases; no fake rating, credential, certification, or author is emitted. |
| SE05 | pass | Tool and guide related links resolve to actual localized generated pages. |
| CT01 | pass | Four guides × three locales contain real measurements, steps, limitations, sources, and PixelTokb review attribution; categories are non-empty. |
| CT02 | pass | Public output contains only the implemented static content; there is no public draft preview, executable MDX import path, or unpublished search entry. |
| I18N01 | pass | Unprefixed English and explicit Chinese routes build as static pages and do not automatically redirect. |
| I18N02 | pass | No locale negotiation Function, country rewrite, Accept-Language routing, or locale Cookie changes the root route. |
| I18N03 | pass | Default Light, explicit Dark/System, stored theme choice, stable English root, and upload-aware language-switch warning passed. |
| I18N04 | pass | Language links preserve equivalent routes and selected-file confirmation prevents silent loss. |
| I18N05 | pass / not applicable | Published locale hreflang and x-default rules pass; Arabic is intentionally unpublished, so RTL UI is not part of R1. |

## Advertising, usability, performance, and security

| ID | Status | Result and evidence |
|---|---|---|
| AD01 | pass | `adsMode=off`; no advertising or non-essential analytics request is included. |
| AD02 | pass | Live mode cannot be claimed without real readiness/CMP evidence; no fake verification meta or ads.txt authorization exists. |
| AD03 | not applicable | No ad slot is live in R1, so prohibited-page placement and accidental-click layout are absent. |
| AD04 | partial | Tools operate with advertising off and policies describe future refusal/withdrawal controls; real CMP controls require a selected certified provider. |
| UX01 | pass | 360/390/768/1366 px matrices show no horizontal overflow; the desktop tool first screen exposes upload and primary settings. |
| UX02 | partial | Keyboard focus, aria-live, skip links, crop controls, touch-capable pointer implementation, and download-without-login pass locally; real screen-reader/mobile-device checks remain pending. |
| PF01 | pass | Three Lighthouse 12.8.2 runs scored 100/100/100/100; median of every category is 100. Raw JSON is repository-resident. |
| PF02 | pass | All built JS is 96,983 gzip bytes; CSS is 6,973 gzip bytes; tested base transfer is 95,378 bytes. Limits are 180 KB JS and 500 KB base transfer. |
| PF03 | partial | Laboratory LCP median is 1,357.88 ms with CLS/TBT 0; production p75 LCP/INP/CLS requires real traffic and remains pending. |
| SC01 | pass | Processing is browser-local; static build has no upload endpoint/session replay; validation limits formats, containers, size/pixels, output names, and stale results. |
| SC02 | partial | Asset/dependency notices exist; audit has 0 critical/high/moderate and one low Windows-only development-server advisory. Production-secret and deployed-artifact checks remain pending. |
| BR01 | pending | Chrome and Firefox evidence exists; Safari automation, Edge, iOS Safari, and Android Chrome are unavailable as detailed in `cross-browser-download-alpha.md`. |

## Cloudflare and GitHub delivery

| ID | Status | Result and evidence |
|---|---|---|
| CF01 | pass | The published site, single `@kbresize/web` app, root build, `dist`, `SITE_ID=kb`, and `https://www.pixeltokb.com` production origin are aligned. |
| CF02 | pass | The local bundle is within the 18,000-file and 24 MiB limits; Cloudflare build `39d17f0a-ae4a-4172-b64c-9a6b17189a97` completed successfully, with the build command completing in 20.195 seconds. |
| CF03 | pass | Cloudflare deployed 106 static assets from `dist` with no Worker entry script, Functions, `_routes.json`, or runtime bindings. |
| CF04 | pass | Live production returns 200 for the root, 301 for the explicit legacy English prefix, and the generated custom 404 with status 404, without Functions or OAuth. |
| CF05 | partial | The Cloudflare zone is on the Free plan and the deployment reports no bindings; shared account request/build usage remains an operational account check. |
| CF06 | pass | Live HTTPS serves the configured security headers; `pixeltokb.com/*` redirects to `www` with a 301 while preserving path/query, `/en/` redirects once to `/`, and unknown paths return the custom 404. |
| CF07 | partial | Native Git integration builds `main`, preview builds are enabled with Access protection disabled, and deployment/version identity is captured; a real rollback exercise remains pending. |
| GH01 | pass | Cloudflare native Git integration is authorized to the public `DLBaoFu/pixeltokb` repository and production tracks `main`. |
| GH02 | pass | Commit `78ae484` on `main` triggered successful Cloudflare build `39d17f0a-ae4a-4172-b64c-9a6b17189a97`, version `06841a4a-54f7-4134-9a7b-354de7ad61d0`, published at the Worker URL and `https://www.pixeltokb.com`. |
| GH03 | partial | Local `pnpm build` runs type, lint, unit, route, redirect, release, and budget gates; Cloudflare failure-to-publish behavior is not yet observed. |
| GH04 | partial | Source excludes `dist`, secrets, and R1 Functions; actual branch control and a Git-revert deployment recovery remain pending. |

## Release decision

R1 is published at `https://www.pixeltokb.com`. The remaining next-version evidence set is Safari/Edge/iOS/Android BR01 coverage; named external native-language review; Cloudflare shared-usage monitoring; and a real rollback exercise. KB08 metadata/color evidence is now locally passed by the dedicated browser fixture run. The eight identity/policy/editorial page families and the contact inbox are no longer R1 blockers after operator confirmation. `pnpm check:release` now reports only the intentionally deferred cross-browser category; deferred evidence is not defaulted to pass.
