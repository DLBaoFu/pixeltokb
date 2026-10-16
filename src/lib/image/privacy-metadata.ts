export type PrivacyMetadataStatus = 'removed' | 'none-present' | 'unchecked';

const text = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
const isEmptyJpegComment = (bytes: Uint8Array, payloadStart: number, segmentEnd: number) => bytes.subarray(payloadStart, segmentEnd).every((byte) => byte === 0);
const concat = (parts: Uint8Array[]) => {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
};

function stripJpeg(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('DECODE_FAILED');
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('DECODE_FAILED');
    let markerStart = offset;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined) throw new Error('DECODE_FAILED');
    if (marker === 0xd9) { parts.push(bytes.subarray(markerStart, offset)); offset = bytes.length; break; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { parts.push(bytes.subarray(markerStart, offset)); continue; }
    if (offset + 2 > bytes.length) throw new Error('DECODE_FAILED');
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
    const end = offset + length;
    if (length < 2 || end > bytes.length) throw new Error('DECODE_FAILED');
    const segment = bytes.subarray(markerStart, end);
    if (marker !== 0xe1 && marker !== 0xed && (marker !== 0xfe || isEmptyJpegComment(bytes, offset + 2, end))) parts.push(segment);
    offset = end;
    if (marker === 0xda) {
      let scan = offset;
      while (scan + 1 < bytes.length) {
        if (bytes[scan] !== 0xff) { scan += 1; continue; }
        const next = bytes[scan + 1]!;
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) { scan += 2; continue; }
        break;
      }
      parts.push(bytes.subarray(offset, scan));
      offset = scan;
    }
  }
  const output = concat(parts);
  if (containsJpegPrivacyMetadata(output)) throw new Error('METADATA_RETAINED');
  return output;
}

function containsJpegPrivacyMetadata(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return true;
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return true;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9) return false;
    if (marker === 0x01 || (marker !== undefined && marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return true;
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
    const end = offset + length;
    if (length < 2 || end > bytes.length) return true;
    if (marker === 0xe1 || marker === 0xed || (marker === 0xfe && !isEmptyJpegComment(bytes, offset + 2, end))) return true;
    offset = end;
    if (marker === 0xda) {
      while (offset + 1 < bytes.length) {
        if (bytes[offset] !== 0xff) { offset += 1; continue; }
        const next = bytes[offset + 1]!;
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) { offset += 2; continue; }
        break;
      }
    }
  }
  return true;
}

function stripPng(bytes: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 20 || !signature.every((value, index) => bytes[index] === value)) throw new Error('DECODE_FAILED');
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let offset = 8;
  let sawHeader = false;
  let sawEnd = false;
  const privateChunks = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
    const end = offset + length + 12;
    if (end > bytes.length) throw new Error('DECODE_FAILED');
    const kind = text(bytes, offset + 4, offset + 8);
    if (kind === 'IHDR') sawHeader = true;
    if (!privateChunks.has(kind)) parts.push(bytes.subarray(offset, end));
    offset = end;
    if (kind === 'IEND') { sawEnd = true; break; }
  }
  if (!sawHeader || !sawEnd || offset !== bytes.length) throw new Error('DECODE_FAILED');
  const output = concat(parts);
  if (containsPngPrivacyMetadata(output)) throw new Error('METADATA_RETAINED');
  return output;
}

function containsPngPrivacyMetadata(bytes: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 20 || !signature.every((value, index) => bytes[index] === value)) return true;
  const privateChunks = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
    const end = offset + length + 12;
    if (end > bytes.length) return true;
    const kind = text(bytes, offset + 4, offset + 8);
    if (privateChunks.has(kind)) return true;
    offset = end;
    if (kind === 'IEND') return offset !== bytes.length;
  }
  return true;
}

function stripWebp(bytes: Uint8Array) {
  if (bytes.length < 12 || text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 12) !== 'WEBP') throw new Error('DECODE_FAILED');
  const parts: Uint8Array[] = [bytes.subarray(0, 12)];
  const privateChunks = new Set(['EXIF', 'XMP ']);
  let offset = 12;
  let sawImageChunk = false;
  while (offset + 8 <= bytes.length) {
    const kind = text(bytes, offset, offset + 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const end = offset + 8 + length + (length % 2);
    if (end > bytes.length) throw new Error('DECODE_FAILED');
    if (kind === 'VP8 ' || kind === 'VP8L') sawImageChunk = true;
    if (kind === 'VP8X' && length >= 1) {
      const extension = bytes.slice(offset, end);
      extension[8] = extension[8]! & ~0x0c;
      parts.push(extension);
    } else if (!privateChunks.has(kind)) parts.push(bytes.subarray(offset, end));
    offset = end;
  }
  if (!sawImageChunk || offset !== bytes.length) throw new Error('DECODE_FAILED');
  const output = concat(parts);
  new DataView(output.buffer).setUint32(4, output.length - 8, true);
  if (containsWebpPrivacyMetadata(output)) throw new Error('METADATA_RETAINED');
  return output;
}

function containsWebpPrivacyMetadata(bytes: Uint8Array) {
  if (bytes.length < 12 || text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 12) !== 'WEBP') return true;
  if (new DataView(bytes.buffer, bytes.byteOffset).getUint32(4, true) !== bytes.length - 8) return true;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = text(bytes, offset, offset + 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const end = offset + 8 + length + (length % 2);
    if (end > bytes.length) return true;
    if (kind === 'EXIF' || kind === 'XMP ') return true;
    if (kind === 'VP8X' && length >= 1 && (bytes[offset + 8]! & 0x0c) !== 0) return true;
    offset = end;
  }
  return offset !== bytes.length;
}

export async function stripPrivacyMetadata(blob: Blob): Promise<{ blob: Blob; status: 'removed' | 'none-present' }> {
  const source = new Uint8Array(await blob.arrayBuffer());
  let output: Uint8Array;
  if (blob.type === 'image/jpeg') output = stripJpeg(source);
  else if (blob.type === 'image/png') output = stripPng(source);
  else if (blob.type === 'image/webp') output = stripWebp(source);
  else throw new Error('FORMAT_UNSUPPORTED');
  return { blob: new Blob([output.buffer as ArrayBuffer], { type: blob.type }), status: output.length < source.length ? 'removed' : 'none-present' };
}

export function hasPrivacyMetadata(bytes: Uint8Array, mime: string) {
  if (mime === 'image/jpeg') return containsJpegPrivacyMetadata(bytes);
  if (mime === 'image/png') return containsPngPrivacyMetadata(bytes);
  if (mime === 'image/webp') return containsWebpPrivacyMetadata(bytes);
  return true;
}
