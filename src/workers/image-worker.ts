import { validateImageFile } from '../lib/image/file-validation.ts';
import { optimizePngLosslessly, type PngMetadataStatus } from '../lib/png/lossless.ts';
import { verifyWrittenDpi, withJpegDpi, withPngDpi } from '../lib/physical-resize.ts';
import { removeSampledBackground } from '../lib/background-removal.ts';
import { mergedCanvasSize, type MergeLayout } from '../lib/photo-signature-merge.ts';
import { addJpegCommentPadding } from '../lib/jpeg-padding.ts';
import { buildPhotoSheetPdf, type Paper } from '../lib/pdf-sheet.ts';
import { stripPrivacyMetadata, type PrivacyMetadataStatus } from '../lib/image/privacy-metadata.ts';

type WorkRequest = (
  | { type: 'compress'; file: File; targetBytes: number; output: 'auto' | 'jpeg' | 'webp' | 'png'; preserveDimensions: boolean; jpegBackground: string }
  | { type: 'optimize-png'; file: File }
  | { type: 'signature'; file: File; crop: { left: number; top: number; width: number; height: number }; width: number; height: number; targetBytes: number }
  | { type: 'physical-resize'; file: File; width: number; height: number; dpi: number; output: 'jpeg' | 'png' }
  | { type: 'resize'; file: File; width: number; height: number; mode: 'fit' | 'fill' | 'stretch'; output: 'png' | 'jpeg' | 'webp'; jpegBackground?: string }
  | { type: 'crop'; file: File; x: number; y: number; width: number; height: number; output: 'png' | 'jpeg' | 'webp'; jpegBackground: string }
  | { type: 'remove-background'; file: File; tolerance: number }
  | { type: 'merge'; photo: File; signature: File; layout: MergeLayout; background: string }
  | { type: 'print-sheet'; file: File; paper: Paper; photoWidthMm: number; photoHeightMm: number; copies: number }
  | { type: 'increase-size'; file: File; targetBytes: number; mode: 'quality' | 'padding' }
) & { erasePrivacyMetadata?: boolean };
type WorkResponse = { type: 'progress' | 'success' | 'error'; value?: number; blob?: Blob; width?: number; height?: number; bytes?: number; dpi?: number; originalBytes?: number; hasAlpha?: boolean; outcome?: 'optimized' | 'unchanged'; reason?: 'not-smaller' | 'pixel-mismatch' | 'metadata-retained'; metadataStatus?: PngMetadataStatus; privacyMetadataStatus?: PrivacyMetadataStatus; error?: string };

const post = (message: WorkResponse, erasePrivacyMetadata = false) => {
  if (message.type !== 'success' || !message.blob || !message.blob.type.startsWith('image/')) { self.postMessage(message); return; }
  const sourceBlob = message.blob;
  void (async () => {
    if (!erasePrivacyMetadata) { self.postMessage({ ...message, privacyMetadataStatus: 'unchecked' }); return; }
    const result = await stripPrivacyMetadata(sourceBlob);
    self.postMessage({ ...message, blob: result.blob, bytes: result.blob.size, privacyMetadataStatus: result.status });
  })().catch((error: unknown) => self.postMessage({ type: 'error', error: error instanceof Error && error.message === 'METADATA_RETAINED' ? 'METADATA_RETAINED' : 'METADATA_CLEANUP_FAILED' }));
};
const knownErrors = new Set(['FILE_TOO_LARGE', 'BATCH_TOO_LARGE', 'PIXEL_LIMIT', 'FORMAT_UNSUPPORTED', 'ANIMATION_UNSUPPORTED', 'DECODE_FAILED', 'ENCODER_UNAVAILABLE', 'DPI_WRITE_FAILED', 'TARGET_UNREACHABLE', 'PROCESSING_TIMEOUT', 'OUT_OF_MEMORY', 'CANCELLED', 'METADATA_RETAINED', 'METADATA_CLEANUP_FAILED']);

async function encode(canvas: OffscreenCanvas, format: string, quality?: number): Promise<Blob> {
  const blob = await canvas.convertToBlob({ type: format, ...(quality === undefined ? {} : { quality }) });
  if (!blob || blob.type !== format) throw new Error('ENCODER_UNAVAILABLE');
  return blob;
}

