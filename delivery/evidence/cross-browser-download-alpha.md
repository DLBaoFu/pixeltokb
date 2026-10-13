# Cross-browser download and alpha status

Status: **pending for BR01**; completed and blocked environments are explicitly recorded.

R1 disposition (2026-10-13): deferred to the next version. The unavailable browser/device environments are not treated as passed by assumption.

Completed:

- Chrome 154: full local visual/DOM matrix, accessibility audits, image-tool interaction, saved downloads, MIME/signature checks, alpha and JPEG background checks.
- Firefox 152: 69 representative whole-page screenshots; earlier real JPEG download and rejection-path checks; visible cross-browser layout review.

Not completed:

- Safari 18.4: installed, but WebDriver session creation is blocked until Safari Settings → Developer → Allow remote automation is enabled.
- Microsoft Edge: not installed on the test computer.
- iOS Safari and Android Chrome: no physical device or trusted device service was available.

Local source evidence: `artifacts/2026-10-12-release-signoff/evidence.md` and `artifacts/2026-10-11-image-e2e/evidence.md`. The missing environments prevent a BR01 pass; Chrome or Firefox is not used as a substitute.
