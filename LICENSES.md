# Asset and dependency notices

This file records the assets shipped by pixeltokb and the dependency-license review required for delivery.

## Site assets

| Asset | Location | Source and permission |
|---|---|---|
| Site mark | `public/favicon.svg` | Original geometric mark created for pixeltokb. Copyright PixelTokb. |
| JPEG fixture | `tests/fixtures/images/opaque-gradient.jpg` | Programmatically generated for this repository. Copyright PixelTokb; test use within the project is permitted. |
| PNG fixtures | `tests/fixtures/images/alpha-shapes.png`, `corrupt.png` | Programmatically generated for this repository. Copyright PixelTokb; test use within the project is permitted. `corrupt.png` is intentionally invalid test data. |
| WebP fixture | `tests/fixtures/images/textured.webp` | Programmatically generated for this repository. Copyright PixelTokb; test use within the project is permitted. |
| Screenshots and downloaded outputs | `artifacts/` | Generated from this repository and its original fixtures for verification. They are internal acceptance evidence and are not included in `dist/`. |
| Fonts | none bundled | The site uses the visitor's system sans-serif stack; no webfont file is distributed. |
| Icons | none bundled | Controls use text, CSS, or Unicode characters; no third-party icon pack is distributed. |
| Emoji | none bundled | Any Unicode emoji is rendered by the visitor's operating system; no emoji image set is distributed. |

No stock photo, competitor screenshot, remote image, user upload, or third-party demo image is included in the public build.

## Software dependencies

The authoritative versions are locked in `pnpm-lock.yaml`. The production dependency license inventory is reproducible with:

```sh
pnpm licenses list --prod --json
```

The 2026-10-12 inventory reported MIT, Apache-2.0, LGPL-3.0-or-later, ISC, BlueOak-1.0.0, BSD-2-Clause, BSD-3-Clause, MPL-2.0, and CC0-1.0 packages. Direct runtime packages are Astro, the Astro React integration, React, and React DOM; their package metadata reports MIT licenses. Transitive packages retain their own copyright and license notices in the installed packages. This summary is not a replacement for those license texts.
