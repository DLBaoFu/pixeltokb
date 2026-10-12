import assert from 'node:assert/strict';
import test from 'node:test';
import { isPendingReview, normalizedContentPath } from '../../src/lib/publication.mjs';

test('pending editorial and identity pages are noindex in all published locales', () => {
  for (const prefix of ['', '/zh-cn', '/zh-tw']) {
    for (const path of ['/about/', '/contact/', '/privacy/', '/terms/', '/cookies/', '/editorial-policy/', '/changelog/', '/authors/editor/', '/blog/', '/blog/category/tutorials/', '/blog/category/troubleshooting/', '/blog/kb-vs-kib/']) {
      assert.equal(isPendingReview(`${prefix}${path}`), true, `${prefix}${path}`);
    }
    for (const path of ['/', '/tools/', '/compress-image/', '/resize-image/', '/how-it-works/']) {
      assert.equal(isPendingReview(`${prefix}${path}`), false, `${prefix}${path}`);
    }
  }
  assert.equal(normalizedContentPath('/zh-cn/about'), '/about/');
});
