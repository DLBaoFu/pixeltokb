import { validateImageFile } from '../lib/image/file-validation.ts';

type WorkRequest =
  | { type: 'compress'; file: File; targetBytes: number; output: 'auto' | 'jpeg' | 'webp' | 'png'; preserveDimensions: boolean; jpegBackground: string }
  | { type: 'resize'; file: File; width: number; height: number; mode: 'fit' | 'fill' | 'stretch'; output: 'png' | 'jpeg' | 'webp'; jpegBackground?: string }
  | { type: 'crop'; file: File; x: number; y: number; width: number; height: number; output: 'png' | 'jpeg' | 'webp'; jpegBackground: string };
type WorkResponse = { type: 'progress' | 'success' | 'error'; value?: number; blob?: Blob; width?: number; height?: number; bytes?: number; error?: string };

const post = (message: WorkResponse) => self.postMessage(message);

async function encode(canvas: OffscreenCanvas, format: string, quality?: number): Promise<Blob> {
  const blob = await canvas.convertToBlob({ type: format, ...(quality === undefined ? {} : { quality }) });
  if (!blob || blob.type !== format) throw new Error('ENCODER_UNAVAILABLE');
  return blob;
}

self.onmessage = async (event: MessageEvent<WorkRequest>) => {
  if (event.data.type !== 'compress' && event.data.type !== 'resize' && event.data.type !== 'crop') return;
  const { file } = event.data;
  let bitmap: ImageBitmap | null = null;
  try {
    await validateImageFile(file);
    try { bitmap = await createImageBitmap(file); }
    catch { throw new Error('DECODE_FAILED'); }
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error('PIXEL_LIMIT');
    if (event.data.type === 'crop') {
      const { x, y, width, height, output, jpegBackground } = event.data;
      if (![x, y, width, height].every(Number.isFinite) || !['png', 'jpeg', 'webp'].includes(output) || !/^#[0-9a-f]{6}$/i.test(jpegBackground)) throw new Error('DECODE_FAILED');
      const safeOutput = output === 'jpeg' && file.type !== 'image/jpeg' ? 'png' : output;
      const cropX = Math.max(0, Math.min(bitmap.width - 1, Math.round(x)));
      const cropY = Math.max(0, Math.min(bitmap.height - 1, Math.round(y)));
      const cropWidth = Math.max(1, Math.min(bitmap.width - cropX, Math.round(width)));
      const cropHeight = Math.max(1, Math.min(bitmap.height - cropY, Math.round(height)));
      const canvas = new OffscreenCanvas(cropWidth, cropHeight);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ENCODER_UNAVAILABLE');
      if (safeOutput === 'jpeg') { context.fillStyle = jpegBackground; context.fillRect(0, 0, cropWidth, cropHeight); }
      context.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      const format = safeOutput === 'png' ? 'image/png' : safeOutput === 'jpeg' ? 'image/jpeg' : 'image/webp';
      const blob = await encode(canvas, format, .92);
      post({ type: 'success', blob, width: cropWidth, height: cropHeight, bytes: blob.size });
      return;
    }
    if (event.data.type === 'resize') {
      const { width: targetWidth, height: targetHeight, mode, output, jpegBackground = '#ffffff' } = event.data;
      if (!['fit', 'fill', 'stretch'].includes(mode) || !['png', 'jpeg', 'webp'].includes(output) || !/^#[0-9a-f]{6}$/i.test(jpegBackground)) throw new Error('DECODE_FAILED');
      const safeOutput = output === 'jpeg' && file.type !== 'image/jpeg' ? 'png' : output;
      if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight) || targetWidth < 1 || targetHeight < 1 || targetWidth * targetHeight > 40_000_000) throw new Error('PIXEL_LIMIT');
      const canvas = new OffscreenCanvas(Math.round(targetWidth), Math.round(targetHeight));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ENCODER_UNAVAILABLE');
      if (safeOutput === 'jpeg') { context.fillStyle = jpegBackground; context.fillRect(0, 0, targetWidth, targetHeight); }
      if (mode === 'stretch') context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      else if (mode === 'fit') {
        const scale = Math.min(targetWidth / bitmap.width, targetHeight / bitmap.height); const drawWidth = bitmap.width * scale; const drawHeight = bitmap.height * scale;
        context.drawImage(bitmap, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight);
      } else {
        const scale = Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height);
        const sourceWidth = targetWidth / scale; const sourceHeight = targetHeight / scale; const sourceX = (bitmap.width - sourceWidth) / 2; const sourceY = (bitmap.height - sourceHeight) / 2;
        context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
      }
      const format = safeOutput === 'png' ? 'image/png' : safeOutput === 'jpeg' ? 'image/jpeg' : 'image/webp';
      const blob = await encode(canvas, format, .92);
      post({ type: 'success', blob, width: Math.round(targetWidth), height: Math.round(targetHeight), bytes: blob.size });
      return;
    }
    const { targetBytes, output, preserveDimensions, jpegBackground } = event.data;
    if (!Number.isFinite(targetBytes) || targetBytes < 1 || targetBytes > 20_000_000 || !['auto', 'jpeg', 'webp', 'png'].includes(output) || typeof preserveDimensions !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(jpegBackground)) throw new Error('DECODE_FAILED');
    let width = bitmap.width; let height = bitmap.height;
    const canvas = new OffscreenCanvas(width, height); const context = canvas.getContext('2d');
    if (!context) throw new Error('ENCODER_UNAVAILABLE');
    const format = output === 'jpeg' ? 'image/jpeg' : output === 'webp' ? 'image/webp' : output === 'png' ? 'image/png' : file.type === 'image/png' ? 'image/webp' : file.type;
    const drawAtCurrentSize = () => {
      canvas.width = width; canvas.height = height;
      if (format === 'image/jpeg') { context.fillStyle = jpegBackground; context.fillRect(0, 0, width, height); }
      context.drawImage(bitmap!, 0, 0, width, height);
    };
    drawAtCurrentSize();
    const started = Date.now();
    let attempts = 0;
    const tryEncode = async (quality?: number) => {
      if (Date.now() - started > 30_000) throw new Error('PROCESSING_TIMEOUT');
      const candidate = await encode(canvas, format, quality);
      attempts += 1;
      post({ type: 'progress', value: Math.round(attempts / 20 * 100) });
      return candidate;
    };
    while (attempts < 20) {
      const first = await tryEncode(format === 'image/png' ? undefined : .98);
      if (first.size <= targetBytes) {
        post({ type: 'success', blob: first, width, height, bytes: first.size });
        return;
      }
      let smallest = first;
      if (format !== 'image/png' && attempts < 20) {
        smallest = await tryEncode(.12);
        if (smallest.size <= targetBytes) {
          let best = smallest;
          let low = .12;
          let high = .98;
          for (let search = 0; search < 6 && attempts < 20; search += 1) {
            const middle = (low + high) / 2;
            const candidate = await tryEncode(middle);
            if (candidate.size <= targetBytes) { best = candidate; low = middle; }
            else high = middle;
          }
          post({ type: 'success', blob: best, width, height, bytes: best.size });
          return;
        }
      }
      if (preserveDimensions || (width === 1 && height === 1)) break;
      const scale = Math.max(.15, Math.min(.85, Math.sqrt(targetBytes / smallest.size) * .9));
      const nextWidth = Math.max(1, Math.floor(width * scale));
      const nextHeight = Math.max(1, Math.floor(height * scale));
      if (nextWidth === width && nextHeight === height) break;
      width = nextWidth; height = nextHeight;
      drawAtCurrentSize();
    }
    throw new Error('TARGET_UNREACHABLE');
  } catch (error) { post({ type: 'error', error: error instanceof Error ? error.message : 'DECODE_FAILED' }); }
  finally { bitmap?.close(); }
};
