# Setup required

The R1 site is live at `https://www.pixeltokb.com`, and its source repository is `DLBaoFu/pixeltokb`. The remaining external acceptance and optional advertising items are:

- Operator and named reviewer are configured as `PixelTokb`.
- The requested contact address is configured exactly as `Support@piexltokb.com`. The 2026-10-12 local check returned no MX answer; local A/AAAA answers were proxy-reserved synthetic addresses and are not production DNS evidence. Configure authoritative DNS and mail delivery, test a real inbound message, preserve the evidence, then set `contactEmailVerified` to `true`.
- Retain Cloudflare Workers access and the native Git connection to `DLBaoFu/pixeltokb` on `main`. The production origin is already version-controlled as `https://www.pixeltokb.com`; this static Worker requires no runtime environment variables or secrets.
- Do not set `BUILD_FOR_RELEASE=1` or `CF_PAGES=1` merely to deploy the current Worker. Those flags intentionally invoke the stricter evidence gate and should be used only when every remaining external acceptance item is genuinely closed.
- Every `config/release-evidence.json` entry now points to a repository evidence file. Do not change a remaining `pending` status merely to make the gate pass: close KB08 from post-export metadata evidence, and close cross-browser coverage only after Safari, Edge, iOS Safari, and Android Chrome are actually exercised.
- Enable Safari Settings → Developer → Allow remote automation for Safari WebDriver acceptance. Install or provide Edge and trusted iOS Safari/Android Chrome test environments before marking BR01 complete.
- Monitor shared Cloudflare Free-plan usage and perform a documented production rollback exercise before marking CF05/CF07/GH04 fully complete.
- A Google-certified consent platform, preference-revocation entry, privacy disclosures and verified AdSense values, only if advertising is approved

Advertising remains off until its separate advertising checks pass. This does not change the live status of the production website.
