export type PrivacyMetadataStatus = 'removed' | 'none-present' | 'preserved';

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

function jpegPrivacySegments(bytes: Uint8Array) {
  const segments: Uint8Array[] = [];
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return segments;
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const markerStart = offset;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
    const end = offset + length;
    if (length < 2 || end > bytes.length) break;
    if (marker === 0xe1 || marker === 0xed || (marker === 0xfe && !isEmptyJpegComment(bytes, offset + 2, end))) segments.push(bytes.slice(markerStart, end));
    offset = end;
  }
  return segments;
}

function normalizeJpegExifOrientation(segment: Uint8Array) {
  const output = segment.slice();
  if (output.length < 22 || text(output, 4, 10) !== 'Exif\0\0') return output;
  try {
    const tiff = 10;
    const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
    const byteOrder = view.getUint16(tiff, false);
    const little = byteOrder === 0x4949;
    if (!little && byteOrder !== 0x4d4d) return output;
    const ifd = tiff + view.getUint32(tiff + 4, little);
    const count = view.getUint16(ifd, little);
    for (let index = 0; index < count; index += 1) {
      const entry = ifd + 2 + index * 12;
      if (entry + 12 > output.length) return output;
      if (view.getUint16(entry, little) === 0x0112 && view.getUint16(entry + 2, little) === 3 && view.getUint32(entry + 4, little) === 1) {
        view.setUint16(entry + 8, 1, little);
        return output;
      }
    }
  } catch { return segment.slice(); }
  return output;
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

function pngPrivacyChunks(bytes: Uint8Array) {
  const chunks: Uint8Array[] = [];
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 20 || !signature.every((value, index) => bytes[index] === value)) return chunks;
  const privateChunks = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
    const end = offset + length + 12;
    if (end > bytes.length) break;
    const kind = text(bytes, offset + 4, offset + 8);
    if (privateChunks.has(kind)) chunks.push(bytes.slice(offset, end));
    offset = end;
    if (kind === 'IEND') break;
  }
  return chunks;
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

function webpPrivacyChunks(bytes: Uint8Array) {
  const chunks: Uint8Array[] = [];
  if (bytes.length < 12 || text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 12) !== 'WEBP') return chunks;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = text(bytes, offset, offset + 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const end = offset + 8 + length + (length % 2);
    if (end > bytes.length) break;
    if (kind === 'EXIF' || kind === 'XMP ') chunks.push(bytes.slice(offset, end));
    offset = end;
  }
  return chunks;
}

function sameParts(left: Uint8Array[], right: Uint8Array[]) {
  return left.length === right.length && left.every((part, index) => part.length === right[index]?.length && part.every((byte, byteIndex) => byte === right[index]![byteIndex]));
}

function insertJpegPrivacyMetadata(bytes: Uint8Array, segments: Uint8Array[]) {
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('METADATA_PRESERVATION_FAILED');
  return concat([bytes.subarray(0, 2), ...segments, bytes.subarray(2)]);
}

function insertPngPrivacyMetadata(bytes: Uint8Array, chunks: Uint8Array[]) {
  if (bytes.length < 33 || text(bytes, 12, 16) !== 'IHDR') throw new Error('METADATA_PRESERVATION_FAILED');
  const headerEnd = 8 + new DataView(bytes.buffer, bytes.byteOffset + 8, 4).getUint32(0, false) + 12;
  if (headerEnd > bytes.length) throw new Error('METADATA_PRESERVATION_FAILED');
  return concat([bytes.subarray(0, headerEnd), ...chunks, bytes.subarray(headerEnd)]);
}

