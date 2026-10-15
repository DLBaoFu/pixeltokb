import test from 'node:test';
import assert from 'node:assert/strict';
import { mergedCanvasSize } from '../../src/lib/photo-signature-merge.ts';

test('merged canvas keeps both images in vertical and horizontal layouts', () => {
  assert.deepEqual(mergedCanvasSize({ width: 600, height: 800 }, { width: 300, height: 120 }, 'vertical'), { width: 600, height: 920 });
  assert.deepEqual(mergedCanvasSize({ width: 600, height: 800 }, { width: 300, height: 120 }, 'horizontal'), { width: 900, height: 800 });
});

test('merged canvas rejects unknown layouts', () => {
  assert.throws(() => mergedCanvasSize({ width: 10, height: 10 }, { width: 10, height: 10 }, /** @type {any} */ ('diagonal')), /INVALID_MERGE_LAYOUT/);
});
