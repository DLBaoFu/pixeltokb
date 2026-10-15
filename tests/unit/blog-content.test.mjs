import assert from 'node:assert/strict';
import test from 'node:test';
import { guides } from '../../src/lib/guide-content.ts';
import { blogGuides, blogRouteSlugs, blogWorkflow } from '../../src/lib/blog-content.ts';
import { guideWorkflows } from '../../src/lib/guide-workflows.ts';

test('CMS compatibility layer keeps every legacy guide first and unchanged', () => {
  /** @type {Array<'en' | 'zh-cn' | 'zh-tw'>} */
  const locales = ['en', 'zh-cn', 'zh-tw'];
  for (const locale of locales) {
    const merged = blogGuides(locale);
    assert.deepEqual(merged.slice(0, guides[locale].length).map(({ slug }) => slug), guides[locale].map(({ slug }) => slug));
    assert.ok(blogRouteSlugs(locale).includes(guides[locale][0].slug));
    assert.deepEqual(blogWorkflow(locale, guides[locale][0].slug), guideWorkflows[locale][guides[locale][0].slug]);
  }
});
