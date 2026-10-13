import assert from 'node:assert/strict';
import test from 'node:test';
import { seoKeywords } from '../../src/lib/seo.ts';

test('exact-size compression routes expose only supported target keywords', () => {
  const small = seoKeywords('/compress-image/', 'en', 'Compress images to a target size');
  for (const term of ['image compressor', 'compress image 10 KB 5 MB', 'JPG PNG WebP compressor']) assert.match(small, new RegExp(term, 'i'));
  assert.ok(small.length <= 100);
  assert.doesNotMatch(small, /AVIF|GIF|HEIC|TIFF|batch|lossless/i);
});

test('resize, crop, size, and DPI routes use matching search intent', () => {
  const cases = /** @type {Array<[string, RegExp]>} */ ([
    ['/resize-image/', /image resizer.*resize image online.*resize image in pixels/i],
    ['/crop-image/', /image cropper.*crop image online.*crop image by pixels/i],
    ['/image-size-checker/', /image size checker.*image dimensions checker.*image resolution checker/i],
    ['/image-dpi-checker/', /DPI checker.*image DPI checker.*check image DPI/i]
  ]);
  for (const [path, pattern] of cases) {
    const keywords = seoKeywords(path, 'en', 'Tool title');
    assert.match(keywords, pattern);
    assert.ok(keywords.length <= 100);
  }
});
