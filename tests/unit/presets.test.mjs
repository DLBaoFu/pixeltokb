import test from 'node:test';
import assert from 'node:assert/strict';
import { compressionGroups, compressionGroupOrder, compressionPresetLabel } from '../../src/lib/compression-groups.ts';
import { bytesFor, convertTargetUnit } from '../../src/lib/presets.ts';
import { errorMessages } from '../../src/lib/image/errors.ts';

test('R1 exposes exactly four grouped compression pages with their real presets', () => {
  assert.deepEqual(compressionGroupOrder, ['small', 'medium', 'large', 'megabytes']);
  assert.deepEqual(compressionGroups.small.presets, [10_000, 20_000, 30_000, 50_000, 100_000]);
  assert.deepEqual(compressionGroups.medium.presets, [200_000, 300_000, 400_000, 500_000]);
  assert.deepEqual(compressionGroups.large.presets, [500_000, 750_000, 1_000_000]);
  assert.deepEqual(compressionGroups.megabytes.presets, [2_000_000, 3_000_000, 4_000_000, 5_000_000]);
  assert.equal(new Set(compressionGroupOrder.map((key) => compressionGroups[key].slug)).size, 4);
});

test('each page default and preset stays within its range, with the requested custom unit', () => {
  for (const key of compressionGroupOrder) {
    const group = compressionGroups[key];
    assert.ok(group.defaultBytes >= group.minBytes && group.defaultBytes <= group.maxBytes);
    assert.ok(group.presets.some((bytes) => bytes === group.defaultBytes));
    for (const bytes of group.presets) assert.ok(bytes >= group.minBytes && bytes <= group.maxBytes);
    assert.equal(group.defaultUnit, key === 'megabytes' ? 'MB' : 'KB');
  }
  assert.equal(compressionGroups.small.defaultBytes, 50_000);
  assert.equal(compressionGroups.medium.defaultBytes, 300_000);
  assert.equal(compressionGroups.large.defaultBytes, 750_000);
  assert.equal(compressionGroups.megabytes.defaultBytes, 2_000_000);
});

test('KB/KiB/MB/MiB convert to exact byte budgets', () => {
  assert.equal(bytesFor(50, 'KB'), 50_000);
  assert.equal(bytesFor(50, 'KiB'), 51_200);
  assert.equal(bytesFor(2, 'MB'), 2_000_000);
  assert.equal(bytesFor(2, 'MiB'), 2_097_152);
  assert.equal(compressionPresetLabel(750_000), '750 KB');
  assert.equal(compressionPresetLabel(2_000_000), '2 MB');
});

test('switching units preserves exact target bytes at all four range boundaries', () => {
  const units = /** @type {const} */ (['KB', 'KiB', 'MB', 'MiB']);
  for (const bytes of [10_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000]) {
    for (const unit of units) {
      const converted = convertTargetUnit(bytes / 1000, 'KB', unit);
      assert.equal(bytesFor(converted, unit), bytes, `${bytes} bytes in ${unit}`);
    }
  }
});

test('the default English compression errors contain no Chinese text', () => {
  for (const message of Object.values(errorMessages)) assert.doesNotMatch(message, /[\u3400-\u9fff]/u);
});
