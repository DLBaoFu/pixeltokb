import test from 'node:test';
import assert from 'node:assert/strict';
import { colorDistanceSquared, removeSampledBackground } from '../../src/lib/background-removal.ts';

test('background threshold removes sampled colour and preserves foreground', () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255, 250, 250, 250, 255,
    10, 20, 30, 255, 255, 255, 255, 0
  ]);
  const result = removeSampledBackground(pixels, { r: 255, g: 255, b: 255 }, 10);
  assert.equal(result.removed, 2);
  assert.equal(pixels[3], 0);
  assert.equal(pixels[7], 0);
  assert.equal(pixels[11], 255);
  assert.equal(pixels[15], 0);
});

test('background threshold validates data and tolerance', () => {
  assert.equal(colorDistanceSquared({ r: 0, g: 0, b: 0 }, { r: 3, g: 4, b: 12 }), 169);
  assert.throws(() => removeSampledBackground(new Uint8ClampedArray(3), { r: 0, g: 0, b: 0 }, 10), /INVALID_PIXEL_DATA/);
  assert.throws(() => removeSampledBackground(new Uint8ClampedArray(4), { r: 0, g: 0, b: 0 }, 443), /INVALID_TOLERANCE/);
});
