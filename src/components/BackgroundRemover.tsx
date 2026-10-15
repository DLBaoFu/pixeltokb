import { useEffect, useRef, useState } from 'react';
import { ImageValidationError, validateImageFile } from '../lib/image/file-validation';
import { safeDownloadName } from '../lib/image/download-name';

type Locale = 'en' | 'zh-cn' | 'zh-tw';
type Result = { url: string; bytes: number; width: number; height: number };

const copy = {
  en: { choose: 'Drop a signature image here or click to choose', formats: 'Static JPEG, PNG, WebP · up to 20 MB', tolerance: 'Background tolerance', action: 'Remove sampled background', working: 'Removing background…', ready: 'Transparent PNG is ready to download.', start: 'Choose an image to begin.', cancel: 'Cancel', canceled: 'Background removal canceled.', download: 'Download transparent PNG', local: 'Everything stays on this device.', note: 'This removes pixels close to the top-left sampled colour. It works best on an evenly coloured paper or white background; it is not AI subject segmentation.', fileTooLarge: 'The file exceeds the 20 MB limit.', unsupported: 'Use a static JPEG, PNG, or WebP image.', pixelLimit: 'The image exceeds the 40 megapixel limit.', decode: 'This image could not be decoded.', failed: 'The background could not be removed. Please try again.' },
  'zh-cn': { choose: '将签名图片拖到这里，或点击选择', formats: '支持静态 JPEG、PNG、WebP · 最大 20 MB', tolerance: '背景容差', action: '去除取样背景', working: '正在去除背景…', ready: '透明 PNG 已可下载。', start: '选择一张图片开始。', cancel: '取消', canceled: '已取消背景处理。', download: '下载透明 PNG', local: '所有处理仅在此设备完成。', note: '工具会根据左上角取样颜色移除相近像素，最适合颜色均匀的纸张或白色背景；它不是 AI 主体抠图。', fileTooLarge: '文件超过 20 MB 限制。', unsupported: '请使用静态 JPEG、PNG 或 WebP 图片。', pixelLimit: '图片超过 4000 万像素限制。', decode: '无法读取这张图片。', failed: '无法去除背景，请重试。' },
  'zh-tw': { choose: '將簽名圖片拖到這裡，或點擊選擇', formats: '支援靜態 JPEG、PNG、WebP · 最大 20 MB', tolerance: '背景容差', action: '移除取樣背景', working: '正在移除背景…', ready: '透明 PNG 已可下載。', start: '選擇一張圖片開始。', cancel: '取消', canceled: '已取消背景處理。', download: '下載透明 PNG', local: '所有處理只會在此裝置完成。', note: '工具會根據左上角取樣顏色移除相近像素，最適合顏色均勻的紙張或白色背景；它不是 AI 主體去背。', fileTooLarge: '檔案超過 20 MB 限制。', unsupported: '請使用靜態 JPEG、PNG 或 WebP 圖片。', pixelLimit: '圖片超過 4,000 萬像素限制。', decode: '無法讀取這張圖片。', failed: '無法移除背景，請重試。' }
} as const;

export default function BackgroundRemover({ locale = 'en' }: { locale?: Locale }) {
  const text = copy[locale];
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<{ width: number; height: number } | null>(null);
  const [tolerance, setTolerance] = useState(24);
  const [status, setStatus] = useState<string>(text.start);
  const [result, setResult] = useState<Result | null>(null);
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => { worker.current?.terminate(); worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; };
  useEffect(() => () => stop(), []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  const clearResult = () => { stop(); setResult(null); };
  const choose = async (next?: File) => {
    if (!next) return;
    clearResult(); setFile(null); setSource(null);
    try {
      await validateImageFile(next);
      const bitmap = await createImageBitmap(next);
      if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); setStatus(text.pixelLimit); return; }
      setFile(next); setSource({ width: bitmap.width, height: bitmap.height }); setStatus(`${next.name} · ${bitmap.width} × ${bitmap.height}px · ${(next.size / 1000).toFixed(1)} KB`); bitmap.close();
    } catch (error) {
      if (error instanceof ImageValidationError) setStatus(error.code === 'FILE_TOO_LARGE' ? text.fileTooLarge : error.code === 'PIXEL_LIMIT' ? text.pixelLimit : text.unsupported);
      else setStatus(text.decode);
    }
  };
  const process = () => {
    if (!file) { setStatus(text.start); return; }
    clearResult(); const nextWorker = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' }); worker.current = nextWorker; setStatus(text.working);
    const finish = () => { nextWorker.terminate(); if (worker.current === nextWorker) worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; };
    nextWorker.onmessage = (event: MessageEvent<{ type: string; blob?: Blob; bytes?: number; width?: number; height?: number; error?: string }>) => {
      if (worker.current !== nextWorker) return;
      if (event.data.type === 'success' && event.data.blob?.type === 'image/png') { setResult({ url: URL.createObjectURL(event.data.blob), bytes: event.data.bytes ?? event.data.blob.size, width: event.data.width ?? source?.width ?? 0, height: event.data.height ?? source?.height ?? 0 }); setStatus(text.ready); finish(); return; }
      if (event.data.type === 'error') { setResult(null); setStatus(event.data.error === 'FILE_TOO_LARGE' ? text.fileTooLarge : event.data.error === 'PIXEL_LIMIT' ? text.pixelLimit : text.failed); finish(); }
    };
    nextWorker.onerror = () => { setResult(null); setStatus(text.failed); finish(); };
    timeout.current = setTimeout(() => { if (worker.current === nextWorker) { finish(); setResult(null); setStatus(text.failed); } }, 30_000);
    nextWorker.postMessage({ type: 'remove-background', file, tolerance });
  };
  const working = status === text.working;
  const statusError = new Set<string>([text.fileTooLarge, text.unsupported, text.pixelLimit, text.decode, text.failed]).has(status);
  return <section className="tool-shell signature-tool background-remover" aria-label="Signature background remover" aria-busy={working}>
    <label className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}>
      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={text.choose} onChange={(event) => choose(event.target.files?.[0])} />
      <strong>{text.choose}</strong><span className="muted">{text.formats}</span>
    </label>
    {source && <p className="signature-source">{source.width} × {source.height}px · {text.local}</p>}
    <div className="background-controls">
      <label>{text.tolerance}<input type="range" min="0" max="120" step="1" value={tolerance} onChange={(event) => { clearResult(); setTolerance(Number(event.target.value)); }} /><output>{tolerance}</output></label>
    </div>
    <p className="signature-note" role="note">{text.note}</p>
    <div className="signature-actions"><button type="button" className="primary-action signature-submit" onClick={process} disabled={working}>{working ? text.working : text.action}</button>{working && <button type="button" className="cancel-action" onClick={() => { clearResult(); setStatus(text.canceled); }}>{text.cancel}</button>}</div>
    <div className={`status signature-status ${result ? 'success' : statusError ? 'error' : ''}`} role="status" aria-live="polite">{status}</div>
    {result && <div className="result"><img src={result.url} alt="Transparent signature preview" /><div><strong>{text.ready}</strong><p>{result.width} × {result.height}px · PNG · {(result.bytes / 1000).toFixed(1)} KB · {result.bytes.toLocaleString()} bytes</p><a href={result.url} download={safeDownloadName(file?.name ?? 'signature-transparent.png', 'png')}>{text.download}</a></div></div>}
  </section>;
}
