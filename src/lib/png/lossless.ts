export type PngMetadataStatus = 'none-present' | 'removed';
export type PngInspection = {
  width: number;
  height: number;
  animated: boolean;
  hasAlpha: boolean;
  chunkTypes: string[];
  metadataChunks: string[];
};
export type PngLosslessResult =
  | { status: 'optimized'; blob: Blob; originalBytes: number; outputBytes: number; width: number; height: number; hasAlpha: boolean; metadataStatus: PngMetadataStatus }
  | { status: 'unchanged'; reason: 'not-smaller' | 'pixel-mismatch' | 'metadata-retained'; originalBytes: number; width: number; height: number; hasAlpha: boolean };

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const MAX_INPUT_BYTES = 20_000_000;
const MAX_PIXELS = 40_000_000;
const TILE = 256;
const PRIVATE_METADATA_CHUNKS = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
const CRC_TABLE = new Uint32Array(256);

for (let index = 0; index < CRC_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  CRC_TABLE[index] = value >>> 0;
}

function chunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Rejects non-PNG data, invalid CRCs, malformed chunks, and incomplete streams. */
export function inspectPng(bytes: Uint8Array): PngInspection {
  if (bytes.length < 33 || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) throw new Error('FORMAT_UNSUPPORTED');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(8) !== 13 || chunkType(bytes, 12) !== 'IHDR') throw new Error('FORMAT_UNSUPPORTED');
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (!width || !height || width * height > MAX_PIXELS) throw new Error('PIXEL_LIMIT');
  let offset = 8;
  let animated = false;
  let hasAlpha = bytes[25] === 4 || bytes[25] === 6;
  let sawHeader = false;
  let sawData = false;
  let reachedEnd = false;
  const chunkTypes: string[] = [];
  const metadataChunks: string[] = [];
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const next = dataEnd + 4;
    if (next > bytes.length) throw new Error('DECODE_FAILED');
    const type = chunkType(bytes, offset + 4);
    if (!sawHeader && (type !== 'IHDR' || length !== 13)) throw new Error('DECODE_FAILED');
    if (type === 'IHDR') {
      if (sawHeader || length !== 13) throw new Error('DECODE_FAILED');
      sawHeader = true;
    }
    if (crc32(bytes, offset + 4, dataEnd) !== view.getUint32(dataEnd)) throw new Error('DECODE_FAILED');
    chunkTypes.push(type);
    if (PRIVATE_METADATA_CHUNKS.has(type)) metadataChunks.push(type);
    if (type === 'acTL') animated = true;
    if (type === 'tRNS') hasAlpha = true;
    if (type === 'IDAT') sawData = true;
    if (type === 'IEND') {
      if (length !== 0 || next !== bytes.length) throw new Error('DECODE_FAILED');
      reachedEnd = true;
      break;
    }
    offset = next;
  }
  if (!sawHeader || !sawData || !reachedEnd) throw new Error('DECODE_FAILED');
  return { width, height, animated, hasAlpha, chunkTypes, metadataChunks };
}

