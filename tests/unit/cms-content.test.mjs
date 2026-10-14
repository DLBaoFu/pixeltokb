import assert from 'node:assert/strict';
import test from 'node:test';
import { allLocales } from '../../src/lib/locales.ts';
import { articleToMarkdown, cmsArticlePath, isCmsLocale, isCmsSlug, validateCmsArticle } from '../../src/lib/cms-content.ts';
import { cmsEditableLocales, localeReleasePlan } from '../../src/lib/locale-release.ts';

const validArticle = {
  slug: 'jpeg-to-webp-case-study',
  locale: 'en',
  title: 'A reproducible JPEG to WebP comparison',
  description: 'A browser-only comparison with the source file and output bytes recorded.',
  category: 'Compression',
  publishedAt: '2026-10-14',
  status: 'draft',
  body: '# What changed\n\nThe source file stays on the device.'
};

test('CMS article validation accepts a bounded draft and serializes JSON-safe frontmatter', () => {
  const result = validateCmsArticle(validArticle);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.article.slug, validArticle.slug);
  const markdown = articleToMarkdown(result.article);
  assert.match(markdown, /^---\nslug: "jpeg-to-webp-case-study"/);
  assert.match(markdown, /status: "draft"\n---/);
  assert.match(markdown, /The source file stays on the device\./);
});

test('CMS article validation rejects unsafe identity, dates and oversized fields', () => {
  const result = validateCmsArticle({ ...validArticle, slug: '../article', publishedAt: '14-10-2026', title: 'x'.repeat(121) });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errors.length, 3);
});

test('CMS paths and locale allowlist cover preparation languages without publishing them', () => {
  assert.equal(allLocales.length, 13);
  assert.equal(cmsEditableLocales.length, allLocales.length);
  assert.equal(isCmsLocale('es'), true);
  assert.equal(isCmsLocale('xx'), false);
  assert.equal(isCmsSlug('real-image-case-2026'), true);
  assert.equal(isCmsSlug('Upper Case'), false);
  assert.equal(cmsArticlePath('pt-br', 'real-image-case-2026'), 'content/blog/pt-br/real-image-case-2026.md');
  assert.deepEqual(localeReleasePlan.filter((entry) => entry.state === 'published').map((entry) => entry.locale), ['en', 'zh-cn', 'zh-tw']);
  assert.equal(localeReleasePlan.filter((entry) => entry.state !== 'published').length, 10);
});