self.onmessage = async (event: MessageEvent<WorkRequest>) => {
  if (event.data.type !== 'compress' && event.data.type !== 'optimize-png' && event.data.type !== 'signature' && event.data.type !== 'physical-resize' && event.data.type !== 'resize' && event.data.type !== 'crop' && event.data.type !== 'remove-background' && event.data.type !== 'merge' && event.data.type !== 'print-sheet' && event.data.type !== 'increase-size') return;
  const file = 'file' in event.data ? event.data.file : event.data.photo;
  let bitmap: ImageBitmap | null = null;
  try {
    if (event.data.type === 'optimize-png') {
      post({ type: 'progress', value: 10 });
      const result = await optimizePngLosslessly(file);
      post({ type: 'progress', value: 100 });
      if (result.status === 'optimized') {
        post({ type: 'success', outcome: 'optimized', blob: result.blob, width: result.width, height: result.height, bytes: result.outputBytes, originalBytes: result.originalBytes, hasAlpha: result.hasAlpha, metadataStatus: result.metadataStatus });
      } else {
        post({ type: 'success', outcome: 'unchanged', reason: result.reason, width: result.width, height: result.height, bytes: result.originalBytes, originalBytes: result.originalBytes, hasAlpha: result.hasAlpha });
      }
      return;
    }
    await validateImageFile(file);
    try { bitmap = await createImageBitmap(file); }
    catch { throw new Error('DECODE_FAILED'); }
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error('PIXEL_LIMIT');
    if (event.data.type === 'remove-background') {
      const { tolerance } = event.data;
      if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 442) throw new Error('DECODE_FAILED');
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('ENCODER_UNAVAILABLE');
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
      const background = { r: pixels.data[0] ?? 255, g: pixels.data[1] ?? 255, b: pixels.data[2] ?? 255 };
      removeSampledBackground(pixels.data, background, tolerance);
      context.putImageData(pixels, 0, 0);
      const blob = await encode(canvas, 'image/png');
      post({ type: 'success', blob, width: bitmap.width, height: bitmap.height, bytes: blob.size, hasAlpha: true }, event.data.erasePrivacyMetadata === true);
      return;
    }
    if (event.data.type === 'merge') {
      await validateImageFile(event.data.photo); await validateImageFile(event.data.signature);
      const signatureBitmap = await createImageBitmap(event.data.signature); const size = mergedCanvasSize(bitmap, signatureBitmap, event.data.layout);
      if (size.width * size.height > 40_000_000 || !/^#[0-9a-f]{6}$/i.test(event.data.background)) { signatureBitmap.close(); throw new Error('PIXEL_LIMIT'); }
      const canvas = new OffscreenCanvas(size.width, size.height); const context = canvas.getContext('2d'); if (!context) { signatureBitmap.close(); throw new Error('ENCODER_UNAVAILABLE'); }
      context.fillStyle = event.data.background; context.fillRect(0, 0, size.width, size.height);
      if (event.data.layout === 'vertical') { context.drawImage(bitmap, 0, 0); context.drawImage(signatureBitmap, 0, bitmap.height); }
      else { context.drawImage(bitmap, 0, 0); context.drawImage(signatureBitmap, bitmap.width, 0); }
      const blob = await encode(canvas, 'image/png'); signatureBitmap.close(); post({ type: 'success', blob, width: size.width, height: size.height, bytes: blob.size, hasAlpha: false }, event.data.erasePrivacyMetadata === true); return;
    }
    if (event.data.type === 'print-sheet') {
      const { paper, photoWidthMm, photoHeightMm, copies } = event.data;
      if (!['A4', 'Letter'].includes(paper) || ![photoWidthMm, photoHeightMm, copies].every(Number.isFinite)) throw new Error('DECODE_FAILED');
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); const context = canvas.getContext('2d'); if (!context) throw new Error('ENCODER_UNAVAILABLE'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, bitmap.width, bitmap.height); context.drawImage(bitmap, 0, 0);
      const jpeg = await encode(canvas, 'image/jpeg', .95); const pdf = buildPhotoSheetPdf(new Uint8Array(await jpeg.arrayBuffer()), bitmap.width, bitmap.height, photoWidthMm, photoHeightMm, paper, Math.round(copies));
      const blob = new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' }); post({ type: 'success', blob, width: bitmap.width, height: bitmap.height, bytes: blob.size }); return;
    }
    if (event.data.type === 'increase-size') {
      const { targetBytes, mode } = event.data; if (!Number.isInteger(targetBytes) || targetBytes < file.size || targetBytes > 20_000_000 || !['quality', 'padding'].includes(mode)) throw new Error('TARGET_UNREACHABLE');
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); const context = canvas.getContext('2d'); if (!context) throw new Error('ENCODER_UNAVAILABLE'); context.drawImage(bitmap, 0, 0);
      const encoded = await encode(canvas, 'image/jpeg', .98); const source = new Uint8Array(await encoded.arrayBuffer());
      if (mode === 'padding') { const padded = addJpegCommentPadding(source, targetBytes); post({ type: 'success', blob: new Blob([padded.buffer as ArrayBuffer], { type: 'image/jpeg' }), width: bitmap.width, height: bitmap.height, bytes: padded.byteLength }, event.data.erasePrivacyMetadata === true); return; }
      let best: Uint8Array<ArrayBufferLike> | null = null; for (const quality of [.98, .99, 1]) { const candidate = await encode(canvas, 'image/jpeg', quality); if (candidate.size >= file.size && candidate.size <= targetBytes && (!best || candidate.size > best.length)) best = new Uint8Array(await candidate.arrayBuffer()); }
      if (!best) throw new Error('TARGET_UNREACHABLE'); post({ type: 'success', blob: new Blob([best.buffer as ArrayBuffer], { type: 'image/jpeg' }), width: bitmap.width, height: bitmap.height, bytes: best.length }, event.data.erasePrivacyMetadata === true); return;
    }
    if (event.data.type === 'signature') {
      const { crop, width: targetWidth, height: targetHeight, targetBytes } = event.data;
      if (![crop.left, crop.top, crop.width, crop.height, targetWidth, targetHeight, targetBytes].every(Number.isFinite) || targetWidth < 1 || targetHeight < 1 || targetWidth * targetHeight > 40_000_000 || targetBytes < 1 || targetBytes > 20_000_000) throw new Error('PIXEL_LIMIT');
      const cropX = Math.max(0, Math.min(bitmap.width - 1, Math.round(crop.left)));
      const cropY = Math.max(0, Math.min(bitmap.height - 1, Math.round(crop.top)));
      const cropWidth = Math.max(1, Math.min(bitmap.width - cropX, Math.round(crop.width)));
      const cropHeight = Math.max(1, Math.min(bitmap.height - cropY, Math.round(crop.height)));
      const canvas = new OffscreenCanvas(Math.round(targetWidth), Math.round(targetHeight));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ENCODER_UNAVAILABLE');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, targetWidth, targetHeight);
      context.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
      const started = Date.now(); let attempts = 0; let low = .08; let high = .96; let best: Blob | null = null;
      while (attempts < 12 && low <= high) {
        if (Date.now() - started > 30_000) throw new Error('PROCESSING_TIMEOUT');
        const quality = (low + high) / 2;
        const candidate = await encode(canvas, 'image/jpeg', quality); attempts += 1;
        post({ type: 'progress', value: Math.round(attempts / 12 * 100) });
        if (candidate.size <= targetBytes) { best = candidate; low = quality + .002; }
        else high = quality - .002;
      }
      if (!best) throw new Error('TARGET_UNREACHABLE');
      post({ type: 'success', blob: best, width: Math.round(targetWidth), height: Math.round(targetHeight), bytes: best.size }, event.data.erasePrivacyMetadata === true);
      return;
    }
    if (event.data.type === 'physical-resize') {
      const { width, height, dpi, output } = event.data;
      if (![width, height, dpi].every(Number.isFinite) || width < 1 || height < 1 || width * height > 40_000_000 || !Number.isInteger(dpi) || dpi < 1 || dpi > 65_535 || !['jpeg', 'png'].includes(output)) throw new Error('PIXEL_LIMIT');
      const canvas = new OffscreenCanvas(Math.round(width), Math.round(height)); const context = canvas.getContext('2d');
      if (!context) throw new Error('ENCODER_UNAVAILABLE');
      if (output === 'jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
      context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, width, height);
      const encoded = await encode(canvas, output === 'jpeg' ? 'image/jpeg' : 'image/png', .92);
      const bytes = new Uint8Array(await encoded.arrayBuffer()); const tagged = output === 'jpeg' ? withJpegDpi(bytes, dpi) : withPngDpi(bytes, dpi);
      const verifiedDpi = verifyWrittenDpi(tagged, output, dpi); if (verifiedDpi !== dpi) throw new Error('DPI_WRITE_FAILED');
      post({ type: 'success', blob: new Blob([tagged], { type: output === 'jpeg' ? 'image/jpeg' : 'image/png' }), width: Math.round(width), height: Math.round(height), bytes: tagged.byteLength, dpi: verifiedDpi }, event.data.erasePrivacyMetadata === true);
      return;
    }
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
      post({ type: 'success', blob, width: cropWidth, height: cropHeight, bytes: blob.size }, event.data.erasePrivacyMetadata === true);
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
      post({ type: 'success', blob, width: Math.round(targetWidth), height: Math.round(targetHeight), bytes: blob.size }, event.data.erasePrivacyMetadata === true);
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
        post({ type: 'success', blob: first, width, height, bytes: first.size }, event.data.erasePrivacyMetadata === true);
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
          post({ type: 'success', blob: best, width, height, bytes: best.size }, event.data.erasePrivacyMetadata === true);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DECODE_FAILED';
    const normalized = knownErrors.has(message) ? message : error instanceof RangeError || /(?:out of memory|allocation failed)/i.test(message) ? 'OUT_OF_MEMORY' : 'DECODE_FAILED';
    post({ type: 'error', error: normalized });
  }
  finally { bitmap?.close(); }
};
