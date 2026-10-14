import assert from 'node:assert/strict';
import test from 'node:test';
import { seoKeywords } from '../../src/lib/seo.ts';

test('exact-size compression routes expose only supported target keywords', () => {
  const small = seoKeywords('/compress-image/', 'en', 'Compress images to a target size');
  for (const term of ['image compressor', 'compress image 10 KB 5 MB', 'JPG PNG WebP compressor']) assert.match(small, new RegExp(term, 'i'));
  assert.ok(small.length <= 100);
  assert.doesNotMatch(small, /AVIF|GIF|HEIC|TIFF|batch|lossless/i);
});

test('resize, crop, signature, size, and DPI routes use matching search intent', () => {
  const cases = /** @type {Array<[string, RegExp]>} */ ([
    ['/resize-image/', /image resizer.*resize image online.*resize image in pixels/i],
    ['/crop-image/', /image cropper.*crop image online.*crop image by pixels/i],
    ['/signature-resizer/', /signature resizer.*resize signature image.*signature image size/i],
    ['/signature-compressor/', /signature compressor.*compress signature image.*reduce signature image size/i],
    ['/aspect-ratio-calculator/', /aspect ratio calculator.*image aspect ratio.*calculate image dimensions/i],
    ['/ppi-calculator/', /PPI calculator.*pixels per inch calculator.*print size resolution/i],
    ['/photo-resizer/', /photo resizer.*photo size in mm.*photo size in inches/i],
    ['/image-size-checker/', /image size checker.*image dimensions checker.*image resolution checker/i],
    ['/image-dpi-checker/', /DPI checker.*image DPI checker.*check image DPI/i]
  ]);
  for (const [path, pattern] of cases) {
    const keywords = seoKeywords(path, 'en', 'Tool title');
    assert.match(keywords, pattern);
    assert.ok(keywords.length <= 100);
  }
});

test('PNG optimizer keywords describe only the verified lossless PNG path', () => {
  const keywords = seoKeywords('/compress-png/', 'en', 'Lossless PNG optimizer');
  assert.match(keywords, /lossless PNG compressor.*batch PNG optimizer/i);
  assert.doesNotMatch(keywords, /target size|JPEG|WebP|quantization/i);
  assert.ok(keywords.length <= 100);
});
