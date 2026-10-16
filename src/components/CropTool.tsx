import { useEffect, useRef, useState } from 'react';
import { traditionalize } from '../lib/traditionalize';
import { ImageValidationError, validateImageFile } from '../lib/image/file-validation';
import MetadataPrivacyToggle, { privacyMetadataResultText } from './MetadataPrivacyToggle';

type Format = 'png' | 'jpeg' | 'webp';
type Box = { x: number; y: number; width: number; height: number };
type CropResult = { url: string; bytes: number; width: number; height: number; mime: string; extension: 'png' | 'jpg' | 'webp'; label: 'PNG' | 'JPEG' | 'WebP' };
interface Props { locale?: 'en' | 'zh-cn' | 'zh-tw'; }

export default function CropTool({ locale = 'en' }: Props) {
  const zh = locale !== 'en';
  const input = useRef<HTMLInputElement>(null); const worker = useRef<Worker | null>(null); const timeout = useRef<ReturnType<typeof setTimeout> | null>(null); const dragStart = useRef<{ x: number; y: number } | null>(null); const selection = useRef(0);
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState(''); const [size, setSize] = useState({ width: 0, height: 0 }); const [box, setBox] = useState<Box>({ x: 0, y: 0, width: 0, height: 0 }); const [format, setFormat] = useState<Format>('png'); const [background, setBackground] = useState('#ffffff'); const [erasePrivacyMetadata, setErasePrivacyMetadata] = useState(true); const [status, setStatus] = useState(zh ? '选择图片开始裁剪。' : 'Choose an image to crop.'); const [result, setResult] = useState<CropResult | null>(null);
  const stopWorker = () => { worker.current?.terminate(); worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; };
  const invalidate = () => { stopWorker(); setResult(null); };
  useEffect(() => () => { worker.current?.terminate(); if (timeout.current) clearTimeout(timeout.current); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  const choose = async (next?: File) => {
    if (!next) return;
    const selected = ++selection.current; invalidate(); setFile(null); setPreview(''); setSize({ width: 0, height: 0 }); setBox({ x: 0, y: 0, width: 0, height: 0 });
    if (next.size > 20_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) { setStatus(zh ? '请选择 20 MB 以内的静态 JPEG、PNG 或 WebP 图片。' : 'Use a static JPEG, PNG, or WebP image up to 20 MB.'); return; }
    try { await validateImageFile(next); const bitmap = await createImageBitmap(next); if (selected !== selection.current) { bitmap.close(); return; } if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); setStatus(zh ? '图片超过 4000 万像素限制。' : 'Images over 40 megapixels are not supported.'); return; }
      const w = bitmap.width; const h = bitmap.height; bitmap.close(); setFile(next); if (next.type !== 'image/jpeg' && format === 'jpeg') setFormat('png'); setSize({ width: w, height: h }); setBox({ x: Math.round(w * .1), y: Math.round(h * .1), width: Math.round(w * .8), height: Math.round(h * .8) }); setPreview(URL.createObjectURL(next)); setResult(null); setStatus(`${w} × ${h}px · ${(next.size / 1000).toFixed(1)} KB`);
    } catch (error) { if (selected === selection.current) setStatus(error instanceof ImageValidationError && error.code === 'ANIMATION_UNSUPPORTED' ? (zh ? '不支持动态图片。请先导出静态画面。' : 'Animated images are not supported. Export a still frame first.') : (zh ? '无法读取这张图片。' : 'This image could not be decoded.')); }
  };
  const pointerPoint = (event: React.PointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * size.width, y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * size.height }; };
  const crop = () => {
    if (!file || box.width < 1 || box.height < 1) { setStatus(zh ? '请先选择裁剪区域。' : 'Select a crop area first.'); return; }
    invalidate(); const current = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' }); worker.current = current; setStatus(zh ? '正在裁剪图片…' : 'Cropping image…');
    const finish = () => { current.terminate(); if (worker.current === current) worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; };
    current.onmessage = (event: MessageEvent<{ type: string; blob?: Blob; bytes?: number; width?: number; height?: number; privacyMetadataStatus?: 'removed' | 'none-present' | 'unchecked' }>) => { if (worker.current !== current) return; const data = event.data; if (data.type === 'success' && data.blob) { const details = data.blob.type === 'image/png' ? { extension: 'png' as const, label: 'PNG' as const } : data.blob.type === 'image/jpeg' ? { extension: 'jpg' as const, label: 'JPEG' as const } : data.blob.type === 'image/webp' ? { extension: 'webp' as const, label: 'WebP' as const } : null; if (!details) { setStatus(zh ? '浏览器返回了不受支持的图片格式。' : 'The browser returned an unsupported image format.'); finish(); return; } const url = URL.createObjectURL(data.blob); setResult({ url, bytes: data.bytes ?? data.blob.size, width: data.width ?? 0, height: data.height ?? 0, mime: data.blob.type, ...details }); setStatus(`${zh ? '裁剪完成，可以下载。' : 'Crop ready to download.'} ${privacyMetadataResultText(locale, data.privacyMetadataStatus)}`); finish(); } else if (data.type === 'error') { setResult(null); setStatus(zh ? '图片裁剪失败，请重试。' : 'The image could not be cropped.'); finish(); } };
    current.onerror = () => { if (worker.current !== current) return; setResult(null); setStatus(zh ? '图片裁剪失败，请重试。' : 'The image could not be cropped. Please try again.'); finish(); };
    timeout.current = setTimeout(() => { if (worker.current !== current) return; finish(); setResult(null); setStatus(zh ? '处理超过 30 秒，已停止。请缩小裁剪区域后重试。' : 'Processing exceeded 30 seconds and was stopped. Try a smaller crop.'); }, 30_000);
    current.postMessage({ type: 'crop', file, ...box, output: file.type !== 'image/jpeg' && format === 'jpeg' ? 'png' : format, jpegBackground: background, erasePrivacyMetadata });
  };
  const update = (key: keyof Box, value: number) => { invalidate(); setBox((current) => ({ ...current, [key]: Math.max(0, Math.min(key === 'x' ? size.width - current.width : key === 'width' ? size.width - current.x : key === 'y' ? size.height - current.height : size.height - current.y, value)) })); };
  const adjustWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!file || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); invalidate(); const amount = event.altKey ? 1 : 10;
    setBox((current) => {
      if (event.shiftKey) {
        const width = event.key === 'ArrowLeft' ? Math.max(1, current.width - amount) : event.key === 'ArrowRight' ? Math.min(size.width - current.x, current.width + amount) : current.width;
        const height = event.key === 'ArrowUp' ? Math.max(1, current.height - amount) : event.key === 'ArrowDown' ? Math.min(size.height - current.y, current.height + amount) : current.height;
        return { ...current, width, height };
      }
      const x = event.key === 'ArrowLeft' ? Math.max(0, current.x - amount) : event.key === 'ArrowRight' ? Math.min(size.width - current.width, current.x + amount) : current.x;
      const y = event.key === 'ArrowUp' ? Math.max(0, current.y - amount) : event.key === 'ArrowDown' ? Math.min(size.height - current.height, current.y + amount) : current.y;
      return { ...current, x, y };
    });
  };
  const shownBox = { left: `${size.width ? box.x / size.width * 100 : 0}%`, top: `${size.height ? box.y / size.height * 100 : 0}%`, width: `${size.width ? box.width / size.width * 100 : 0}%`, height: `${size.height ? box.height / size.height * 100 : 0}%` };
  const working = status === 'Cropping image…' || status === '正在裁剪图片…';
  const content = <section className="crop-tool" data-image-selected={Boolean(file)} aria-label={zh ? '图片裁剪工具' : 'Image crop tool'} aria-busy={working}>
    <p id="crop-keyboard-help" className="sr-only">{zh ? '使用方向键移动裁剪区域；按住 Shift 使用方向键调整区域大小；按住 Alt 可每次调整一个像素。' : 'Use arrow keys to move the crop area. Hold Shift with arrow keys to resize it. Hold Alt to adjust by one pixel.'}</p>
    <div className="crop-preview" role="region" aria-label={zh ? '裁剪区域预览' : 'Crop area preview'} aria-describedby={file ? 'crop-keyboard-help' : undefined} tabIndex={file ? 0 : -1} style={size.width ? { aspectRatio: `${size.width} / ${size.height}`, maxWidth: `${560 * size.width / size.height}px` } : undefined} onKeyDown={adjustWithKeyboard} onPointerDown={(event) => { if (!file) return; invalidate(); event.currentTarget.setPointerCapture(event.pointerId); dragStart.current = pointerPoint(event); setBox({ ...box, x: Math.round(dragStart.current.x), y: Math.round(dragStart.current.y), width: 1, height: 1 }); }} onPointerMove={(event) => { if (!dragStart.current) return; const point = pointerPoint(event); const start = dragStart.current; setBox({ x: Math.round(Math.min(start.x, point.x)), y: Math.round(Math.min(start.y, point.y)), width: Math.max(1, Math.round(Math.abs(point.x - start.x))), height: Math.max(1, Math.round(Math.abs(point.y - start.y))) }); }} onPointerUp={() => { dragStart.current = null; }} onPointerCancel={() => { dragStart.current = null; }}>
      {preview ? <><img src={preview} alt={zh ? '待裁剪图片预览' : 'Image crop preview'} /><div className="crop-selection" style={shownBox} aria-hidden="true" /></> : <button type="button" onClick={() => input.current?.click()}>{zh ? '选择图片进行裁剪' : 'Choose an image to crop'}</button>}
      <input ref={input} type="file" tabIndex={-1} aria-label={zh ? '选择要裁剪的图片' : 'Choose an image to crop'} accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0])} />
    </div>
    <div className="crop-controls"><button type="button" onClick={() => input.current?.click()}>{zh ? '选择图片' : 'Choose image'}</button>{(['x', 'y', 'width', 'height'] as const).map((key) => <label key={key}>{key === 'x' ? (zh ? '左侧' : 'Left') : key === 'y' ? (zh ? '顶部' : 'Top') : key === 'width' ? (zh ? '宽度' : 'Width') : (zh ? '高度' : 'Height')} (px)<input type="number" min="0" max={key === 'x' || key === 'width' ? size.width : size.height} value={Math.round(box[key])} onChange={(event) => update(key, Number(event.target.value))} /></label>)}<label>{zh ? '输出格式' : 'Output format'}<select value={format} onChange={(event) => { invalidate(); setFormat(event.target.value as Format); }}><option value="png">PNG</option><option value="jpeg" disabled={Boolean(file && file.type !== 'image/jpeg')}>JPEG</option><option value="webp">WebP</option></select></label>{format === 'jpeg' && <label>{zh ? 'JPEG 背景色' : 'JPEG background'}<input type="color" aria-label={zh ? 'JPEG 背景色' : 'JPEG background color'} value={background} onInput={(event) => { invalidate(); setBackground(event.currentTarget.value); }} /></label>}<button className="primary-action" type="button" onClick={crop} disabled={working}>{zh ? '裁剪图片' : 'Crop image'}</button>{working && <button type="button" className="cancel-action" onClick={() => { stopWorker(); setResult(null); setStatus(zh ? '已取消裁剪。' : 'Cropping canceled.'); }}>{zh ? '取消' : 'Cancel'}</button>}</div>
    <MetadataPrivacyToggle locale={locale} checked={erasePrivacyMetadata} onChange={(value) => { invalidate(); setErasePrivacyMetadata(value); }} />
    <p className="status" role="status" aria-live="polite">{status}</p>
    {result && <div className="result"><img src={result.url} alt={zh ? '裁剪后图片预览' : 'Cropped image preview'} /><div><p>{result.width} × {result.height}px · {result.bytes.toLocaleString()} {zh ? '字节' : 'bytes'} · {result.label}</p><a href={result.url} download={`pixeltokb-cropped.${result.extension}`}>{zh ? '下载裁剪图片' : 'Download cropped image'}</a></div></div>}
  </section>;
  return locale === 'zh-tw' ? traditionalize(content) : content;
}
