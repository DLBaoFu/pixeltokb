// @ts-nocheck -- Node fixtures exercise the binary metadata scrubber directly.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { hasPrivacyMetadata, preservePrivacyMetadata, stripPrivacyMetadata } from '../../src/lib/image/privacy-metadata.ts';
import { inspectPng } from '../../src/lib/png/lossless.ts';

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
function pngChunk(type, payload) {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(payload.length + 12);
  chunk.writeUInt32BE(payload.length, 0);
  typeBytes.copy(chunk, 4);
  Buffer.from(payload).copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(payload)])), payload.length + 8);
  return chunk;
}
function withJpegSegment(source, marker, payload) {
  const segment = Buffer.alloc(payload.length + 4);
  segment[0] = 0xff;
  segment[1] = marker;
  segment.writeUInt16BE(payload.length + 2, 2);
  Buffer.from(payload).copy(segment, 4);
  return Buffer.concat([source.subarray(0, 2), segment, source.subarray(2)]);
}

function withWebpPrivacy(source, includeXmp = true) {
  const extendedHeader = Buffer.alloc(18);
  extendedHeader.write('VP8X', 0, 'ascii');
  extendedHeader.writeUInt32LE(10, 4);
  extendedHeader[8] = includeXmp ? 0x0c : 0x08;
  extendedHeader[12] = 319 & 0xff; extendedHeader[13] = (319 >> 8) & 0xff; extendedHeader[14] = (319 >> 16) & 0xff;
  extendedHeader[15] = 239 & 0xff; extendedHeader[16] = (239 >> 8) & 0xff; extendedHeader[17] = (239 >> 16) & 0xff;
  const metadata = Buffer.from('EXIF-camera-and-GPS');
  const exifChunk = Buffer.alloc(8 + metadata.length + (metadata.length % 2));
  exifChunk.write('EXIF', 0, 'ascii'); exifChunk.writeUInt32LE(metadata.length, 4); metadata.copy(exifChunk, 8);
  const xmp = Buffer.from('XMP-private-caption');
  const xmpChunk = Buffer.alloc(8 + xmp.length + (xmp.length % 2));
  xmpChunk.write('XMP ', 0, 'ascii'); xmpChunk.writeUInt32LE(xmp.length, 4); xmp.copy(xmpChunk, 8);
  const output = Buffer.concat([source.subarray(0, 12), extendedHeader, source.subarray(12), exifChunk, ...(includeXmp ? [xmpChunk] : [])]);
  output.writeUInt32LE(output.length - 8, 4);
  return output;
}

const jpegFixture = await readFile(new URL('../fixtures/images/opaque-gradient.jpg', import.meta.url));
const pngFixture = await readFile(new URL('../fixtures/images/alpha-shapes.png', import.meta.url));
const webpFixture = await readFile(new URL('../fixtures/images/textured.webp', import.meta.url));

test('JPEG export removes EXIF/GPS and IPTC segments while preserving the image stream', async () => {
  const exif = withJpegSegment(jpegFixture, 0xe1, Buffer.from('Exif\0\0GPSLatitude GPSLongitude CameraModel'));
  const iptc = withJpegSegment(exif, 0xed, Buffer.from('Photoshop 3.0 IPTC caption'));
  const input = withJpegSegment(iptc, 0xfe, Buffer.from('Private user comment'));
  assert.equal(hasPrivacyMetadata(new Uint8Array(input), 'image/jpeg'), true);
  const result = await stripPrivacyMetadata(new Blob([input], { type: 'image/jpeg' }));
  const output = new Uint8Array(await result.blob.arrayBuffer());
  assert.equal(result.status, 'removed');
  assert.equal(hasPrivacyMetadata(output, 'image/jpeg'), false);
  assert.deepEqual(Buffer.from(output.subarray(0, 2)), Buffer.from([0xff, 0xd8]));
  assert.deepEqual(Buffer.from(output.subarray(-2)), Buffer.from([0xff, 0xd9]));
  assert.ok(output.length < input.length);
});