function webpDimensions(bytes: Uint8Array) {
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = text(bytes, offset, offset + 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const data = offset + 8;
    const end = data + length + (length % 2);
    if (end > bytes.length) break;
    if (kind === 'VP8X' && length >= 10) return { width: 1 + bytes[data + 4]! + (bytes[data + 5]! << 8) + (bytes[data + 6]! << 16), height: 1 + bytes[data + 7]! + (bytes[data + 8]! << 8) + (bytes[data + 9]! << 16) };
    if (kind === 'VP8 ' && length >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) return { width: (bytes[data + 6]! | (bytes[data + 7]! << 8)) & 0x3fff, height: (bytes[data + 8]! | (bytes[data + 9]! << 8)) & 0x3fff };
    if (kind === 'VP8L' && length >= 5 && bytes[data] === 0x2f) {
      const bits = new DataView(bytes.buffer, bytes.byteOffset + data + 1, 4).getUint32(0, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    offset = end;
  }
  throw new Error('METADATA_PRESERVATION_FAILED');
}

function insertWebpPrivacyMetadata(bytes: Uint8Array, chunks: Uint8Array[]) {
  if (bytes.length < 12 || text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 12) !== 'WEBP') throw new Error('METADATA_PRESERVATION_FAILED');
  const privacyFlags = chunks.reduce((flags, chunk) => flags | (text(chunk, 0, 4) === 'EXIF' ? 0x08 : text(chunk, 0, 4) === 'XMP ' ? 0x04 : 0), 0);
  if (!privacyFlags) throw new Error('METADATA_PRESERVATION_FAILED');
  const outputChunks: Uint8Array[] = [];
  let offset = 12;
  let hasExtendedHeader = false;
  while (offset + 8 <= bytes.length) {
    const kind = text(bytes, offset, offset + 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const end = offset + 8 + length + (length % 2);
    if (end > bytes.length) throw new Error('METADATA_PRESERVATION_FAILED');
    const chunk = bytes.slice(offset, end);
    if (kind === 'VP8X' && length >= 10) { chunk[8] = (chunk[8]! & ~0x0c) | privacyFlags; hasExtendedHeader = true; }
    outputChunks.push(chunk);
    offset = end;
  }
  if (offset !== bytes.length) throw new Error('METADATA_PRESERVATION_FAILED');
  if (!hasExtendedHeader) {
    const dimensions = webpDimensions(bytes);
    const extended = new Uint8Array(18);
    extended.set([0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, privacyFlags], 0);
    const width = dimensions.width - 1; const height = dimensions.height - 1;
    extended.set([width & 0xff, (width >>> 8) & 0xff, (width >>> 16) & 0xff, height & 0xff, (height >>> 8) & 0xff, (height >>> 16) & 0xff], 12);
    outputChunks.unshift(extended);
  }
  const output = concat([bytes.subarray(0, 12), ...outputChunks, ...chunks]);
  new DataView(output.buffer).setUint32(4, output.length - 8, true);
  return output;
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

export async function preservePrivacyMetadata(sources: Blob[], encoded: Blob): Promise<{ blob: Blob; status: 'preserved' | 'none-present' }> {
  const sourceParts: Uint8Array[] = [];
  let sourcesWithMetadata = 0;
  for (const source of sources) {
    const bytes = new Uint8Array(await source.arrayBuffer());
    const supportedSource = source.type === 'image/jpeg' || source.type === 'image/png' || source.type === 'image/webp';
    const parts = source.type === 'image/jpeg' ? jpegPrivacySegments(bytes).map(normalizeJpegExifOrientation) : source.type === 'image/png' ? pngPrivacyChunks(bytes) : source.type === 'image/webp' ? webpPrivacyChunks(bytes) : [];
    if (supportedSource && hasPrivacyMetadata(bytes, source.type) && !parts.length) throw new Error('METADATA_PRESERVATION_FAILED');
    if (parts.length && source.type !== encoded.type) throw new Error('METADATA_PRESERVATION_FAILED');
    if (parts.length) sourcesWithMetadata += 1;
    if (sourcesWithMetadata > 1) throw new Error('METADATA_PRESERVATION_FAILED');
    sourceParts.push(...parts);
  }
  if (!sourceParts.length) return { blob: encoded, status: 'none-present' };
  const clean = await stripPrivacyMetadata(encoded);
  const cleanBytes = new Uint8Array(await clean.blob.arrayBuffer());
  const output = encoded.type === 'image/jpeg' ? insertJpegPrivacyMetadata(cleanBytes, sourceParts) : encoded.type === 'image/png' ? insertPngPrivacyMetadata(cleanBytes, sourceParts) : encoded.type === 'image/webp' ? insertWebpPrivacyMetadata(cleanBytes, sourceParts) : (() => { throw new Error('METADATA_PRESERVATION_FAILED'); })();
  const verified = encoded.type === 'image/jpeg' ? jpegPrivacySegments(output) : encoded.type === 'image/png' ? pngPrivacyChunks(output) : webpPrivacyChunks(output);
  if (!sameParts(sourceParts, verified)) throw new Error('METADATA_PRESERVATION_FAILED');
  return { blob: new Blob([output.buffer as ArrayBuffer], { type: encoded.type }), status: 'preserved' };
}

export function hasPrivacyMetadata(bytes: Uint8Array, mime: string) {
  if (mime === 'image/jpeg') return containsJpegPrivacyMetadata(bytes);
  if (mime === 'image/png') return containsPngPrivacyMetadata(bytes);
  if (mime === 'image/webp') return containsWebpPrivacyMetadata(bytes);
  return true;
}
