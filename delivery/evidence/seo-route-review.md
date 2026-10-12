# SEO and route review

Status: **pass for repository, final static output, and the live production origin**. Captured account-level response evidence is tracked separately.

- `pnpm build` produces 91 HTML pages: 90 registered localized R1 routes plus 404.
- English canonical routes are unprefixed; Simplified Chinese and Traditional Chinese use `/zh-cn/` and `/zh-tw/`.
- The generated route validator checks title, description, one H1, canonical, reciprocal hreflang, robots directives, internal destinations, localized route parity, and visible release-copy rules.
- `dist/sitemap.xml` is the only sitemap and contains 45 currently indexable canonical URLs. Pages held for production identity/editorial activation remain `noindex` and outside the sitemap.
- `public/_redirects` contains 71 explicit one-hop 301 rules. The redirect validator rejects duplicates, self-redirects, chains, missing targets, and alias mismatches.
- Unknown routes use localized 404 content and `noindex`.

Commands: `pnpm build`, `node scripts/validate-routes.mjs`, `node scripts/validate-redirects.mjs`.

Boundary: `https://www.pixeltokb.com` is the live canonical production host. A captured response-header, cache, and crawler evidence bundle remains an account-level acceptance item.
