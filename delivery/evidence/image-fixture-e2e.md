# Image fixture E2E status

Status: **pass for the complete local KB01–KB12 image fixture category**; production and the separate cross-browser category remain outside this record.

R1 disposition (2026-10-13): the metadata/color evidence was deferred at the time. It is now closed by the dedicated browser run recorded below.

Passed locally through the visible browser UI: static JPEG/PNG/WebP signature validation, JPEG/WebP 20/50/100 KB output checks, actual saved file bytes and signatures, unreachable-target failure, animation/corrupt/20 MB/40 MP rejection, cancellation and subsequent recovery, stale-result clearing, output MIME and extension, alpha preservation and JPEG background flattening, ratio lock, Fit/Fill/Stretch, exact Crop, size/alpha inspection, DPI-missing display, all four compression ranges, unit conversion, and dynamic FAQ values.

Primary evidence: `artifacts/2026-10-11-image-e2e/evidence.md` and `artifacts/2026-10-11-kb05/evidence.md`. The former records download hashes and decoded pixel/dimension results.

KB08 closure (2026-10-14): `pnpm check:image-fixtures /tmp/pixeltokb-image-fixture-e2e.json` ran against the local static preview in Headless Chrome 155. A generated 320×240 JPEG containing EXIF orientation 6 and GPS latitude/longitude was uploaded through `/compress-image/`; the browser result was 240×320, the MIME was `image/jpeg`, and both the Blob and saved download were re-read with no EXIF, GPS, or orientation tag. The browser-managed JPEG output reported an ICC marker; no claim is made that it preserves a source color profile. A generated PNG containing the real macOS Display P3 ICC profile in an `iCCP` chunk was uploaded through `/compress-png/`; the saved result was 320×240 with alpha, no private metadata chunks or `iCCP`, and an explicit `sRGB` chunk. Raw output is in `delivery/evidence/image-fixture-e2e.json`.

This closes the local KB08 evidence without claiming a particular third-party color-management result. Safari/Edge/iOS/Android coverage remains the separate `crossBrowserDownloadAndAlpha` record and was intentionally not changed in this run.
