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

const render = {
  articleId: 'jpeg-to-webp-case-study',
  sourceLocale: 'en',
  readMinutes: 5,
  categorySlug: 'tutorials',
  workflow: {
    situation: 'A reproducible browser run with a saved file.',
    steps: [['Choose the source', 'Read the input bytes.'], ['Set the target', 'Use the exact byte ceiling.']],
    image: 'compress-20kb',
    caption: 'The saved file was checked again.',
    links: [['Open the tool', '/compress-image/']]
  },
  example: {
    heading: 'Verified result',
    rows: [['Input', 'JPEG'], ['Output', '6,364 bytes']],
    note: 'The output was opened again.'
  },
  sources: [['Method', 'The file was processed locally and checked again.']]
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

test('published CMS articles require render data and serialize the shared template fields', () => {
  const incomplete = validateCmsArticle({ ...validArticle, status: 'published' });
  assert.equal(incomplete.ok, false);
  if (incomplete.ok) return;
  assert.match(incomplete.errors.join(' '), /complete rendering data/);
  const result = validateCmsArticle({ ...validArticle, status: 'published', render });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const markdown = articleToMarkdown(result.article);
  assert.match(markdown, /render: \{"articleId":"jpeg-to-webp-case-study"/);
  assert.match(markdown, /"categorySlug":"tutorials"/);
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
