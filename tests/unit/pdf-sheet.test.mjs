import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPhotoSheetPdf } from '../../src/lib/pdf-sheet.ts';

test('photo sheet PDF contains a page, image object, and calibration line', () => {
  const pdf = buildPhotoSheetPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 600, 800, 35, 45, 'A4', 4);
  const text = new TextDecoder().decode(pdf);
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /\/Subtype \/Image/);
  assert.match(text, /20 mm calibration line/);
  assert.match(text, /%%EOF/);
});

test('photo sheet PDF rejects a sheet that cannot fit', () => {
  assert.throws(() => buildPhotoSheetPdf(new Uint8Array([1]), 10, 10, 200, 250, 'A4', 24), /PHOTO_DOES_NOT_FIT/);
});
