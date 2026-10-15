const SOI = [0xff, 0xd8];

export function addJpegCommentPadding(bytes: Uint8Array, targetBytes: number) {
  if (bytes.length < 4 || bytes[0] !== SOI[0] || bytes[1] !== SOI[1]) throw new Error('FORMAT_UNSUPPORTED');
  if (!Number.isInteger(targetBytes) || targetBytes < bytes.length) throw new Error('TARGET_UNREACHABLE');
  let extra = targetBytes - bytes.length;
  if (extra === 0) return bytes;
  if (extra < 5) throw new Error('TARGET_UNREACHABLE');
  const chunks: Uint8Array[] = [];
  let remaining = extra;
  while (remaining > 0) {
    const total = Math.min(65_537, remaining);
    const payload = total - 4;
    const segment = new Uint8Array(payload + 4);
    segment.set([0xff, 0xfe, (payload + 2) >> 8, (payload + 2) & 0xff], 0);
    chunks.push(segment);
    remaining -= total;
  }
  const output = new Uint8Array(targetBytes);
  output.set(bytes.subarray(0, 2), 0);
  let offset = 2;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  output.set(bytes.subarray(2), offset);
  return output;
}
