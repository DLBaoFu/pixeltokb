import { useEffect, useRef, useState } from 'react';
import { ImageValidationError, validateImageFile } from '../lib/image/file-validation';
import { safeDownloadName } from '../lib/image/download-name';
import MetadataPrivacyToggle, { privacyMetadataErrorText, privacyMetadataResultText } from './MetadataPrivacyToggle';

type Locale = 'en' | 'zh-cn' | 'zh-tw';
type Variant = 'resize' | 'compress';
type Result = { url: string; bytes: number; width: number; height: number };
type Source = { width: number; height: number };

const copy = {
  en: {
    choose: 'Drop a signature image here or click to choose', formats: 'Static JPEG, PNG, WebP · up to 20 MB', crop: 'Signature area', left: 'Left (px)', top: 'Top (px)', cropWidth: 'Crop width (px)', cropHeight: 'Crop height (px)', output: 'Output size', width: 'Width (px)', height: 'Height (px)', lock: 'Lock aspect ratio', target: 'Maximum file size (KB)', action: 'Prepare signature image', working: 'Preparing signature image…', ready: 'Signature image is ready to download.', start: 'Choose an image to begin.', cancel: 'Cancel', canceled: 'Signature preparation canceled.', download: 'Download JPEG', local: 'Everything stays on this device.', exact: 'The download is offered only when its actual byte size is within the selected limit.', noStandard: 'This is a general image-preparation tool. Check the receiving service’s current image rules yourself; no government or form standard is built in.', fileTooLarge: 'The file exceeds the 20 MB limit.', unsupported: 'Use a static JPEG, PNG, or WebP image.', pixelLimit: 'The image exceeds the 40 megapixel limit.', decode: 'This image could not be decoded.', unreachable: 'This file cannot reach the selected limit while keeping the chosen dimensions. Raise the limit or use smaller dimensions.', failed: 'The image could not be prepared. Please try again.'
  },
  'zh-cn': {
    choose: '将签名图片拖到这里，或点击选择', formats: '支持静态 JPEG、PNG、WebP · 最大 20 MB', crop: '签名区域', left: '左侧（px）', top: '顶部（px）', cropWidth: '裁剪宽度（px）', cropHeight: '裁剪高度（px）', output: '输出尺寸', width: '宽度（px）', height: '高度（px）', lock: '锁定宽高比', target: '最大文件大小（KB）', action: '处理签名图片', working: '正在处理签名图片…', ready: '签名图片已可下载。', start: '选择一张图片开始。', cancel: '取消', canceled: '已取消签名图片处理。', download: '下载 JPEG', local: '所有处理仅在此设备完成。', exact: '仅当实际字节数不超过所选限制时，才会提供下载。', noStandard: '这是通用图片处理工具。请自行核对接收平台当前的图片规则；本站不内置政府或表单标准。', fileTooLarge: '文件超过 20 MB 限制。', unsupported: '请使用静态 JPEG、PNG 或 WebP 图片。', pixelLimit: '图片超过 4000 万像素限制。', decode: '无法读取这张图片。', unreachable: '在保持所选尺寸时无法达到此大小限制。请提高限制或使用更小尺寸。', failed: '图片处理失败，请重试。'
  },
  'zh-tw': {
    choose: '將簽名圖片拖到這裡，或點擊選擇', formats: '支援靜態 JPEG、PNG、WebP · 最大 20 MB', crop: '簽名區域', left: '左側（px）', top: '頂端（px）', cropWidth: '裁切寬度（px）', cropHeight: '裁切高度（px）', output: '輸出尺寸', width: '寬度（px）', height: '高度（px）', lock: '鎖定長寬比', target: '最大檔案大小（KB）', action: '處理簽名圖片', working: '正在處理簽名圖片…', ready: '簽名圖片已可下載。', start: '選擇一張圖片開始。', cancel: '取消', canceled: '已取消簽名圖片處理。', download: '下載 JPEG', local: '所有處理只會在此裝置完成。', exact: '只有實際位元組數不超過所選限制時，才會提供下載。', noStandard: '這是一般圖片處理工具。請自行核對接收平台目前的圖片規則；本站不內建政府或表單標準。', fileTooLarge: '檔案超過 20 MB 限制。', unsupported: '請使用靜態 JPEG、PNG 或 WebP 圖片。', pixelLimit: '圖片超過 4,000 萬像素限制。', decode: '無法讀取這張圖片。', unreachable: '在保留所選尺寸時無法達到此大小限制。請提高限制或使用較小尺寸。', failed: '圖片處理失敗，請重試。'
  }
} as const;

