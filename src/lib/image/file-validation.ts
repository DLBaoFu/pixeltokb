import type { ImageErrorCode } from './errors';

const MAX_FILE_BYTES = 20_000_000;
const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export class ImageValidationError extends Error {
  code: ImageErrorCode;

  constructor(code: ImageErrorCode) {
    super(code);
    this.name = 'ImageValidationError';
    this.code = code;
  }
}

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

function validatePng(bytes: Uint8Array) {
  if (bytes.length < 33 || !pngSignature.every((value, index) => bytes[index] === value)) {
    throw new ImageValidationError('FORMAT_UNSUPPORTED');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let sawHeader = false;
  let sawData = false;
  let sawEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new ImageValidationError('DECODE_FAILED');
    const type = ascii(bytes, offset + 4, 4);
    if (!sawHeader && (type !== 'IHDR' || length !== 13)) throw new ImageValidationError('DECODE_FAILED');
    if (type === 'IHDR') {
      if (sawHeader || length !== 13) throw new ImageValidationError('DECODE_FAILED');
      sawHeader = true;
    }
    if (type === 'acTL') throw new ImageValidationError('ANIMATION_UNSUPPORTED');
    if (type === 'IDAT') sawData = true;
    if (type === 'IEND') {
      if (length !== 0 || end !== bytes.length) throw new ImageValidationError('DECODE_FAILED');
      sawEnd = true;
      break;
    }
    offset = end;
  }
  if (!sawHeader || !sawData || !sawEnd) throw new ImageValidationError('DECODE_FAILED');
}

function validateWebp(bytes: Uint8Array) {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    throw new ImageValidationError('FORMAT_UNSUPPORTED');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) + 8 !== bytes.length) throw new ImageValidationError('DECODE_FAILED');
  let offset = 12;
  let sawImage = false;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    const end = dataStart + length;
    if (end > bytes.length) throw new ImageValidationError('DECODE_FAILED');
    if (type === 'ANIM' || type === 'ANMF') throw new ImageValidationError('ANIMATION_UNSUPPORTED');
    if (type === 'VP8X') {
      if (length < 10) throw new ImageValidationError('DECODE_FAILED');
      if ((bytes[dataStart] & 0x02) !== 0) throw new ImageValidationError('ANIMATION_UNSUPPORTED');
      sawImage = true;
    }
    if (type === 'VP8 ' || type === 'VP8L') sawImage = true;
    offset = end + (length % 2);
  }
  if (!sawImage || offset !== bytes.length) throw new ImageValidationError('DECODE_FAILED');
}

export async function validateImageFile(file: Blob & { type: string }): Promise<void> {
  if (file.size > MAX_FILE_BYTES) throw new ImageValidationError('FILE_TOO_LARGE');
  if (!supportedTypes.has(file.type)) throw new ImageValidationError('FORMAT_UNSUPPORTED');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === 'image/jpeg') {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new ImageValidationError('FORMAT_UNSUPPORTED');
    }
    return;
  }
  if (file.type === 'image/png') return validatePng(bytes);
  return validateWebp(bytes);
}
