# CMS sitemap contract

`https://www.pixeltokb.com/sitemap.xml` is the only public sitemap URL. It always keeps the build-generated, already-published PixelTokb URLs and may merge newly published CMS articles at request time.

When the CMS is ready, set the Cloudflare Worker text variable `CMS_SITEMAP_URL` to its public HTTPS sitemap endpoint. That endpoint must return a standard XML `<urlset>` containing only final, indexable `https://www.pixeltokb.com/.../` canonical article URLs, including each published language version where available.

The public sitemap deduplicates URLs and never removes or rewrites the existing static URLs. It ignores a CMS response that is unavailable, larger than 1 MB, invalid, non-HTTPS, off-origin, query-based, or fragment-based, so a CMS outage cannot make the existing sitemap unavailable. New CMS posts appear on the next sitemap request without a website rebuild or deployment.

CMS publishing must add an article to its own sitemap only after the canonical article page is public and indexable. Unpublished drafts, redirects, preview URLs, noindex pages, and non-canonical aliases must not be emitted.
