function read16(view: DataView, offset: number, little: boolean) { return view.getUint16(offset, little); }
function read32(view: DataView, offset: number, little: boolean) { return view.getUint32(offset, little); }

export function getJpegMetadata(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let offset = 2; let dpi = 0; let orientation = 1;
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1]; const length = view.getUint16(offset + 2, false); if (length < 2 || offset + length + 2 > bytes.length) break;
    if (marker === 0xe1 && String.fromCharCode(...bytes.subarray(offset + 4, offset + 10)) === 'Exif\0\0') {
      const tiff = offset + 10; const little = view.getUint16(tiff, false) === 0x4949; const ifd = tiff + read32(view, tiff + 4, little); const count = read16(view, ifd, little); let x = 0; let y = 0; let unit = 2;
      const rational = (entry: number) => { const data = tiff + read32(view, entry + 8, little); const denominator = read32(view, data + 4, little); return denominator ? read32(view, data, little) / denominator : 0; };
      for (let index = 0; index < count; index += 1) { const entry = ifd + 2 + index * 12; const tag = read16(view, entry, little); if (tag === 0x0112) orientation = read16(view, entry + 8, little); if (tag === 0x011a) x = rational(entry); if (tag === 0x011b) y = rational(entry); if (tag === 0x0128) unit = read16(view, entry + 8, little); }
      if (unit === 3) { x *= 2.54; y *= 2.54; } dpi = x && y ? Math.round((x + y) / 2) : 0;
    }
    if (marker >= 0xc0 && marker <= 0xc3) break;
    offset += length + 2;
  }
  return { dpi, orientation };
}

export function getPngMetadata(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let offset = 8; let dpi = 0; let alpha = bytes.length > 26 && [4, 6].includes(bytes[25]);
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false); if (offset + length + 12 > bytes.length) break;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === 'pHYs' && length >= 9 && view.getUint8(offset + 16) === 1) { const x = view.getUint32(offset + 8, false); const y = view.getUint32(offset + 12, false); dpi = x && y ? Math.round(((x + y) / 2) * .0254) : 0; }
    if (type === 'tRNS') alpha = true;
    offset += length + 12;
  }
  return { dpi, alpha };
}

export function getWebpMetadata(bytes: Uint8Array) {
  if (bytes.length < 12 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP') return { alpha: false };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let offset = 12; let alpha = false;
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.subarray(offset, offset + 4)); const length = view.getUint32(offset + 4, true); const data = offset + 8;
    if (data + length > bytes.length) break;
    if (type === 'ALPH') alpha = true;
    if (type === 'VP8X' && length >= 1 && (bytes[data] & 0x10) !== 0) alpha = true;
    if (type === 'VP8L' && length >= 5 && bytes[data] === 0x2f && (view.getUint32(data + 1, true) & 0x10000000) !== 0) alpha = true;
    offset = data + length + (length % 2);
  }
  return { alpha };
}
