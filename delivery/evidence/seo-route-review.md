# SEO and route review

Status: **pass for repository, final static output, and the live production origin**. Captured account-level response evidence is tracked separately.

- `pnpm build` produces 91 HTML pages: 90 registered localized R1 routes plus 404.
- English canonical routes are unprefixed; Simplified Chinese and Traditional Chinese use `/zh-cn/` and `/zh-tw/`.
- The generated route validator checks unique indexable title/description values per locale, focused route keywords, PixelTokb authorship, one H1, canonical, reciprocal hreflang, complete robots directives, Open Graph/Twitter metadata, internal destinations, localized route parity, and visible release-copy rules.
- `dist/sitemap.xml` is the only sitemap and contains 45 currently indexable canonical URLs. Every entry has a registered relative priority: home `1.0`, tools `0.9`, categories `0.8`, and indexable information pages `0.7`. Pages held for production identity/editorial activation remain `noindex` and outside the sitemap.
- `robots.txt` permits general crawlers and explicitly allows Googlebot, Bingbot, OAI-SearchBot, GPTBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, and Claude-User. Sitemap discovery uses the absolute production URL.
- The English resize, crop, size-checker, and DPI-checker routes have dedicated titles and descriptions rather than inherited compression metadata.
- Production deployment `ea421c0b-fdda-43ca-827d-cfaecffb1403` for source commit `7c729e1` passed a post-deploy crawl on 2026-10-12. The live sitemap returned `application/xml` and 45 URLs: 3 at 1.0, 24 at 0.9, 9 at 0.8, and 9 at 0.7. Browser, Googlebot, OAI-SearchBot, and Claude-SearchBot requests each checked all 45 URLs; every response was 200, self-canonical, indexable, and contained description plus keywords. There were zero failures.
- `public/_redirects` contains 71 explicit one-hop 301 rules. The redirect validator rejects duplicates, self-redirects, chains, missing targets, and alias mismatches.
- Unknown routes use localized 404 content and `noindex`.

Commands: `pnpm build`, `node scripts/validate-routes.mjs`, `node scripts/validate-redirects.mjs`, `node scripts/validate-browser-matrix.mjs`.

Boundary: `priority` and meta keywords are valid descriptive metadata, but Google documents that neither is a ranking factor. The live checks prove technical crawl eligibility, not that an external search engine has already indexed or ranked every URL; those decisions remain with each search engine.
