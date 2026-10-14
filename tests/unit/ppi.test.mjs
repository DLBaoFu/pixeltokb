import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePpi, convertPrintUnit, MILLIMETRES_PER_INCH, toInches } from '../../src/lib/ppi.ts';

test('PPI calculation reports both axes and diagonal without treating PPI as image metadata', () => {
  const matched = calculatePpi(3000, 2000, 10, 6.6666666667, 'in');
  assert.ok(matched);
  assert.equal(matched.horizontal, 300);
  assert.ok(Math.abs(matched.vertical - 300) < 0.00001);
  assert.ok(Math.abs(matched.diagonal - 300) < 0.00001);
  assert.equal(matched.dimensionsMatch, true);
  const mismatched = calculatePpi(3000, 2000, 10, 10, 'in');
  assert.equal(mismatched?.horizontal, 300);
  assert.equal(mismatched?.vertical, 200);
  assert.equal(mismatched?.dimensionsMatch, false);
});

test('PPI calculation converts millimetres exactly enough for print planning and rejects invalid values', () => {
  assert.equal(toInches(MILLIMETRES_PER_INCH, 'mm'), 1);
  assert.equal(convertPrintUnit(10, 'in', 'mm'), 254);
  assert.equal(calculatePpi(3000, 2000, 254, 169.33333333418, 'mm')?.horizontal, 300);
  assert.equal(calculatePpi(0, 2000, 10, 6, 'in'), null);
  assert.equal(calculatePpi(3000, 2000, -10, 6, 'in'), null);
});
