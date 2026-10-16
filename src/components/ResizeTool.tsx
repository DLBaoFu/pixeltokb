import { useEffect, useRef, useState } from 'react';
import { traditionalize } from '../lib/traditionalize';
import { ImageValidationError, validateImageFile } from '../lib/image/file-validation';
import { resizePresetFromSearch, type ResizeMode } from '../lib/resize-presets';
import MetadataPrivacyToggle, { privacyMetadataErrorText, privacyMetadataResultText } from './MetadataPrivacyToggle';

type OutputFormat = 'png' | 'jpeg' | 'webp';
type ResizeResult = { url: string; bytes: number; width: number; height: number; mime: string; extension: 'png' | 'jpg' | 'webp'; label: 'PNG' | 'JPEG' | 'WebP' };
interface Props { locale?: 'en' | 'zh-cn' | 'zh-tw'; }

export default function ResizeTool({ locale = 'en' }: Props) {
  const zh = locale !== 'en';
  const [file, setFile] = useState<File | null>(null); const [width, setWidth] = useState(1080); const [height, setHeight] = useState(1080); const [ratio, setRatio] = useState(1); const [lockRatio, setLockRatio] = useState(true); const [mode, setMode] = useState<ResizeMode>('fit'); const [output, setOutput] = useState<OutputFormat>('png'); const [jpegBackground, setJpegBackground] = useState('#ffffff'); const [erasePrivacyMetadata, setErasePrivacyMetadata] = useState(false); const [status, setStatus] = useState(zh ? '选择一张图片开始。' : 'Choose an image to begin.'); const [result, setResult] = useState<ResizeResult | null>(null); const input = useRef<HTMLInputElement>(null); const worker = useRef<Worker | null>(null); const timeout = useRef<ReturnType<typeof setTimeout> | null>(null); const selection = useRef(0); const dimensionsConfigured = useRef(false);
  const stopWorker = () => { worker.current?.terminate(); worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; };
  const invalidate = () => { stopWorker(); setResult(null); };
  useEffect(() => () => { worker.current?.terminate(); if (timeout.current) clearTimeout(timeout.current); }, []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  useEffect(() => { const preset = resizePresetFromSearch(window.location.search); if (preset) { dimensionsConfigured.current = true; setWidth(preset.width); setHeight(preset.height); setMode(preset.mode); } }, []);
  const choose = async (next?: File) => {
    if (!next) return;
    const selected = ++selection.current;
    invalidate(); setFile(null);
    try {
      await validateImageFile(next);
      const bitmap = await createImageBitmap(next);
      if (selected !== selection.current) { bitmap.close(); return; }
      if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); setStatus(zh ? '图片超过 4000 万像素限制。' : 'Images over 40 megapixels are not supported.'); return; }
      const sourceWidth = bitmap.width; const sourceHeight = bitmap.height; const sourceRatio = sourceWidth / sourceHeight;
      const scale = Math.min(1, 10_000 / Math.max(sourceWidth, sourceHeight));
      const nextWidth = Math.max(1, Math.round(sourceWidth * scale)); const nextHeight = Math.max(1, Math.round(sourceHeight * scale));
      bitmap.close(); setFile(next); setRatio(sourceRatio); if (!dimensionsConfigured.current) { setWidth(nextWidth); setHeight(nextHeight); }
      if (next.type !== 'image/jpeg' && output === 'jpeg') setOutput('png'); setStatus(`${next.name} · ${sourceWidth} × ${sourceHeight}px · ${(next.size / 1000).toFixed(1)} KB`);
    } catch (error) {
      if (selected !== selection.current) return;
      setStatus(error instanceof ImageValidationError && error.code === 'ANIMATION_UNSUPPORTED' ? (zh ? '不支持动态图片。请先导出静态画面。' : 'Animated images are not supported. Export a still frame first.') : (zh ? '无法读取这张图片。' : 'This image could not be decoded.'));
    }
  };
  const dimension = (value: string) => Math.min(10_000, Math.max(1, Math.round(Number(value) || 1)));
  const setWidthFromInput = (value: string) => { dimensionsConfigured.current = true; invalidate(); const nextWidth = dimension(value); setWidth(nextWidth); if (lockRatio) setHeight(Math.min(10_000, Math.max(1, Math.round(nextWidth / ratio)))); };
  const setHeightFromInput = (value: string) => { dimensionsConfigured.current = true; invalidate(); const nextHeight = dimension(value); setHeight(nextHeight); if (lockRatio) setWidth(Math.min(10_000, Math.max(1, Math.round(nextHeight * ratio)))); };
  const resize = () => {
    if (!file) { setStatus(zh ? '请先选择图片。' : 'Choose an image first.'); return; }
    invalidate(); const nextWorker = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' }); worker.current = nextWorker; setStatus(zh ? '正在缩放…' : 'Resizing image…');
    const finish = () => { nextWorker.terminate(); if (worker.current === nextWorker) worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; };
    nextWorker.onmessage = (event: MessageEvent<{ type: string; blob?: Blob; width?: number; height?: number; bytes?: number; privacyMetadataStatus?: 'removed' | 'none-present' | 'preserved'; error?: string }>) => { if (worker.current !== nextWorker) return; const data = event.data; if (data.type === 'success' && data.blob) { const details = data.blob.type === 'image/png' ? { extension: 'png' as const, label: 'PNG' as const } : data.blob.type === 'image/jpeg' ? { extension: 'jpg' as const, label: 'JPEG' as const } : data.blob.type === 'image/webp' ? { extension: 'webp' as const, label: 'WebP' as const } : null; if (!details) { setStatus(zh ? '浏览器返回了不受支持的图片格式。' : 'The browser returned an unsupported image format.'); finish(); return; } const url = URL.createObjectURL(data.blob); setResult({ url, bytes: data.bytes ?? data.blob.size, width: data.width ?? width, height: data.height ?? height, mime: data.blob.type, ...details }); setStatus(`${zh ? '缩放完成，可以下载。' : 'Resizing complete. Ready to download.'} ${privacyMetadataResultText(locale, data.privacyMetadataStatus)}`); finish(); } else if (data.type === 'error') { setResult(null); setStatus(privacyMetadataErrorText(locale, data.error) ?? (data.error === 'PIXEL_LIMIT' ? (zh ? '目标尺寸超过 4000 万像素限制。' : 'The target exceeds the 40 megapixel limit.') : (zh ? '图片处理失败，请检查格式后重试。' : 'The image could not be processed. Check the format and try again.'))); finish(); } };
    nextWorker.onerror = () => { if (worker.current !== nextWorker) return; setResult(null); setStatus(zh ? '图片处理失败，请重试。' : 'Image processing failed. Please try again.'); finish(); };
    timeout.current = setTimeout(() => { if (worker.current !== nextWorker) return; finish(); setResult(null); setStatus(zh ? '处理超过 30 秒，已停止。请减小目标尺寸后重试。' : 'Processing exceeded 30 seconds and was stopped. Try smaller dimensions.'); }, 30_000);
    nextWorker.postMessage({ type: 'resize', file, width, height, mode, output, jpegBackground, erasePrivacyMetadata });
  };
  const working = status === 'Resizing image…' || status === '正在缩放…';
  const content = <section className="tool-shell" data-image-selected={Boolean(file)} aria-label={zh ? '图片缩放工具' : 'Image resize tool'} aria-busy={working}>
    <label className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}><input ref={input} type="file" aria-label={zh ? '选择要缩放的图片' : 'Choose an image to resize'} accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0])} /><strong>{zh ? '将图片拖到这里，或点击选择' : 'Drop an image here or click to choose'}</strong><span className="muted">{zh ? '支持静态 JPEG、PNG、WebP · 最大 20 MB' : 'Static JPEG, PNG, WebP · up to 20 MB'}</span></label>
    <div className="controls"><label>{zh ? '宽度（px）' : 'Width (px)'}<input type="number" min="1" max="10000" value={width} onChange={(event) => setWidthFromInput(event.target.value)} /></label><label>{zh ? '高度（px）' : 'Height (px)'}<input type="number" min="1" max="10000" value={height} onChange={(event) => setHeightFromInput(event.target.value)} /></label><label className="ratio-lock"><input type="checkbox" checked={lockRatio} onChange={(event) => { invalidate(); setLockRatio(event.target.checked); }} />{zh ? '锁定宽高比' : 'Lock aspect ratio'}</label><label>{zh ? '适配方式' : 'Fit mode'}<select value={mode} onChange={(event) => { invalidate(); setMode(event.target.value as ResizeMode); }}><option value="fit">{zh ? '完整显示，留白' : 'Fit: show all, add space'}</option><option value="fill">{zh ? '铺满并居中裁切' : 'Fill: cover and crop center'}</option><option value="stretch">{zh ? '拉伸图片' : 'Stretch: distort to fit'}</option></select></label><label>{zh ? '输出格式' : 'Output format'}<select value={output} onChange={(event) => { invalidate(); setOutput(event.target.value as OutputFormat); }}><option value="png">PNG</option><option value="jpeg" disabled={Boolean(file && file.type !== 'image/jpeg')}>JPEG</option><option value="webp">WebP</option></select></label>{output === 'jpeg' && <label>{zh ? 'JPEG 背景色' : 'JPEG background'}<input type="color" aria-label={zh ? 'JPEG 背景色' : 'JPEG background color'} value={jpegBackground} onInput={(event) => { invalidate(); setJpegBackground(event.currentTarget.value); }} /></label>}</div>
    <div className="controls"><label>{zh ? '宽度（px）' : 'Width (px)'}<input type="number" min="1" max="10000" value={width} onChange={(event) => setWidthFromInput(event.target.value)} /></label><label>{zh ? '高度（px）' : 'Height (px)'}<input type="number" min="1" max="10000" value={height} onChange={(event) => setHeightFromInput(event.target.value)} /></label><label className="ratio-lock"><input type="checkbox" checked={lockRatio} onChange={(event) => { invalidate(); setLockRatio(event.target.checked); }} />{zh ? '锁定宽高比' : 'Lock aspect ratio'}</label><label>{zh ? '适配方式' : 'Fit mode'}<select value={mode} onChange={(event) => { invalidate(); setMode(event.target.value as ResizeMode); }}><option value="fit">{zh ? '完整显示，留白' : 'Fit: show all, add space'}</option><option value="fill">{zh ? '铺满并居中裁切' : 'Fill: cover and crop center'}</option><option value="stretch">{zh ? '拉伸图片' : 'Stretch: distort to fit'}</option></select></label><label>{zh ? '输出格式' : 'Output format'}<select value={output} onChange={(event) => { invalidate(); setOutput(event.target.value as OutputFormat); }}><option value="png">PNG</option><option value="jpeg" disabled={Boolean(file && file.type !== 'image/jpeg')}>JPEG</option><option value="webp">WebP</option></select></label>{output === 'jpeg' && <label>{zh ? 'JPEG 背景色' : 'JPEG background'}<input type="color" aria-label={zh ? 'JPEG 背景色' : 'JPEG background color'} value={jpegBackground} onInput={(event) => { invalidate(); setJpegBackground(event.currentTarget.value); }} /></label>}</div>
    <MetadataPrivacyToggle locale={locale} checked={erasePrivacyMetadata} onChange={(value) => { invalidate(); setErasePrivacyMetadata(value); }} />
    <button type="button" onClick={resize} disabled={working} style={{ marginTop: '1rem', width: '100%' }}>{zh ? '开始缩放' : 'Resize image'}</button>{working && <button type="button" className="cancel-action" onClick={() => { stopWorker(); setResult(null); setStatus(zh ? '已取消缩放。' : 'Resizing canceled.'); }}>{zh ? '取消' : 'Cancel'}</button>}<div className={`status ${result ? 'success' : ''}`} role="status" aria-live="polite">{status}</div>
    {result && <div className="result"><img src={result.url} alt={zh ? '缩放后预览' : 'Resized preview'} /><div><p>{result.width} × {result.height}px · {(result.bytes / 1000).toFixed(1)} KB · {result.label}</p><a href={result.url} download={`pixeltokb-resized.${result.extension}`}>{zh ? '下载结果' : 'Download result'}</a></div></div>}
  </section>;
  return locale === 'zh-tw' ? traditionalize(content, file ? [file.name] : []) : content;
}
