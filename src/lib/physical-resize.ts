import { getJpegMetadata, getPngMetadata } from './image/metadata.ts';

export type PhysicalUnit = 'mm' | 'in';
export type PhysicalOutput = 'jpeg' | 'png';

export function pixelsFromPhysical(value: number, unit: PhysicalUnit, dpi: number) {
  if (![value, dpi].every(Number.isFinite) || value <= 0 || dpi <= 0) return null;
  const inches = unit === 'mm' ? value / 25.4 : value;
  const pixels = Math.round(inches * dpi);
  return pixels >= 1 && pixels <= 10_000 ? pixels : null;
}

export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const concat = (parts: Uint8Array[]) => {
  const length = parts.reduce((total, part) => total + part.length, 0); const output = new Uint8Array(length); let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
};

export function withJpegDpi(source: Uint8Array, dpi: number) {
  if (source[0] !== 0xff || source[1] !== 0xd8 || !Number.isInteger(dpi) || dpi < 1 || dpi > 65_535) throw new Error('DPI_WRITE_FAILED');
  const jfif = new Uint8Array([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, dpi >> 8, dpi & 0xff, dpi >> 8, dpi & 0xff, 0, 0]);
  let offset = 2; const parts = [source.subarray(0, 2), jfif];
  while (offset + 4 <= source.length && source[offset] === 0xff) {
    const marker = source[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = (source[offset + 2] << 8) | source[offset + 3];
    if (length < 2 || offset + length + 2 > source.length) break;
    const isJfif = marker === 0xe0 && String.fromCharCode(...source.subarray(offset + 4, offset + 9)) === 'JFIF\0';
    if (!isJfif) parts.push(source.subarray(offset, offset + length + 2));
    offset += length + 2;
  }
  parts.push(source.subarray(offset));
  return concat(parts);
}

export function withPngDpi(source: Uint8Array, dpi: number) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => source[index] === value) || !Number.isFinite(dpi) || dpi <= 0) throw new Error('DPI_WRITE_FAILED');
  const ppm = Math.round(dpi / .0254); const payload = new Uint8Array(9); const payloadView = new DataView(payload.buffer);
  payloadView.setUint32(0, ppm, false); payloadView.setUint32(4, ppm, false); payload[8] = 1;
  const type = new TextEncoder().encode('pHYs'); const chunk = new Uint8Array(21); const view = new DataView(chunk.buffer);
  view.setUint32(0, 9, false); chunk.set(type, 4); chunk.set(payload, 8); view.setUint32(17, crc32(chunk.subarray(4, 17)), false);
  const parts = [source.subarray(0, 8)]; let offset = 8; let inserted = false;
  while (offset + 12 <= source.length) {
    const length = new DataView(source.buffer, source.byteOffset + offset).getUint32(0, false); const end = offset + length + 12;
    if (end > source.length) throw new Error('DPI_WRITE_FAILED');
    const chunkType = String.fromCharCode(...source.subarray(offset + 4, offset + 8));
    if (chunkType === 'pHYs') { offset = end; continue; }
    if (!inserted && chunkType === 'IDAT') { parts.push(chunk); inserted = true; }
    parts.push(source.subarray(offset, end)); offset = end;
  }
  if (!inserted) throw new Error('DPI_WRITE_FAILED');
  return concat(parts);
}

export function verifyWrittenDpi(bytes: Uint8Array, output: PhysicalOutput, dpi: number) {
  const actual = output === 'jpeg' ? getJpegMetadata(bytes).dpi : getPngMetadata(bytes).dpi;
  return actual === dpi ? actual : 0;
}