function pixelTilesMatch(source: ImageBitmap, candidate: ImageBitmap): boolean {
  const left = new OffscreenCanvas(TILE, TILE);
  const right = new OffscreenCanvas(TILE, TILE);
  try {
    const leftContext = left.getContext('2d', { willReadFrequently: true });
    const rightContext = right.getContext('2d', { willReadFrequently: true });
    if (!leftContext || !rightContext) throw new Error('ENCODER_UNAVAILABLE');
    for (let y = 0; y < source.height; y += TILE) {
      for (let x = 0; x < source.width; x += TILE) {
        const width = Math.min(TILE, source.width - x);
        const height = Math.min(TILE, source.height - y);
        leftContext.clearRect(0, 0, TILE, TILE);
        rightContext.clearRect(0, 0, TILE, TILE);
        leftContext.drawImage(source, x, y, width, height, 0, 0, width, height);
        rightContext.drawImage(candidate, x, y, width, height, 0, 0, width, height);
        const a = leftContext.getImageData(0, 0, width, height).data;
        const b = rightContext.getImageData(0, 0, width, height).data;
        for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
      }
    }
    return true;
  } finally {
    left.width = left.height = 0;
    right.width = right.height = 0;
  }
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer, target.byteOffset, target.byteLength).setUint32(offset, value);
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(data.length + 12);
  writeUint32(chunk, 0, data.length);
  for (let index = 0; index < 4; index += 1) chunk[index + 4] = type.charCodeAt(index);
  chunk.set(data, 8);
  writeUint32(chunk, data.length + 8, crc32(chunk, 4, data.length + 8));
  return chunk;
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function filterRow(row: Uint8Array, previous: Uint8Array | undefined, bytesPerPixel: 3 | 4): Uint8Array<ArrayBuffer> {
  const candidates = Array.from({ length: 5 }, () => new Uint8Array(row.length + 1));
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (let filter = 0; filter < candidates.length; filter += 1) {
    const candidate = candidates[filter];
    candidate[0] = filter;
    let score = 0;
    for (let index = 0; index < row.length; index += 1) {
      const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
      const above = previous?.[index] ?? 0;
      const upperLeft = index >= bytesPerPixel ? previous?.[index - bytesPerPixel] ?? 0 : 0;
      let prediction = 0;
      if (filter === 1) prediction = left;
      else if (filter === 2) prediction = above;
      else if (filter === 3) prediction = Math.floor((left + above) / 2);
      else if (filter === 4) prediction = paeth(left, above, upperLeft);
      const value = (row[index] - prediction + 256) & 0xff;
      candidate[index + 1] = value;
      score += Math.min(value, 256 - value);
    }
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/** Encode browser-decoded RGBA deterministically instead of trusting browser-specific PNG encoders. */
async function encodeBitmapAsPng(source: ImageBitmap, canvas: OffscreenCanvas, hasAlpha: boolean): Promise<Blob> {
  if (typeof CompressionStream === 'undefined') throw new Error('ENCODER_UNAVAILABLE');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('ENCODER_UNAVAILABLE');
  context.clearRect(0, 0, source.width, source.height);
  context.drawImage(source, 0, 0);
  let previous: Uint8Array | undefined;
  let compressed: Uint8Array;
  try {
    const compression = new CompressionStream('deflate');
    const compressedResult = new Response(compression.readable).arrayBuffer();
    const writer = compression.writable.getWriter();
    for (let rowIndex = 0; rowIndex < source.height; rowIndex += 1) {
      const rgba = context.getImageData(0, rowIndex, source.width, 1).data;
      const row = hasAlpha ? new Uint8Array(rgba) : new Uint8Array(source.width * 3);
      if (!hasAlpha) {
        for (let sourceIndex = 0, outputIndex = 0; sourceIndex < rgba.length; sourceIndex += 4) {
          row[outputIndex++] = rgba[sourceIndex];
          row[outputIndex++] = rgba[sourceIndex + 1];
          row[outputIndex++] = rgba[sourceIndex + 2];
        }
      }
      await writer.write(filterRow(row, previous, hasAlpha ? 4 : 3));
      previous = row;
    }
    await writer.close();
    compressed = new Uint8Array(await compressedResult);
  } catch {
    throw new Error('ENCODER_UNAVAILABLE');
  }
  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, source.width);
  writeUint32(ihdr, 4, source.height);
  ihdr.set([8, hasAlpha ? 6 : 2, 0, 0, 0], 8);
  const chunks = [new Uint8Array(PNG_SIGNATURE), makeChunk('IHDR', ihdr), makeChunk('sRGB', new Uint8Array([0])), makeChunk('IDAT', compressed), makeChunk('IEND', new Uint8Array())];
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const output = new Blob([bytes.buffer], { type: 'image/png' });
  return output;
}

/** Re-encode only when the output is smaller and decoded RGBA pixels, including alpha, match exactly. */
export async function optimizePngLosslessly(file: Blob): Promise<PngLosslessResult> {
  if (file.size > MAX_INPUT_BYTES) throw new Error('FILE_TOO_LARGE');
  if (file.type !== 'image/png') throw new Error('FORMAT_UNSUPPORTED');
  const header = inspectPng(new Uint8Array(await file.arrayBuffer()));
  if (header.animated) throw new Error('ANIMATION_UNSUPPORTED');
  let source: ImageBitmap;
  try { source = await createImageBitmap(file); }
  catch { throw new Error('DECODE_FAILED'); }
  let candidate: ImageBitmap | undefined;
  let canvas: OffscreenCanvas | undefined;
  try {
    if (source.width !== header.width || source.height !== header.height) throw new Error('DECODE_FAILED');
    canvas = new OffscreenCanvas(source.width, source.height);
    let output: Blob;
    try { output = await encodeBitmapAsPng(source, canvas, header.hasAlpha); }
    catch { throw new Error('ENCODER_UNAVAILABLE'); }
    if (output.type !== 'image/png') throw new Error('ENCODER_UNAVAILABLE');
    const common = { originalBytes: file.size, width: source.width, height: source.height, hasAlpha: header.hasAlpha };
    if (output.size >= file.size) return { status: 'unchanged', reason: 'not-smaller', ...common };
    const outputHeader = inspectPng(new Uint8Array(await output.arrayBuffer()));
    if (outputHeader.width !== header.width || outputHeader.height !== header.height) return { status: 'unchanged', reason: 'pixel-mismatch', ...common };
    if (outputHeader.hasAlpha !== header.hasAlpha) return { status: 'unchanged', reason: 'pixel-mismatch', ...common };
    if (outputHeader.metadataChunks.length) return { status: 'unchanged', reason: 'metadata-retained', ...common };
    try { candidate = await createImageBitmap(output); }
    catch { throw new Error('ENCODER_UNAVAILABLE'); }
    if (candidate.width !== source.width || candidate.height !== source.height || !pixelTilesMatch(source, candidate)) {
      return { status: 'unchanged', reason: 'pixel-mismatch', ...common };
    }
    return { status: 'optimized', blob: output, outputBytes: output.size, metadataStatus: header.metadataChunks.length ? 'removed' : 'none-present', ...common };
  } finally {
    candidate?.close();
    source.close();
    if (canvas) canvas.width = canvas.height = 0;
  }
}
