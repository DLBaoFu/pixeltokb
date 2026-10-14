import assert from 'node:assert/strict';
import test from 'node:test';
import { physicalPresetFromSearch, resizePresetFromSearch } from '../../src/lib/resize-presets.ts';

test('pixel resize query presets accept only bounded complete dimensions and a supported mode', () => {
  assert.deepEqual(resizePresetFromSearch('?width=1200&height=630&mode=fit'), { width: 1200, height: 630, mode: 'fit' });
  assert.deepEqual(resizePresetFromSearch('?width=1080&height=1920&mode=stretch'), { width: 1080, height: 1920, mode: 'stretch' });
  assert.equal(resizePresetFromSearch('?width=1200&height=0&mode=fit'), null);
  assert.equal(resizePresetFromSearch('?width=12001&height=630&mode=fit'), null);
  assert.equal(resizePresetFromSearch('?width=1200&height=630&mode=unknown'), null);
});

test('physical resize query presets require finite dimensions, a supported unit, and safe DPI', () => {
  assert.deepEqual(physicalPresetFromSearch('?width=35&height=45&unit=mm&dpi=300'), { width: 35, height: 45, unit: 'mm', dpi: 300 });
  assert.deepEqual(physicalPresetFromSearch('?width=2&height=2&unit=in&dpi=300'), { width: 2, height: 2, unit: 'in', dpi: 300 });
  assert.equal(physicalPresetFromSearch('?width=35&height=45&unit=cm&dpi=300'), null);
  assert.equal(physicalPresetFromSearch('?width=35&height=45&unit=mm&dpi=1201'), null);
});
