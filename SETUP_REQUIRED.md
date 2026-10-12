# Setup required

The local R1 build has a supplied publisher identity and the configured origin `https://www.pixeltokb.com`, but the live deployment and advertising configuration are not yet verified. Before a production deployment, provide and verify:

- Confirm the live HTTPS response, canonical host, and www/non-www redirect behavior for `https://www.pixeltokb.com`; the repository is `DLBaoFu/pixeltokb`.
- Operator and named reviewer are configured as `PixelTokb`.
- The requested contact address is configured exactly as `Support@piexltokb.com`. The 2026-10-12 local check returned no MX answer; local A/AAAA answers were proxy-reserved synthetic addresses and are not production DNS evidence. Configure authoritative DNS and mail delivery, test a real inbound message, preserve the evidence, then set `contactEmailVerified` to `true`.
- Cloudflare Pages project access; keep `SITE_ORIGIN=https://www.pixeltokb.com` in the production environment.
- Set `BUILD_FOR_RELEASE=1` in the production Pages environment. `pnpm build` stays usable locally, while Cloudflare Pages' `CF_PAGES=1` also triggers the same release gate even if the custom flag is accidentally omitted.
- Every `config/release-evidence.json` entry now points to a repository evidence file. Do not change a remaining `pending` status merely to make the gate pass: close KB08 from post-export metadata evidence, and close cross-browser coverage only after Safari, Edge, iOS Safari, and Android Chrome are actually exercised.
- Enable Safari Settings → Developer → Allow remote automation for Safari WebDriver acceptance. Install or provide Edge and trusted iOS Safari/Android Chrome test environments before marking BR01 complete.
- A Google-certified consent platform, preference-revocation entry, privacy disclosures and verified AdSense values, only if advertising is approved

Advertising remains off and the configured origin is not claimed as a verified live deployment until those checks pass.