function numberInRange(value: string, maximum: number) {
  return Math.min(maximum, Math.max(1, Math.round(Number(value) || 1)));
}

export default function SignatureTool({ locale = 'en', variant }: { locale?: Locale; variant: Variant }) {
  const text = copy[locale];
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [crop, setCrop] = useState({ left: 0, top: 0, width: 1, height: 1 });
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(100);
  const [ratio, setRatio] = useState(3);
  const [lockRatio, setLockRatio] = useState(true);
  const [targetKB, setTargetKB] = useState(variant === 'compress' ? 50 : 100);
  const [erasePrivacyMetadata, setErasePrivacyMetadata] = useState(false);
  const [status, setStatus] = useState<string>(text.start);
  const [result, setResult] = useState<Result | null>(null);
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => { worker.current?.terminate(); worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; };
  const clearResult = () => { stop(); setResult(null); };
  useEffect(() => () => stop(), []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  useEffect(() => { setStatus((current) => current === copy.en.start || current === copy['zh-cn'].start || current === copy['zh-tw'].start ? text.start : current); }, [text.start]);

  const choose = async (next?: File) => {
    if (!next) return;
    clearResult(); setFile(null); setSource(null);
    try {
      await validateImageFile(next);
      const bitmap = await createImageBitmap(next);
      if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); setStatus(text.pixelLimit); return; }
      const nextRatio = bitmap.width / bitmap.height;
      const defaultWidth = Math.min(600, bitmap.width);
      const defaultHeight = Math.max(1, Math.round(defaultWidth / nextRatio));
      setFile(next); setSource({ width: bitmap.width, height: bitmap.height }); setCrop({ left: 0, top: 0, width: bitmap.width, height: bitmap.height }); setRatio(nextRatio); setWidth(defaultWidth); setHeight(defaultHeight); bitmap.close();
      setStatus(`${next.name} · ${bitmap.width} × ${bitmap.height}px · ${(next.size / 1000).toFixed(1)} KB`);
    } catch (error) {
      if (error instanceof ImageValidationError) setStatus(error.code === 'FILE_TOO_LARGE' ? text.fileTooLarge : error.code === 'PIXEL_LIMIT' ? text.pixelLimit : error.code === 'FORMAT_UNSUPPORTED' || error.code === 'ANIMATION_UNSUPPORTED' ? text.unsupported : text.decode);
      else setStatus(text.decode);
    }
  };

  const updateWidth = (value: string) => { clearResult(); const next = numberInRange(value, 10_000); setWidth(next); if (lockRatio) setHeight(numberInRange(String(next / ratio), 10_000)); };
  const updateHeight = (value: string) => { clearResult(); const next = numberInRange(value, 10_000); setHeight(next); if (lockRatio) setWidth(numberInRange(String(next * ratio), 10_000)); };
  const updateCrop = (key: keyof typeof crop, value: string) => {
    clearResult();
    const limit = key === 'left' || key === 'width' ? source?.width ?? 1 : source?.height ?? 1;
    const minimum = key === 'left' || key === 'top' ? 0 : 1;
    const next = Math.min(limit, Math.max(minimum, Math.round(Number(value) || minimum)));
    setCrop((current) => ({ ...current, [key]: next }));
  };

  const prepare = () => {
    if (!file || !source) { setStatus(text.start); return; }
    clearResult();
    const nextWorker = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' });
    worker.current = nextWorker; setStatus(text.working);
    const finish = () => { nextWorker.terminate(); if (worker.current === nextWorker) worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; };
    nextWorker.onmessage = (event: MessageEvent<{ type: string; blob?: Blob; bytes?: number; width?: number; height?: number; privacyMetadataStatus?: 'removed' | 'none-present' | 'preserved'; error?: string }>) => {
      if (worker.current !== nextWorker) return;
      const message = event.data;
      if (message.type === 'success' && message.blob?.type === 'image/jpeg') {
        setResult({ url: URL.createObjectURL(message.blob), bytes: message.bytes ?? message.blob.size, width: message.width ?? width, height: message.height ?? height }); setStatus(`${text.ready} ${privacyMetadataResultText(locale, message.privacyMetadataStatus)}`); finish(); return;
      }
      if (message.type === 'error') { setResult(null); setStatus(privacyMetadataErrorText(locale, message.error) ?? (message.error === 'TARGET_UNREACHABLE' ? text.unreachable : message.error === 'PIXEL_LIMIT' ? text.pixelLimit : message.error === 'FILE_TOO_LARGE' ? text.fileTooLarge : text.failed)); finish(); }
    };
    nextWorker.onerror = () => { if (worker.current === nextWorker) { setResult(null); setStatus(text.failed); finish(); } };
    timeout.current = setTimeout(() => { if (worker.current === nextWorker) { finish(); setResult(null); setStatus(text.failed); } }, 30_000);
    nextWorker.postMessage({ type: 'signature', file, crop, width, height, targetBytes: Math.min(20_000_000, Math.max(1_000, Math.round(targetKB * 1000))), erasePrivacyMetadata });
  };

  const working = status === text.working;
  const statusError = new Set<string>([text.fileTooLarge, text.unsupported, text.pixelLimit, text.decode, text.unreachable, text.failed]).has(status);
  return <section className="tool-shell signature-tool" aria-label={variant === 'resize' ? 'Signature resizer' : 'Signature compressor'} aria-busy={working}>
    <label className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}>
      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={text.choose} onChange={(event) => choose(event.target.files?.[0])} />
      <strong>{text.choose}</strong><span className="muted">{text.formats}</span>
    </label>
    {source && <p className="signature-source">{text.crop}: {source.width} × {source.height}px. {text.local}</p>}
    <div className="controls signature-controls">
      <label>{text.left}<input type="number" min="0" max={source?.width ?? 1} value={crop.left} onChange={(event) => updateCrop('left', event.target.value)} /></label>
      <label>{text.top}<input type="number" min="0" max={source?.height ?? 1} value={crop.top} onChange={(event) => updateCrop('top', event.target.value)} /></label>
      <label>{text.cropWidth}<input type="number" min="1" max={source?.width ?? 1} value={crop.width} onChange={(event) => updateCrop('width', event.target.value)} /></label>
      <label>{text.cropHeight}<input type="number" min="1" max={source?.height ?? 1} value={crop.height} onChange={(event) => updateCrop('height', event.target.value)} /></label>
      <label>{text.width}<input type="number" min="1" max="10000" value={width} onChange={(event) => updateWidth(event.target.value)} /></label>
      <label>{text.height}<input type="number" min="1" max="10000" value={height} onChange={(event) => updateHeight(event.target.value)} /></label>
      <label className="ratio-lock"><input type="checkbox" checked={lockRatio} onChange={(event) => { clearResult(); setLockRatio(event.target.checked); }} />{text.lock}</label>
      <label>{text.target}<input type="number" min="1" max="20000" value={targetKB} onChange={(event) => { clearResult(); setTargetKB(numberInRange(event.target.value, 20_000)); }} /></label>
    </div>
    <p className="signature-note" role="note">{text.exact} {text.noStandard}</p>
    <MetadataPrivacyToggle locale={locale} checked={erasePrivacyMetadata} onChange={(value) => { clearResult(); setErasePrivacyMetadata(value); }} />
    <div className="signature-actions">
      <button type="button" className="primary-action signature-submit" onClick={prepare} disabled={working}>{working ? text.working : text.action}</button>
      {working && <button type="button" className="cancel-action" onClick={() => { clearResult(); setStatus(text.canceled); }}>{text.cancel}</button>}
    </div>
    <div className={`status signature-status ${result ? 'success' : statusError ? 'error' : ''}`} role="status" aria-live="polite">{status}</div>
    {result && <div className="result"><img src={result.url} alt="Prepared signature preview" /><div><strong>{text.ready}</strong><p>{result.width} × {result.height}px · JPEG · {(result.bytes / 1000).toFixed(1)} KB · {result.bytes.toLocaleString()} bytes</p><a href={result.url} download={safeDownloadName(file?.name ?? 'signature.jpg', 'jpg')}>{text.download}</a></div></div>}
  </section>;
}
