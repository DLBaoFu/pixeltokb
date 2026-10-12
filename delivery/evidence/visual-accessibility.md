# Whole-site visual and accessibility evidence

Status: **pass for the required local Chrome whole-site gate**, with separately recorded real-device limits.

- Chrome 154: 30 route families × 3 locales × 4 viewports × Light/Dark, plus localized 404 checks; 744 states, 0 failures.
- 69 Chrome full-page screenshots spanning 23 page families and all three locales at 360, 390, 768, and 1366 px in both themes.
- axe-core 4.10.3: 90 routes × Light/Dark = 180 WCAG 2 A/AA, 2.1 AA, and 2.2 AA audits, 0 violations.
- 90 accessibility-tree checks and 180 skip-link keyboard checks, 0 failures.
- Firefox 152: 69 representative screenshots at mobile and desktop widths, reviewed through three locale contact sheets.
- Covered families: home; Tools index and categories; compression, resize, crop, size, and DPI tools; Blog index, categories, and articles; About, Contact, Privacy, Terms, Cookies, Editorial Policy, Changelog, Author; and 404.

Detailed evidence: `artifacts/2026-10-12-release-signoff/evidence.md`, `accessibility.json`, screenshot folders, and contact sheets.

Boundary: this local gate is not a claim of VoiceOver/NVDA, Safari/Edge, mobile-device, or production-network completion.
