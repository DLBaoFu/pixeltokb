import assert from 'node:assert/strict';
import test from 'node:test';
import { guides } from '../../src/lib/guide-content.ts';

const expectedSlugs = [
  'check-image-size-and-dpi',
  'compress-image-to-100kb',
  'compress-without-changing-dimensions',
  'kb-vs-kib',
  'why-image-wont-fit-50kb'
];

test('every published locale has the same complete guide set', () => {
  for (const [locale, items] of Object.entries(guides)) {
    assert.deepEqual(items.map((item) => item.slug).sort(), expectedSlugs, `${locale} guide routes`);
    for (const guide of items) {
      assert.ok(guide.title.length >= 10, `${locale}/${guide.slug} title`);
      assert.ok(guide.intro.length >= 25, `${locale}/${guide.slug} intro`);
      assert.ok(guide.sections.length >= 3, `${locale}/${guide.slug} sections`);
      assert.ok(guide.example.rows.length >= 3, `${locale}/${guide.slug} example rows`);
      assert.ok(guide.example.note.length >= 30, `${locale}/${guide.slug} example note`);
      assert.ok(guide.sources.length >= 2, `${locale}/${guide.slug} sources`);
    }
  }
});

test('guide examples retain the verified acceptance measurements', () => {
  const english = JSON.stringify(guides.en);
  for (const value of ['6,364', '23,906', '75,000', '73.2421875', '320 × 240', '160 × 120']) {
    assert.match(english, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
