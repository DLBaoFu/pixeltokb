import test from 'node:test';
import assert from 'node:assert/strict';
import { pixelsFromPhysical, verifyWrittenDpi, withJpegDpi, withPngDpi } from '../../src/lib/physical-resize.ts';

test('physical dimensions use the required millimetre formula and inch equivalent', () => {
  assert.equal(pixelsFromPhysical(35, 'mm', 300), 413);
  assert.equal(pixelsFromPhysical(45, 'mm', 300), 531);
  assert.equal(pixelsFromPhysical(2, 'in', 300), 600);
  assert.equal(pixelsFromPhysical(0, 'mm', 300), null);
});

test('JPEG and PNG density metadata is written then read back before success', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x08, 1, 2, 3, 4, 0xff, 0xd9]);
  const taggedJpeg = withJpegDpi(jpeg, 300);
  assert.equal(verifyWrittenDpi(taggedJpeg, 'jpeg', 300), 300);
  const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,2,0,0,0,0,0,0,0,0,0,0,0,73,68,65,84,0,0,0,0,0,0,0,0,0,0,0,0,73,69,78,68,174,66,96,130]);
  const taggedPng = withPngDpi(png, 300);
  assert.equal(verifyWrittenDpi(taggedPng, 'png', 300), 300);
});
