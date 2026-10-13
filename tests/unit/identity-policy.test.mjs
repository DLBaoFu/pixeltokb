import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(await readFile(new URL('../../config/site.json', import.meta.url), 'utf8'));
const foundation = await readFile(new URL('../../src/components/FoundationContent.astro', import.meta.url), 'utf8');
const guideArticle = await readFile(new URL('../../src/components/GuideArticle.astro', import.meta.url), 'utf8');
const authorPages = await Promise.all([
  '../../src/views/en/authors/editor.astro',
  '../../src/pages/zh-cn/authors/editor.astro',
  '../../src/pages/zh-tw/authors/editor.astro'
].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));

test('supplied operator and exact contact address remain explicit', () => {
  assert.equal(config.operator, 'PixelTokb');
  assert.equal(config.contactEmail, 'support@pixeltokb.com');
  assert.equal(config.contactEmailVerified, true);
  assert.equal(config.adsMode, 'off');
  assert.equal(config.cmsEnabled, false);
});

test('policy pages describe only current storage and conditional future advertising', () => {
  assert.match(foundation, /Advertising and non-essential analytics are currently off/);
  assert.match(foundation, /Google-certified consent platform/);
  assert.match(foundation, /policies\.google\.com\/technologies\/partner-sites/);
  assert.match(foundation, /adssettings\.google\.com/);
  assert.doesNotMatch(foundation, /<form\b/i);
});

test('guide pages focus on practical browser use rather than editorial-status copy', () => {
  assert.match(guideArticle, /Do this in the browser/);
  assert.match(guideArticle, /blog-workflows/);
  assert.doesNotMatch(guideArticle, /Editorial status|Reviewed by the PixelTokb editorial team|review-status/);
  for (const page of authorPages) {
    assert.match(page, /PixelTokb/);
    assert.match(page, /siteConfig\.contactEmail/);
  }
});
