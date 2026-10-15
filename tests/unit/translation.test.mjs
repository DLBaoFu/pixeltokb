import assert from 'node:assert/strict';
import test from 'node:test';
import { articleTranslationFields, languageCode, translatedArticle } from '../../src/lib/translation.ts';

/** @type {import('../../src/lib/cms-content.ts').CmsArticleDraft} */
const source = {
  slug: 'real-image-workflow', locale: 'en', title: 'Compress an image', description: 'A practical image workflow.', category: 'Compression basics', publishedAt: '2026-10-14', status: 'published', body: '# Steps\n\nKeep the [tool](/compress-image/) open.',
  render: { articleId: 'real-image-workflow', sourceLocale: 'en', readMinutes: 4, categorySlug: 'tutorials', workflow: { situation: 'A real browser run.', steps: [['Open tool', 'Choose a file.']], image: 'compress-20kb', caption: 'A saved result.', links: [['Open', '/compress-image/']] }, example: { heading: 'Example', rows: [['Result', '6,364 bytes']], note: 'Read the saved file again.' }, sources: [['Method', 'A browser run.']] }
};

test('Google translation adapter exposes locale codes and structured fields without changing URLs', () => {
  assert.equal(languageCode('zh-cn'), 'zh-CN');
  const keys = articleTranslationFields(source).map((field) => field.key);
  assert.ok(keys.includes('title'));
  assert.ok(keys.includes('body'));
  assert.ok(keys.includes('render.workflow.links.0.0'));
  const translated = translatedArticle(source, 'zh-cn', { fields: Object.fromEntries(articleTranslationFields(source).map((field) => [field.key, `译文 ${field.value}`])), warnings: [] });
  assert.equal(translated.slug, source.slug);
  assert.equal(translated.status, 'needs-review');
  assert.equal(translated.locale, 'zh-cn');
  assert.equal(translated.render?.workflow.links[0][0], '译文 Open');
  assert.equal(translated.render?.workflow.links[0][1], '/compress-image/');
});

test('translated sources keep the original translation group identity', () => {
  const sourceRender = source.render;
  if (!sourceRender) throw new Error('Fixture render data is required.');
  /** @type {import('../../src/lib/cms-content.ts').CmsArticleDraft} */
  const sourceTranslation = { ...source, locale: 'zh-cn', render: { ...sourceRender, sourceLocale: 'en', translationOf: 'real-image-workflow' } };
  const translated = translatedArticle(sourceTranslation, 'zh-tw', { fields: Object.fromEntries(articleTranslationFields(sourceTranslation).map((field) => [field.key, field.value])), warnings: [] });
  assert.equal(translated.render?.translationOf, 'real-image-workflow');
  assert.equal(translated.render?.sourceLocale, 'en');
});
