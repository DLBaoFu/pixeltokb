import test from 'node:test';
import assert from 'node:assert/strict';
import { addJpegCommentPadding } from '../../src/lib/jpeg-padding.ts';

test('JPEG comment padding reaches the exact requested byte count', () => {
  const source = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const output = addJpegCommentPadding(source, 70_000);
  assert.equal(output.byteLength, 70_000);
  assert.deepEqual(Array.from(output.slice(0, 2)), [0xff, 0xd8]);
  assert.equal(output[2], 0xff);
  assert.equal(output[3], 0xfe);
});

test('padding rejects a smaller or too-close target', () => {
  const source = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  assert.throws(() => addJpegCommentPadding(source, 3), /TARGET_UNREACHABLE/);
  assert.throws(() => addJpegCommentPadding(source, 8), /TARGET_UNREACHABLE/);
  assert.throws(() => addJpegCommentPadding(new Uint8Array([1, 2, 3, 4]), 20), /FORMAT_UNSUPPORTED/);
});
