// @ts-nocheck -- Node's mocked browser globals intentionally do not implement DOM interfaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { File } from 'node:buffer';

const messages = [];
let encodes = 0;
let wrongMime = false;
let canvasOperations = [];

globalThis.self = { postMessage(message) { messages.push(message); } };
globalThis.createImageBitmap = async () => ({ width: 3200, height: 2400, close() {} });
globalThis.OffscreenCanvas = class {
  width;
  height;
  constructor(width, height) { this.width = width; this.height = height; }
  getContext() { return { fillRect(...args) { canvasOperations.push(['fillRect', ...args]); }, drawImage(...args) { canvasOperations.push(['drawImage', ...args]); }, set fillStyle(value) { canvasOperations.push(['fillStyle', value]); } }; }
  async convertToBlob({ type, quality }) {
    encodes += 1;
    const bytes = Math.ceil(this.width * this.height * (quality ?? 1) * .2 + 1000);
    return new Blob([new Uint8Array(bytes)], { type: wrongMime ? 'image/png' : type });
  }
};

await import('../../src/workers/image-worker.ts');
const jpegBytes = new Uint8Array(100); jpegBytes.set([0xff, 0xd8, 0xff, 0xe0]);
const file = new File([jpegBytes], 'sample.jpg', { type: 'image/jpeg' });
const transparentPng = new File([await readFile(new URL('../fixtures/images/alpha-shapes.png', import.meta.url))], 'alpha-shapes.png', { type: 'image/png' });

async function compress(targetBytes, preserveDimensions, output = 'jpeg', input = file, jpegBackground = '#ffffff') {
  messages.length = 0; encodes = 0; wrongMime = false; canvasOperations = [];
  await self.onmessage({ data: { type: 'compress', file: input, targetBytes, preserveDimensions, output, jpegBackground } });
  return { messages: [...messages], encodes };
}

test('small target reduces dimensions within the total 20-encode budget', async () => {
  const run = await compress(10_000, false);
  const result = run.messages.find((message) => message.type === 'success');
  assert.ok(result);
  assert.ok(result.blob.size <= 10_000);
  assert.equal(result.blob.type, 'image/jpeg');
  assert.ok(result.width < 3200 && result.height < 2400);
  assert.ok(run.encodes <= 20);
});

test('keep-dimensions failure offers no success result and stays within the budget', async () => {
  const run = await compress(10_000, true);
  assert.equal(run.messages.some((message) => message.type === 'success'), false);
  assert.equal(run.messages.at(-1).error, 'TARGET_UNREACHABLE');
  assert.ok(run.encodes <= 20);
});

test('lossy compression searches near the budget instead of accepting an unnecessarily tiny file', async () => {
  const run = await compress(1_000_000, true);
  const result = run.messages.find((message) => message.type === 'success');
  assert.ok(result);
  assert.ok(result.blob.size <= 1_000_000);
  assert.ok(result.blob.size >= 970_000);
  assert.equal(result.width, 3200);
  assert.ok(run.encodes <= 20);
});

test('unsupported encoder MIME fallback is rejected', async () => {
  messages.length = 0; encodes = 0; wrongMime = true;
  await self.onmessage({ data: { type: 'compress', file, targetBytes: 2_000_000, preserveDimensions: true, output: 'webp', jpegBackground: '#ffffff' } });
  assert.equal(messages.some((message) => message.type === 'success'), false);
  assert.equal(messages.at(-1).error, 'ENCODER_UNAVAILABLE');
  wrongMime = false;
});

test('transparent PNG can be explicitly flattened to JPEG with the selected background', async () => {
  const run = await compress(2_000_000, true, 'jpeg', transparentPng, '#123456');
  const result = run.messages.find((message) => message.type === 'success');
  assert.ok(result);
  assert.equal(result.blob.type, 'image/jpeg');
  assert.deepEqual(canvasOperations.find((operation) => operation[0] === 'fillStyle'), ['fillStyle', '#123456']);
  assert.ok(canvasOperations.findIndex((operation) => operation[0] === 'fillRect') < canvasOperations.findIndex((operation) => operation[0] === 'drawImage'));
});

