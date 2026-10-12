# R1 acceptance report

Checked 2026-10-12 on macOS against the final local static build. Status vocabulary: **pass** means the stated local acceptance was actually exercised; **partial** means the local portion passed but a named external or production check remains; **pending** means required evidence is unavailable; **not applicable** means the capability is intentionally unpublished in R1. Evidence summaries are in `delivery/evidence/`; raw browser artifacts remain in the local `artifacts/` tree.

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
| KB08 | pending | EXIF orientation, GPS/EXIF stripping, and color-profile/sRGB behavior still require dedicated fixtures and post-export metadata re-read. |
| KB09 | pass | 20 MB, 40 MP, corrupt, animation, timeout, cancel, Worker termination, and recovery paths were exercised with no stale download. |
| KB10 | pass | Repeated selection, setting changes, cancellation, invalid replacement, reset, output filename, MIME, signature, and stale-result invalidation passed. |
| KB11 | pass | Four range pages expose the required presets, defaults, custom ranges, and KB/MB defaults in all three locales; no personal public result URL exists. |
| KB12 | pass | Pages share one component/Worker, enforce exact range boundaries, preserve the shared 500 KB boundary without duplicate URLs, and synchronize units/FAQ/results. |
| PG01 | partial | All 30 route families × 3 locales have substantive content and non-empty categories; 15 identity/policy/Blog families remain noindex until external publication prerequisites are verified. |
| PG02 | partial | Local 404 and 71 explicit single-hop redirects pass validation on the published site; a captured production status/cache evidence bundle remains outstanding. |
| PG03 | partial | PixelTokb identity, real page copy, and the live `https://www.pixeltokb.com` production origin pass; `Support@piexltokb.com` inbound delivery evidence remains outstanding. |

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
| CF02 | partial | The generated local report passes the 18,000-file, 24 MiB single-asset, and 15-minute full-build limits; deployed build duration is pending. |
| CF03 | partial | Source/output are static with no Functions or `_routes.json`; deployed Cloudflare runtime confirmation is pending. |
| CF04 | partial | Local root and explicit locale pages work without Functions and OAuth is absent; live HTTP behavior is pending. |
| CF05 | pending | Actual Workers Free account, shared request/build usage, and absence of paid bindings require Cloudflare account access. |
| CF06 | partial | `_headers`, 71 redirects, canonical English paths, and preview separation pass statically; live HTTPS/header/redirect behavior is pending. |
| CF07 | pending | Main-branch automatic build, preview controls, deployment identity, and real rollback require GitHub/Cloudflare configuration and authorization. |
| GH01 | partial | The public source repository is `DLBaoFu/pixeltokb`; Cloudflare Git-integration settings remain account-level evidence. |
| GH02 | partial | The authorized R1 source is pushed to `main` and the production URL is `https://www.pixeltokb.com`; a captured Cloudflare deployment ID mapped to the source SHA remains outstanding. |
| GH03 | partial | Local `pnpm build` runs type, lint, unit, route, redirect, release, and budget gates; Cloudflare failure-to-publish behavior is not yet observed. |
| GH04 | partial | Source excludes `dist`, secrets, and R1 Functions; actual branch control and a Git-revert deployment recovery remain pending. |

## Release decision

R1 is published at `https://www.pixeltokb.com`. The remaining acceptance set is: KB08 metadata/color evidence; real inbox delivery; activation of the 15 noindex identity/policy/Blog families; named external native-language review; Safari/Edge/iOS/Android BR01 coverage; and account-level Cloudflare deployment, source-SHA mapping, and rollback evidence. `pnpm check:release` must continue to report these items until they are genuinely completed; that stricter evidence gate does not describe the website as offline.
