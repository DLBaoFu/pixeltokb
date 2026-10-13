# Image fixture E2E status

Status: **pending for the complete KB01–KB12 release category**; substantial local evidence exists and is not empty.

R1 disposition (2026-10-13): deferred to the next version. This is not marked pass without the missing metadata/color evidence.

Passed locally through the visible browser UI: static JPEG/PNG/WebP signature validation, JPEG/WebP 20/50/100 KB output checks, actual saved file bytes and signatures, unreachable-target failure, animation/corrupt/20 MB/40 MP rejection, cancellation and subsequent recovery, stale-result clearing, output MIME and extension, alpha preservation and JPEG background flattening, ratio lock, Fit/Fill/Stretch, exact Crop, size/alpha inspection, DPI-missing display, all four compression ranges, unit conversion, and dynamic FAQ values.

Primary evidence: `artifacts/2026-10-11-image-e2e/evidence.md` and `artifacts/2026-10-11-kb05/evidence.md`. The former records download hashes and decoded pixel/dimension results.

Open item: KB08 still needs purpose-built EXIF-orientation and GPS/EXIF fixtures, post-export metadata re-read, and a verified color-profile/sRGB result. Because KB08 is not proven, this release-evidence category remains pending.
