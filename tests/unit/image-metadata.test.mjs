// @ts-nocheck -- Node fixture builders intentionally use lightweight JavaScript types.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPngMetadata, getWebpMetadata } from '../../src/lib/image/metadata.ts';

function webpChunk(type, data) {
  const chunk = new Uint8Array(8 + data.length + (data.length % 2));
  chunk.set([...type].map((character) => character.charCodeAt(0)));
  new DataView(chunk.buffer).setUint32(4, data.length, true);
  chunk.set(data, 8);
  return chunk;
}

function webp(...chunks) {
  const bodyLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(12 + bodyLength);
  bytes.set([82, 73, 70, 70]);
  new DataView(bytes.buffer).setUint32(4, bodyLength + 4, true);
  bytes.set([87, 69, 66, 80], 8);
  let offset = 12;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

test('PNG metadata distinguishes an RGBA image from a non-alpha image', async () => {
  const rgba = new Uint8Array(await readFile(new URL('../fixtures/images/alpha-shapes.png', import.meta.url)));
  const opaque = rgba.slice(); opaque[25] = 2;
  assert.equal(getPngMetadata(rgba).alpha, true);
  assert.equal(getPngMetadata(opaque).alpha, false);
});

test('WebP VP8X alpha flag is detected exactly', () => {
  assert.equal(getWebpMetadata(webp(webpChunk('VP8X', new Uint8Array([0x10])))).alpha, true);
  assert.equal(getWebpMetadata(webp(webpChunk('VP8X', new Uint8Array([0x00])))).alpha, false);
});

test('WebP ALPH chunk and VP8L alpha bit are detected', () => {
  assert.equal(getWebpMetadata(webp(webpChunk('ALPH', new Uint8Array([0])))).alpha, true);
  assert.equal(getWebpMetadata(webp(webpChunk('VP8L', new Uint8Array([0x2f, 0, 0, 0, 0x10])))).alpha, true);
  assert.equal(getWebpMetadata(webp(webpChunk('VP8L', new Uint8Array([0x2f, 0, 0, 0, 0])))).alpha, false);
});
