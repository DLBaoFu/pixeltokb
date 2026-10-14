# R1 browser image fixtures

These are synthetic, locally generated test images, not claims about real photos or tutorial output. Use them for repeatable browser checks; editorial tutorial examples still need a reviewed real-world source and recorded actual output bytes.

| File | Purpose |
|---|---|
| `opaque-gradient.jpg` | Opaque JPEG decode/encode and byte budget |
| `alpha-shapes.png` | Transparent PNG; corner alpha must remain zero when exported as PNG or WebP |
| `textured.webp` | WebP input and re-encoding |
| `corrupt.png` | Decode error; must not create a result or download |
| `unoptimized-alpha.png` | Deliberately unoptimized RGBA PNG for the R2 pixel-identical optimization and saved-file checks |

The three image files were generated with ImageMagick 7 using 320×240 gradients/vector shapes/plasma, without user content. Browser E2E should record browser/version, target, format, output Blob bytes, decoded output dimensions, MIME, alpha corner, and downloaded file. These fields are not inferred from this README.
