// @ts-nocheck -- Node's File implementation has deliberately different stream typings from the DOM File type.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { File } from 'node:buffer';
import { ImageValidationError, validateImageFile } from '../../src/lib/image/file-validation.ts';
import { safeDownloadName } from '../../src/lib/image/download-name.ts';

const fixture = async (name, type) => new File([await readFile(new URL(`../fixtures/images/${name}`, import.meta.url))], name, { type });
const codeOf = async (promise) => {
  try { await promise; return null; }
  catch (error) { assert.ok(error instanceof ImageValidationError); return error.code; }
};

test('accepts static JPEG, PNG and WebP only when signatures match MIME', async () => {
  await validateImageFile(await fixture('opaque-gradient.jpg', 'image/jpeg'));
  await validateImageFile(await fixture('alpha-shapes.png', 'image/png'));
  await validateImageFile(await fixture('textured.webp', 'image/webp'));
  assert.equal(await codeOf(validateImageFile(await fixture('alpha-shapes.png', 'image/jpeg'))), 'FORMAT_UNSUPPORTED');
  assert.equal(await codeOf(validateImageFile(await fixture('opaque-gradient.jpg', 'image/png'))), 'FORMAT_UNSUPPORTED');
  assert.equal(await codeOf(validateImageFile(await fixture('corrupt.png', 'image/png'))), 'FORMAT_UNSUPPORTED');
});

test('rejects APNG before decoding', async () => {
  const original = new Uint8Array(await readFile(new URL('../fixtures/images/alpha-shapes.png', import.meta.url)));
  const firstChunkEnd = 8 + 12 + 13;
  const animationChunk = new Uint8Array([0, 0, 0, 8, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
  const animated = new Uint8Array(original.length + animationChunk.length);
  animated.set(original.subarray(0, firstChunkEnd));
  animated.set(animationChunk, firstChunkEnd);
  animated.set(original.subarray(firstChunkEnd), firstChunkEnd + animationChunk.length);
  const file = new File([animated], 'animated.png', { type: 'image/png' });
  assert.equal(await codeOf(validateImageFile(file)), 'ANIMATION_UNSUPPORTED');
});

test('rejects animated WebP flags and malformed containers', async () => {
  const animated = new Uint8Array(30);
  animated.set([0x52, 0x49, 0x46, 0x46, 22, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0x02]);
  assert.equal(await codeOf(validateImageFile(new File([animated], 'animated.webp', { type: 'image/webp' }))), 'ANIMATION_UNSUPPORTED');
  animated[4] = 21;
  assert.equal(await codeOf(validateImageFile(new File([animated], 'broken.webp', { type: 'image/webp' }))), 'DECODE_FAILED');
});

test('sanitizes download names and limits the extension allowlist', () => {
  assert.equal(safeDownloadName('../../tax\u0000 form?.jpg', 'webp'), 'pixeltokb-tax- form.webp');
  assert.equal(safeDownloadName('...jpg', 'svg'), 'pixeltokb-image.png');
  assert.ok(safeDownloadName('a'.repeat(120) + '.png', 'png').length <= 96);
});
