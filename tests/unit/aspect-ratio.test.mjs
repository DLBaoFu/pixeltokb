import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAspectRatio, calculateCompanionDimension, greatestCommonDivisor } from '../../src/lib/aspect-ratio.ts';

test('aspect ratio reduction preserves landscape, portrait and square dimensions', () => {
  assert.equal(greatestCommonDivisor(1920, 1080), 120);
  assert.deepEqual(calculateAspectRatio(1920, 1080), { width: 1920, height: 1080, ratioWidth: 16, ratioHeight: 9, decimal: 16 / 9, orientation: 'landscape' });
  assert.equal(calculateAspectRatio(1080, 1920)?.orientation, 'portrait');
  assert.equal(calculateAspectRatio(1200, 1200)?.orientation, 'square');
});

test('aspect ratio calculator rejects invalid pixel values and rounds companion dimensions deliberately', () => {
  assert.equal(calculateAspectRatio(0, 1080), null);
  assert.equal(calculateAspectRatio(1920.5, 1080), null);
  const ratio = calculateAspectRatio(1920, 1080);
  assert.ok(ratio);
  assert.equal(calculateCompanionDimension(ratio, 'width', 1200), 675);
  assert.equal(calculateCompanionDimension(ratio, 'height', 1000), 1778);
  assert.equal(calculateCompanionDimension(ratio, 'height', -1), null);
});
