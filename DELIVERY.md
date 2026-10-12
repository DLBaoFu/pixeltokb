# pixeltokb delivery

Delivery status: the implemented local R1 application, public copy, route set, and available acceptance evidence are packaged, with every open acceptance item explicitly recorded. Production publication is deliberately blocked until the remaining local and external items in `SETUP_REQUIRED.md` and `delivery/acceptance-report.md` are verified. A local pass is not represented as an online deployment pass.

## Included

- Astro static source for 30 route families in English, Simplified Chinese, and Traditional Chinese (90 registered localized routes), plus localized 404 output.
- Browser-only compression, resize, crop, size inspection, and DPI inspection tools.
- Four reviewed guides, Blog indexes/categories, About, Contact, Privacy, Terms, Cookies, Editorial Policy, Changelog, and Author pages.
- One sitemap, robots rules, static headers, and 71 explicit one-hop legacy redirects.
- Unit, route, redirect, browser-matrix, accessibility, release-gate, and delivery-budget scripts.
- Release evidence index, itemized acceptance report, Cloudflare budget report, delivery manifest, and asset/dependency notices.

## Reproduce the delivery

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm check:release
```

`pnpm build` generates the static site in `dist/`, validates routes and redirects, checks the local Cloudflare limits, writes `artifacts/cloudflare-budget-report.json`, and refreshes `delivery/delivery-manifest.json`. `pnpm check:release` is expected to fail until the real origin, mailbox delivery, remaining device/browser evidence, and production deployment evidence are supplied.

## Delivery map

| File | Purpose |
|---|---|
| `delivery/acceptance-report.md` | One status for every R1 acceptance ID, including pending boundaries. |
| `delivery/delivery-manifest.json` | Machine-readable file hashes, build-output summary, evidence map, and external blockers. |
| `delivery/evidence/` | Repository-resident evidence summaries used by the release gate. |
| `artifacts/cloudflare-budget-report.json` | Machine-readable local static-output budget report. |
| `LICENSES.md` | Public/test asset provenance and dependency-license review. |
| `SETUP_REQUIRED.md` | Exact production actions that cannot be completed locally. |

## Explicit exclusions

The delivery contains no production secrets, user images, database, contact-form backend, account system, enabled CMS, enabled advertising, Cloudflare API token, GitHub deployment workflow, or built `dist/` commit. Those capabilities are either intentionally absent from R1 or require real account configuration and verification.