test('resize fill uses one centered source crop and fills the exact destination canvas', async () => {
  messages.length = 0; canvasOperations = [];
  await self.onmessage({ data: { type: 'resize', file, width: 400, height: 400, mode: 'fill', output: 'png', jpegBackground: '#ffffff' } });
  const result = messages.find((message) => message.type === 'success');
  assert.ok(result);
  assert.equal(result.width, 400);
  assert.equal(result.height, 400);
  const draw = canvasOperations.find((operation) => operation[0] === 'drawImage');
  assert.deepEqual(draw.slice(2), [400, 0, 2400, 2400, 0, 0, 400, 400]);
});

test('resize fit paints the selected JPEG background before drawing', async () => {
  messages.length = 0; canvasOperations = [];
  await self.onmessage({ data: { type: 'resize', file, width: 400, height: 400, mode: 'fit', output: 'jpeg', jpegBackground: '#123456' } });
  assert.ok(messages.find((message) => message.type === 'success'));
  assert.deepEqual(canvasOperations.find((operation) => operation[0] === 'fillStyle'), ['fillStyle', '#123456']);
  assert.ok(canvasOperations.findIndex((operation) => operation[0] === 'fillRect') < canvasOperations.findIndex((operation) => operation[0] === 'drawImage'));
});

test('crop clamps the requested box and reports the real output dimensions', async () => {
  messages.length = 0; canvasOperations = [];
  await self.onmessage({ data: { type: 'crop', file, x: 3100, y: 2300, width: 500, height: 500, output: 'webp', jpegBackground: '#ffffff' } });
  const result = messages.find((message) => message.type === 'success');
  assert.ok(result);
  assert.equal(result.width, 100);
  assert.equal(result.height, 100);
  const draw = canvasOperations.find((operation) => operation[0] === 'drawImage');
  assert.deepEqual(draw.slice(2), [3100, 2300, 100, 100, 0, 0, 100, 100]);
});

test('signature preparation crops the requested area, flattens to white JPEG, and checks actual bytes', async () => {
  messages.length = 0; encodes = 0; wrongMime = false; canvasOperations = [];
  await self.onmessage({ data: { type: 'signature', file: transparentPng, crop: { left: 100, top: 200, width: 800, height: 300 }, width: 300, height: 100, targetBytes: 10_000 } });
  const result = messages.find((message) => message.type === 'success');
  assert.ok(result);
  assert.equal(result.width, 300);
  assert.equal(result.height, 100);
  assert.equal(result.blob.type, 'image/jpeg');
  assert.ok(result.blob.size <= 10_000);
  assert.deepEqual(canvasOperations.find((operation) => operation[0] === 'fillStyle'), ['fillStyle', '#ffffff']);
  assert.ok(canvasOperations.findIndex((operation) => operation[0] === 'fillRect') < canvasOperations.findIndex((operation) => operation[0] === 'drawImage'));
  assert.deepEqual(canvasOperations.find((operation) => operation[0] === 'drawImage').slice(2), [100, 200, 800, 300, 0, 0, 300, 100]);
  assert.ok(encodes <= 12);
});

test('signature preparation refuses a byte limit that no JPEG candidate can meet', async () => {
  messages.length = 0; encodes = 0; wrongMime = false; canvasOperations = [];
  await self.onmessage({ data: { type: 'signature', file, crop: { left: 0, top: 0, width: 3200, height: 2400 }, width: 300, height: 100, targetBytes: 1_000 } });
  assert.equal(messages.some((message) => message.type === 'success'), false);
  assert.equal(messages.at(-1).error, 'TARGET_UNREACHABLE');
  assert.ok(encodes <= 12);
});

test('corrupt image reports a specific decode failure and never offers a result', async () => {
  const decode = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => { throw new Error('The source image cannot be decoded.'); };
  messages.length = 0;
  try {
    await self.onmessage({ data: { type: 'compress', file, targetBytes: 50_000, preserveDimensions: true, output: 'jpeg', jpegBackground: '#ffffff' } });
    assert.equal(messages.some((message) => message.type === 'success'), false);
    assert.equal(messages.at(-1).error, 'DECODE_FAILED');
  } finally { globalThis.createImageBitmap = decode; }
});
