// @ts-nocheck -- Node mocks exercise the isolated browser canvas path.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import { inspectPng, optimizePngLosslessly } from '../../src/lib/png/lossless.ts';

const fixture = await readFile(new URL('../fixtures/images/alpha-shapes.png', import.meta.url));
const unoptimizedFixture = await readFile(new URL('../fixtures/images/unoptimized-alpha.png', import.meta.url));
const input = new Blob([unoptimizedFixture], { type: 'image/png' });
let alteredPixel = false;
let closed = 0;
let bitmapCall = 0;

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  crcTable[index] = value >>> 0;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  Buffer.from(data).copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(data)])), data.length + 8);
  return chunk;
}
function insertAfterHeader(source, chunk) {
  return Buffer.concat([source.subarray(0, 33), chunk, source.subarray(33)]);
}
function createRgbaPng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const scanline = Buffer.from([0, ...rgba]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(scanline)), pngChunk('IEND', Buffer.alloc(0))]);
}
function createRgbPng(width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const scanlines = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 3 + 1);
    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + 1 + x * 3;
      scanlines[pixelOffset] = x;
      scanlines[pixelOffset + 1] = y;
      scanlines[pixelOffset + 2] = (x + y) & 0xff;
    }
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(scanlines)), pngChunk('IEND', Buffer.alloc(0))]);
}
const tinyFixture = createRgbaPng(1, 1, [255, 255, 255, 255]);
const smallInput = new Blob([tinyFixture], { type: 'image/png' });
const opaqueInput = new Blob([createRgbPng(64, 64)], { type: 'image/png' });

globalThis.createImageBitmap = async (blob) => {
  const inspected = inspectPng(new Uint8Array(await blob.arrayBuffer()));
  return {
    width: inspected.width, height: inspected.height, id: bitmapCall++ === 0 ? 'source' : 'candidate',
    close() { closed += 1; }
  };
};
globalThis.OffscreenCanvas = class {
  constructor(width, height) { this.width = width; this.height = height; }
  getContext() {
    return {
      clearRect() {}, drawImage(bitmap) { this.bitmap = bitmap; },
      getImageData(_x, _y, width, height) {
        const data = new Uint8ClampedArray(width * height * 4);
        data.fill(255);
        if (alteredPixel && this.bitmap?.id === 'candidate') data[0] = 0;
        return { data };
      }
    };
  }
};

test('reads a real PNG fixture and rejects an APNG animation marker', () => {
  const inspected = inspectPng(new Uint8Array(fixture));
  assert.deepEqual([inspected.width, inspected.height, inspected.animated, inspected.hasAlpha], [320, 240, false, true]);
  assert.ok(inspected.chunkTypes.includes('IDAT'));
  const animated = insertAfterHeader(fixture, pngChunk('acTL', Buffer.from([0, 0, 0, 1, 0, 0, 0, 0])));
  assert.equal(inspectPng(new Uint8Array(animated)).animated, true);
  assert.throws(() => inspectPng(new Uint8Array([1, 2, 3])), /FORMAT_UNSUPPORTED/);
});

test('rejects a PNG with a corrupted chunk CRC', () => {
  const corrupted = Buffer.from(fixture);
  corrupted[corrupted.length - 5] ^= 0xff;
  assert.throws(() => inspectPng(new Uint8Array(corrupted)), /DECODE_FAILED/);
});

test('the optimizer refuses animated PNG and a mismatched MIME before decoding', async () => {
  const animated = insertAfterHeader(fixture, pngChunk('acTL', Buffer.from([0, 0, 0, 1, 0, 0, 0, 0])));
  await assert.rejects(optimizePngLosslessly(new Blob([animated], { type: 'image/png' })), /ANIMATION_UNSUPPORTED/);
  await assert.rejects(optimizePngLosslessly(new Blob([fixture], { type: 'image/jpeg' })), /FORMAT_UNSUPPORTED/);
});

test('enforces source byte and decoded pixel ceilings before encoding', async () => {
  await assert.rejects(optimizePngLosslessly(new Blob([new Uint8Array(20_000_001)], { type: 'image/png' })), /FILE_TOO_LARGE/);
  const tooManyPixels = createRgbaPng(10_000, 4_001, [255, 255, 255, 255]);
  await assert.rejects(optimizePngLosslessly(new Blob([tooManyPixels], { type: 'image/png' })), /PIXEL_LIMIT/);
});

test('returns smaller PNG only after exact decoded RGBA comparison', async () => {
  alteredPixel = false; closed = 0; bitmapCall = 0;
  const result = await optimizePngLosslessly(input);
  assert.equal(result.status, 'optimized');
  assert.ok(result.outputBytes < input.size);
  assert.equal(result.blob.type, 'image/png');
  assert.equal(result.width, 320);
  assert.equal(result.hasAlpha, true);
  assert.equal(result.metadataStatus, 'removed');
  const outputInspection = inspectPng(new Uint8Array(await result.blob.arrayBuffer()));
  assert.deepEqual(outputInspection.metadataChunks, []);
  assert.ok(outputInspection.chunkTypes.includes('sRGB'));
  assert.equal(outputInspection.chunkTypes.includes('iCCP'), false);
  assert.equal(closed, 2);
});

test('reports verified removal of embedded text and EXIF metadata', async () => {
  alteredPixel = false; closed = 0; bitmapCall = 0;
  const withText = insertAfterHeader(unoptimizedFixture, pngChunk('tEXt', Buffer.from('Comment\0private test note')));
  const withMetadata = insertAfterHeader(withText, pngChunk('eXIf', Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 0, 0])));
  assert.ok(inspectPng(new Uint8Array(withMetadata)).metadataChunks.includes('eXIf'));
  const result = await optimizePngLosslessly(new Blob([withMetadata], { type: 'image/png' }));
  assert.equal(result.status, 'optimized');
  assert.equal(result.metadataStatus, 'removed');
});

test('keeps an opaque source in an RGB PNG container', async () => {
  alteredPixel = false; closed = 0; bitmapCall = 0;
  const result = await optimizePngLosslessly(opaqueInput);
  assert.equal(result.status, 'optimized');
  assert.equal(result.hasAlpha, false);
  const outputInspection = inspectPng(new Uint8Array(await result.blob.arrayBuffer()));
  assert.equal(outputInspection.hasAlpha, false);
  assert.equal(closed, 2);
});

test('rejects re-encoding that changes a color or alpha sample', async () => {
  alteredPixel = true; closed = 0; bitmapCall = 0;
  const result = await optimizePngLosslessly(input);
  assert.deepEqual([result.status, result.reason], ['unchanged', 'pixel-mismatch']);
  assert.equal(closed, 2);
  alteredPixel = false;
});

test('does not claim optimization when the PNG encoder makes a larger file', async () => {
  alteredPixel = false; closed = 0; bitmapCall = 0;
  const result = await optimizePngLosslessly(smallInput);
  assert.deepEqual([result.status, result.reason], ['unchanged', 'not-smaller']);
  assert.equal(closed, 1);
});

test('returns a specific failure and releases the bitmap when no deflate encoder exists', async () => {
  const savedCompressionStream = globalThis.CompressionStream;
  alteredPixel = false; closed = 0; bitmapCall = 0;
  try {
    globalThis.CompressionStream = undefined;
    await assert.rejects(optimizePngLosslessly(input), /ENCODER_UNAVAILABLE/);
    assert.equal(closed, 1);
  } finally {
    globalThis.CompressionStream = savedCompressionStream;
  }
});