test('PNG export removes EXIF/text/time chunks and keeps image data, alpha, and DPI chunks', async () => {
  const source = Buffer.from(pngFixture);
  const dpiPayload = Buffer.from([0, 0, 0x0b, 0x13, 0, 0, 0x0b, 0x13, 1]);
  const withMetadata = Buffer.concat([
    source.subarray(0, 33),
    pngChunk('eXIf', Buffer.from('GPSLatitude=51.5;GPSLongitude=-0.1')),
    pngChunk('tEXt', Buffer.from('Comment\0private note')),
    pngChunk('tIME', Buffer.from([0x07, 0xea, 1, 1, 0, 0, 0])),
    pngChunk('pHYs', dpiPayload),
    source.subarray(33)
  ]);
  assert.equal(hasPrivacyMetadata(new Uint8Array(withMetadata), 'image/png'), true);
  const result = await stripPrivacyMetadata(new Blob([withMetadata], { type: 'image/png' }));
  const output = new Uint8Array(await result.blob.arrayBuffer());
  assert.equal(result.status, 'removed');
  assert.equal(hasPrivacyMetadata(output, 'image/png'), false);
  const inspection = inspectPng(output);
  assert.ok(inspection.hasAlpha);
  assert.ok(inspection.chunkTypes.includes('pHYs'));
  assert.ok(inspection.chunkTypes.includes('IDAT'));
  assert.deepEqual(inspection.metadataChunks, []);
  assert.ok(output.length < withMetadata.length);
});

test('WebP export removes EXIF/XMP chunks and repairs the RIFF size', async () => {
  const extendedHeader = Buffer.alloc(18);
  extendedHeader.write('VP8X', 0, 'ascii');
  extendedHeader.writeUInt32LE(10, 4);
  extendedHeader[8] = 0x0c;
  extendedHeader[12] = 319 & 0xff; extendedHeader[13] = (319 >> 8) & 0xff; extendedHeader[14] = (319 >> 16) & 0xff;
  extendedHeader[15] = 239 & 0xff; extendedHeader[16] = (239 >> 8) & 0xff; extendedHeader[17] = (239 >> 16) & 0xff;
  const metadata = Buffer.from('EXIF');
  const exifChunk = Buffer.alloc(8 + metadata.length);
  exifChunk.write('EXIF', 0, 'ascii');
  exifChunk.writeUInt32LE(metadata.length, 4);
  metadata.copy(exifChunk, 8);
  const xmp = Buffer.from('XMP ');
  const xmpChunk = Buffer.alloc(8 + xmp.length);
  xmpChunk.write('XMP ', 0, 'ascii');
  xmpChunk.writeUInt32LE(xmp.length, 4);
  xmp.copy(xmpChunk, 8);
  const withMetadata = Buffer.concat([webpFixture.subarray(0, 12), extendedHeader, webpFixture.subarray(12), exifChunk, xmpChunk]);
  withMetadata.writeUInt32LE(withMetadata.length - 8, 4);
  assert.equal(hasPrivacyMetadata(new Uint8Array(withMetadata), 'image/webp'), true);
  const result = await stripPrivacyMetadata(new Blob([withMetadata], { type: 'image/webp' }));
  const output = new Uint8Array(await result.blob.arrayBuffer());
  assert.equal(result.status, 'removed');
  assert.equal(hasPrivacyMetadata(output, 'image/webp'), false);
  assert.equal(new DataView(output.buffer).getUint32(4, true), output.length - 8);
  assert.deepEqual(Buffer.from(output.subarray(0, 4)), Buffer.from('RIFF'));
  assert.deepEqual(Buffer.from(output.subarray(8, 12)), Buffer.from('WEBP'));
  assert.equal(output[20] & 0x0c, 0, 'VP8X metadata feature flags are cleared');
  assert.ok(output.length < withMetadata.length);
});

