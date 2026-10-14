export const MAX_BATCH_FILES = 20;
export const MAX_BATCH_BYTES = 100_000_000;

export type BatchCandidate = { name: string; size: number; type: string };
export type BatchSelection = {
  accepted: boolean;
  totalBytes: number;
  itemErrors: Array<'FILE_TOO_LARGE' | 'FORMAT_UNSUPPORTED' | null>;
  error?: 'BATCH_TOO_LARGE';
  reason?: 'too-many-files' | 'total-bytes';
};

export function validateBatchSelection(files: readonly BatchCandidate[]): BatchSelection {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (files.length > MAX_BATCH_FILES) return { accepted: false, totalBytes, itemErrors: files.map(() => null), error: 'BATCH_TOO_LARGE', reason: 'too-many-files' };
  if (totalBytes > MAX_BATCH_BYTES) return { accepted: false, totalBytes, itemErrors: files.map(() => null), error: 'BATCH_TOO_LARGE', reason: 'total-bytes' };
  return {
    accepted: true,
    totalBytes,
    itemErrors: files.map((file) => file.size > 20_000_000 ? 'FILE_TOO_LARGE' : file.type !== 'image/png' ? 'FORMAT_UNSUPPORTED' : null)
  };
}

export function initialBatchConcurrency(deviceMemory?: number): 1 | 2 {
  return typeof deviceMemory === 'number' && deviceMemory <= 4 ? 1 : 2;
}

function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function safeZipName(input: string, used: Set<string>): string {
  const leaf = input.split(/[\\/]/).pop() ?? 'image.png';
  const clean = leaf.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/[^\p{L}\p{N}._ -]+/gu, '-').replace(/^\.+/, '').trim().slice(0, 120) || 'image.png';
  const baseName = clean.replace(/\.png$/i, '') || 'image';
  let candidate = `${baseName}-optimized.png`;
  let suffix = 2;
  while (used.has(candidate.toLocaleLowerCase())) candidate = `${baseName}-optimized-${suffix++}.png`;
  used.add(candidate.toLocaleLowerCase());
  return candidate;
}

function header(size: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(size) as Uint8Array<ArrayBuffer>;
}

function u16(view: DataView, offset: number, value: number): void { view.setUint16(offset, value, true); }
function u32(view: DataView, offset: number, value: number): void { view.setUint32(offset, value >>> 0, true); }

export async function createStoredZip(entries: Array<{ name: string; blob: Blob }>): Promise<{ blob: Blob; names: string[] }> {
  if (!entries.length) throw new Error('EMPTY_ZIP');
  const encoder = new TextEncoder();
  const used = new Set<string>();
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  const names: string[] = [];
  let localOffset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const name = safeZipName(entry.name, used);
    const nameBytes = encoder.encode(name) as Uint8Array<ArrayBuffer>;
    const bytes = new Uint8Array(await entry.blob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const checksum = crc32(bytes);
    const local = header(30);
    const localView = new DataView(local.buffer);
    u32(localView, 0, 0x04034b50); u16(localView, 4, 20); u16(localView, 6, 0x0800); u16(localView, 8, 0);
    u16(localView, 10, 0); u16(localView, 12, 0x0021); u32(localView, 14, checksum); u32(localView, 18, bytes.length); u32(localView, 22, bytes.length); u16(localView, 26, nameBytes.length); u16(localView, 28, 0);
    localParts.push(local, nameBytes, bytes);

    const central = header(46);
    const centralView = new DataView(central.buffer);
    u32(centralView, 0, 0x02014b50); u16(centralView, 4, 20); u16(centralView, 6, 20); u16(centralView, 8, 0x0800); u16(centralView, 10, 0);
    u16(centralView, 12, 0); u16(centralView, 14, 0x0021); u32(centralView, 16, checksum); u32(centralView, 20, bytes.length); u32(centralView, 24, bytes.length);
    u16(centralView, 28, nameBytes.length); u16(centralView, 30, 0); u16(centralView, 32, 0); u16(centralView, 34, 0); u16(centralView, 36, 0); u32(centralView, 38, 0); u32(centralView, 42, localOffset);
    centralParts.push(central, nameBytes);
    centralSize += central.length + nameBytes.length;
    localOffset += local.length + nameBytes.length + bytes.length;
    names.push(name);
  }

  const end = header(22);
  const endView = new DataView(end.buffer);
  u32(endView, 0, 0x06054b50); u16(endView, 4, 0); u16(endView, 6, 0); u16(endView, 8, entries.length); u16(endView, 10, entries.length);
  u32(endView, 12, centralSize); u32(endView, 16, localOffset); u16(endView, 20, 0);
  return { blob: new Blob([...localParts, ...centralParts, end], { type: 'application/zip' }), names };
}
