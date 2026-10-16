import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { includedInCurrentBuild } from '../../src/lib/current-routes.mjs';
import { hasSeoKeywordProfile, seoKeywords } from '../../src/lib/seo.ts';

test('exact-size compression routes expose only supported target keywords', () => {
  const small = seoKeywords('/compress-image/', 'en', 'Compress images to a target size');
  for (const term of ['resize image to exact KB', 'compress image to 20KB', 'compress image to 50KB', 'compress image to 100KB']) assert.match(small, new RegExp(term, 'i'));
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

test('every route in the current public build has an explicit localized keyword profile', async () => {
  const registry = JSON.parse(await readFile(new URL('../../kbresize-dev-package/routes.json', import.meta.url), 'utf8'));
  const routes = registry.sites[0].routes.filter(includedInCurrentBuild);
  const locales = /** @type {const} */ (['en', 'zh-cn', 'zh-tw']);
  assert.equal(routes.length, 39);
  for (const route of routes) {
    assert.equal(hasSeoKeywordProfile(route.path), true, `${route.path} is missing an exact SEO keyword profile`);
    for (const locale of locales) {
      const title = locale === 'en' ? 'Page title' : locale === 'zh-cn' ? '页面标题' : '頁面標題';
      const keywords = seoKeywords(route.path, locale, title);
      assert.ok(keywords.split(', ').length >= 3, `${route.path} (${locale}) needs a focused keyword set`);
      assert.ok(keywords.length <= 100, `${route.path} (${locale}) exceeds the keyword length guard`);
    }
  }
});

test('blog articles, categories, and changelog expose distinct matching intent', () => {
  const fifty = seoKeywords('/blog/why-image-wont-fit-50kb/', 'en', 'Why an image may not fit a 50 KB limit');
  const hundred = seoKeywords('/blog/compress-image-to-100kb/', 'en', 'Compress an image to 100 KB for an upload');
  const tutorials = seoKeywords('/blog/category/tutorials/', 'en', 'Image tutorials');
  const changelog = seoKeywords('/changelog/', 'en', 'PixelTokb product changelog');
  assert.match(fifty, /compress image to 50KB/i);
  assert.match(hundred, /compress image to 100KB/i);
  assert.match(tutorials, /image compression tutorials/i);
  assert.match(changelog, /product updates.*new image tools.*image tool improvements/i);
  assert.notEqual(fifty, hundred);
});

test('future CMS articles retain their own title and a safe blog fallback', () => {
  const keywords = seoKeywords('/blog/new-cms-article/', 'en', 'A unique CMS article title');
  assert.match(keywords, /^A unique CMS article title, image guide, image compression guide/);
  assert.ok(keywords.length <= 100);
});