test('metadata-free exports are reported without changing their bytes', async () => {
  const result = await stripPrivacyMetadata(new Blob([jpegFixture], { type: 'image/jpeg' }));
  assert.equal(result.status, 'none-present');
  assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()), jpegFixture);
});

test('JPEG privacy cleanup retains verified zero-filled size padding but removes text comments', async () => {
  const padding = withJpegSegment(jpegFixture, 0xfe, Buffer.alloc(128));
  const result = await stripPrivacyMetadata(new Blob([padding], { type: 'image/jpeg' }));
  const output = Buffer.from(await result.blob.arrayBuffer());
  assert.equal(result.status, 'none-present');
  assert.equal(hasPrivacyMetadata(output, 'image/jpeg'), false);
  assert.equal(output.length, padding.length);
  const withText = withJpegSegment(padding, 0xfe, Buffer.from('Private note'));
  const clean = await stripPrivacyMetadata(new Blob([withText], { type: 'image/jpeg' }));
  assert.equal(clean.status, 'removed');
  assert.equal(hasPrivacyMetadata(new Uint8Array(await clean.blob.arrayBuffer()), 'image/jpeg'), false);
});

test('switch-off preservation restores and verifies JPEG, PNG, and WebP privacy metadata', async () => {
  const jpegSource = withJpegSegment(jpegFixture, 0xe1, Buffer.from('Exif\0\0GPSLatitude GPSLongitude CameraModel'));
  const jpegResult = await preservePrivacyMetadata([new Blob([jpegSource], { type: 'image/jpeg' })], new Blob([jpegFixture], { type: 'image/jpeg' }));
  const jpegOutput = Buffer.from(await jpegResult.blob.arrayBuffer());
  assert.equal(jpegResult.status, 'preserved'); assert.equal(hasPrivacyMetadata(jpegOutput, 'image/jpeg'), true);
  assert.equal(jpegOutput.includes(Buffer.from('GPSLatitude GPSLongitude CameraModel')), true);

  const pngSource = Buffer.concat([pngFixture.subarray(0, 33), pngChunk('eXIf', Buffer.from('GPS=51.5,-0.1;Camera=fixture')), pngChunk('tEXt', Buffer.from('Comment\0private note')), pngFixture.subarray(33)]);
  const pngResult = await preservePrivacyMetadata([new Blob([pngSource], { type: 'image/png' })], new Blob([pngFixture], { type: 'image/png' }));
  const pngOutput = Buffer.from(await pngResult.blob.arrayBuffer());
  assert.equal(pngResult.status, 'preserved'); assert.equal(hasPrivacyMetadata(pngOutput, 'image/png'), true);
  assert.equal(pngOutput.includes(Buffer.from('Comment\0private note')), true);

  const webpSource = withWebpPrivacy(webpFixture);
  const webpResult = await preservePrivacyMetadata([new Blob([webpSource], { type: 'image/webp' })], new Blob([webpFixture], { type: 'image/webp' }));
  const webpOutput = Buffer.from(await webpResult.blob.arrayBuffer());
  assert.equal(webpResult.status, 'preserved'); assert.equal(hasPrivacyMetadata(webpOutput, 'image/webp'), true);
  assert.equal(webpOutput.includes(Buffer.from('EXIF-camera-and-GPS')), true);
  assert.equal(webpOutput.readUInt32LE(4), webpOutput.length - 8);

  const exifOnlySource = withWebpPrivacy(webpFixture, false);
  const exifOnlyResult = await preservePrivacyMetadata([new Blob([exifOnlySource], { type: 'image/webp' })], new Blob([webpFixture], { type: 'image/webp' }));
  const exifOnlyOutput = Buffer.from(await exifOnlyResult.blob.arrayBuffer());
  assert.equal(exifOnlyOutput[20] & 0x0c, 0x08, 'VP8X must advertise only metadata chunks that were restored');
});
