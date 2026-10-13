import assert from 'node:assert/strict';
import test from 'node:test';
import { seoKeywords } from '../../src/lib/seo.ts';

test('exact-size compression routes expose only supported target keywords', () => {
  const small = seoKeywords('/compress-image/', 'en', 'Compress image to 10–100 KB');
  for (const term of ['image compressor', 'compress image online', 'compress image to exact size', 'compress image to 10–100 KB']) assert.match(small, new RegExp(term, 'i'));
  assert.ok(small.length <= 100);
  assert.doesNotMatch(small, /AVIF|GIF|HEIC|TIFF|batch|lossless/i);

  const large = seoKeywords('/compress-image-2mb-to-5mb/', 'en', 'Compress image to 2–5 MB');
  for (const term of ['compress image to 2MB', 'compress image to 5MB']) assert.match(large, new RegExp(term, 'i'));
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
