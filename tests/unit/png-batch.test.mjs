import assert from 'node:assert/strict';
import test from 'node:test';
import { createStoredZip, initialBatchConcurrency, MAX_BATCH_BYTES, MAX_BATCH_FILES, validateBatchSelection } from '../../src/lib/png/batch.ts';

test('batch selection enforces exact count, total byte, MIME, and per-file byte limits', () => {
  const valid = Array.from({ length: MAX_BATCH_FILES }, (_, index) => ({ name: `${index}.png`, size: 5_000_000, type: 'image/png' }));
  assert.deepEqual(validateBatchSelection(valid), { accepted: true, totalBytes: MAX_BATCH_BYTES, itemErrors: Array(MAX_BATCH_FILES).fill(null) });

  const tooMany = validateBatchSelection([...valid, { name: 'extra.png', size: 1, type: 'image/png' }]);
  assert.deepEqual([tooMany.accepted, tooMany.error, tooMany.reason], [false, 'BATCH_TOO_LARGE', 'too-many-files']);

  const tooLarge = validateBatchSelection([{ name: 'huge.png', size: MAX_BATCH_BYTES + 1, type: 'image/png' }]);
  assert.deepEqual([tooLarge.accepted, tooLarge.error, tooLarge.reason], [false, 'BATCH_TOO_LARGE', 'total-bytes']);

  const itemErrors = validateBatchSelection([
    { name: 'over.png', size: 20_000_001, type: 'image/png' },
    { name: 'wrong.jpg', size: 1_000, type: 'image/jpeg' },
    { name: 'valid.png', size: 20_000_000, type: 'image/png' }
  ]);
  assert.deepEqual(itemErrors.itemErrors, ['FILE_TOO_LARGE', 'FORMAT_UNSUPPORTED', null]);
});

test('batch concurrency starts at two and reduces to one on low-memory devices', () => {
  assert.equal(initialBatchConcurrency(), 2);
  assert.equal(initialBatchConcurrency(8), 2);
  assert.equal(initialBatchConcurrency(4), 1);
  assert.equal(initialBatchConcurrency(2), 1);
});

/** @param {Uint8Array} bytes */
function readStoredEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = [];
  let offset = 0;
  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0, 'ZIP entries must use the deterministic stored method');
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    entries.push({ name: decoder.decode(bytes.subarray(nameStart, nameStart + nameLength)), data: bytes.slice(dataStart, dataStart + compressedSize) });
    offset = dataStart + compressedSize;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50, 'central directory must follow local entries');
  return entries;
}

test('ZIP export sanitizes and deduplicates names while preserving successful file bytes', async () => {
  const first = Uint8Array.from([137, 80, 78, 71, 1, 2, 3]);
  const second = Uint8Array.from([137, 80, 78, 71, 4, 5, 6]);
  const archive = await createStoredZip([
    { name: '../unsafe\u0000.png', blob: new Blob([first], { type: 'image/png' }) },
    { name: '..\\unsafe\u0000.png', blob: new Blob([second], { type: 'image/png' }) }
  ]);
  assert.equal(archive.blob.type, 'application/zip');
  assert.deepEqual(archive.names, ['unsafe-optimized.png', 'unsafe-optimized-2.png']);
  const entries = readStoredEntries(new Uint8Array(await archive.blob.arrayBuffer()));
  assert.deepEqual(entries.map((entry) => entry.name), archive.names);
  assert.deepEqual(Array.from(entries[0].data), Array.from(first));
  assert.deepEqual(Array.from(entries[1].data), Array.from(second));
  assert.equal(entries.some((entry) => /[\\/]|\.\./.test(entry.name)), false);
});

test('ZIP export refuses an empty success set', async () => {
  await assert.rejects(createStoredZip([]), /EMPTY_ZIP/);
});
