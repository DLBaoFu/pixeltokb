import { useEffect, useRef, useState } from 'react';
import { errorMessages, type ImageErrorCode } from '../lib/image/errors';
import { safeDownloadName } from '../lib/image/download-name';
import { pngCopy, type PngLocale } from '../lib/png/content';
import PngBatchOptimizationTool from './PngBatchOptimizationTool';

interface Props { locale?: PngLocale; }
type WorkerMessage = { type: string; value?: number; blob?: Blob; width?: number; height?: number; bytes?: number; originalBytes?: number; hasAlpha?: boolean; outcome?: 'optimized' | 'unchanged'; reason?: 'not-smaller' | 'pixel-mismatch' | 'metadata-retained'; metadataStatus?: 'none-present' | 'removed'; error?: string };
type Result = { url: string; bytes: number; originalBytes: number; width: number; height: number; hasAlpha: boolean; metadataStatus: 'none-present' | 'removed' };
type State = 'idle' | 'ready' | 'working' | 'optimized' | 'unchanged' | 'error' | 'cancelled';

const localizedErrors: Record<Exclude<PngLocale, 'en'>, Record<ImageErrorCode, string>> = {
  'zh-cn': { FILE_TOO_LARGE: '文件超过 20 MB 限制。', BATCH_TOO_LARGE: '批量文件超过数量或总大小限制。', PIXEL_LIMIT: '图片超过 4000 万像素限制。', FORMAT_UNSUPPORTED: '请选择签名与类型一致的 PNG 文件。', ANIMATION_UNSUPPORTED: '不支持动态 PNG。请先导出静态画面。', DECODE_FAILED: 'PNG 结构、CRC 或图片数据损坏，无法读取。', ENCODER_UNAVAILABLE: '此浏览器无法完成 PNG 编码。', TARGET_UNREACHABLE: '无法达到目标。', PROCESSING_TIMEOUT: '处理超过 30 秒，请尝试更小的 PNG。', OUT_OF_MEMORY: '浏览器处理 PNG 时内存不足，请使用更小的图片。', CANCELLED: '处理已取消。' },
  'zh-tw': { FILE_TOO_LARGE: '檔案超過 20 MB 限制。', BATCH_TOO_LARGE: '批次檔案超過數量或總大小限制。', PIXEL_LIMIT: '圖片超過 4,000 萬像素限制。', FORMAT_UNSUPPORTED: '請選擇簽章與類型一致的 PNG 檔案。', ANIMATION_UNSUPPORTED: '不支援動態 PNG。請先匯出靜態畫面。', DECODE_FAILED: 'PNG 結構、CRC 或圖片資料損壞，無法讀取。', ENCODER_UNAVAILABLE: '此瀏覽器無法完成 PNG 編碼。', TARGET_UNREACHABLE: '無法達到目標。', PROCESSING_TIMEOUT: '處理超過 30 秒，請嘗試較小的 PNG。', OUT_OF_MEMORY: '瀏覽器處理 PNG 時記憶體不足，請使用較小的圖片。', CANCELLED: '處理已取消。' }
};

export default function PngOptimizationTool({ locale = 'en' }: Props) {
  const copy = pngCopy[locale];
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState(copy.idle);
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const stopWorker = () => {
    worker.current?.terminate();
    worker.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
  };
  const clearResult = () => { setResult(null); setProgress(0); };
  useEffect(() => () => stopWorker(), []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const choose = (next?: File) => {
    if (!next) return;
    stopWorker(); clearResult(); setFile(null);
    if (next.size > 20_000_000) { setState('error'); setStatus(copy.tooLarge); return; }
    if (next.type !== 'image/png') { setState('error'); setStatus(copy.invalidType); return; }
    setFile(next); setState('ready'); setStatus(copy.ready(next.name, (next.size / 1000).toFixed(1)));
  };

  const optimize = () => {
    if (!file) { setState('error'); setStatus(copy.idle); return; }
    stopWorker(); clearResult();
    const nextWorker = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' });
    worker.current = nextWorker; setState('working'); setStatus(`${copy.optimizing}…`);
    const finish = () => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = null;
      nextWorker.terminate();
      if (worker.current === nextWorker) worker.current = null;
    };
    timeout.current = setTimeout(() => { finish(); clearResult(); setState('error'); setStatus(locale === 'en' ? errorMessages.PROCESSING_TIMEOUT : localizedErrors[locale].PROCESSING_TIMEOUT); }, 30_000);
    nextWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (worker.current !== nextWorker) return;
      const data = event.data;
      if (data.type === 'progress') { setProgress(data.value ?? 0); return; }
      if (data.type === 'error') {
        const messages = locale === 'en' ? errorMessages : localizedErrors[locale];
        setState('error'); setStatus(messages[data.error as ImageErrorCode] ?? copy.genericError); finish(); return;
      }
      if (data.type !== 'success') return;
      if (data.outcome === 'unchanged') {
        setState(data.reason === 'not-smaller' ? 'unchanged' : 'error');
        setStatus(data.reason === 'not-smaller' ? copy.noSaving : data.reason === 'metadata-retained' ? copy.metadataRetained : copy.verificationFailed);
        finish(); return;
      }
      if (!data.blob || data.blob.type !== 'image/png' || !data.originalBytes || data.blob.size >= data.originalBytes || !data.width || !data.height || !data.metadataStatus) {
        setState('error'); setStatus(copy.rejectedOutput); finish(); return;
      }
      const url = URL.createObjectURL(data.blob);
      setResult({ url, bytes: data.blob.size, originalBytes: data.originalBytes, width: data.width, height: data.height, hasAlpha: Boolean(data.hasAlpha), metadataStatus: data.metadataStatus });
      setState('optimized'); setStatus(copy.resultHeading); finish();
    };
    nextWorker.onerror = () => { if (worker.current !== nextWorker) return; clearResult(); setState('error'); setStatus(copy.genericError); finish(); };
    nextWorker.postMessage({ type: 'optimize-png', file });
  };

  const cancel = () => { stopWorker(); clearResult(); setState('cancelled'); setStatus(copy.canceled); };
  const downloadName = file ? safeDownloadName(file.name, 'png').replace(/\.png$/, '-optimized.png') : 'pixeltokb-image-optimized.png';
  const savedPercent = result ? ((1 - result.bytes / result.originalBytes) * 100).toFixed(1) : '0.0';

  return <>
    <section className="workspace" data-image-selected={Boolean(file)} data-png-optimizer="true" aria-label={copy.toolLabel} aria-busy={state === 'working'}>
      <div className="upload-zone"><div className="upload-zone-inner" role="button" tabIndex={0} aria-label={copy.uploadLabel} onClick={() => input.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.current?.click(); } }} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag'); }} onDragLeave={(event) => event.currentTarget.classList.remove('drag')} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('drag'); choose(event.dataTransfer.files[0]); }}>
        <input ref={input} type="file" tabIndex={-1} aria-label={copy.chooseLabel} accept="image/png" onClick={(event) => { event.currentTarget.value = ''; }} onChange={(event) => choose(event.target.files?.[0])} />
        <svg className="upload-icon" viewBox="0 0 72 58" aria-hidden="true"><path d="M22 48H16a13 13 0 1 1 4-25 17 17 0 0 1 32-4 14 14 0 0 1 4 28H48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M36 49V26m0 0-9 9m9-9 9 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
        <strong>{copy.drop}</strong><small>{copy.fileRule}</small><span className="image-placeholder" aria-hidden="true" />
      </div></div>
      <aside className="settings-card">
        <div className="settings-heading"><span>{copy.methodHeading}</span><span className="local-state">{copy.local}</span></div>
        <dl className="png-method-list"><div><dt>{copy.outputLabel}</dt><dd>{copy.outputValue}</dd></div><div><dt>{copy.dimensionsLabel}</dt><dd>{copy.dimensionsValue}</dd></div><div><dt>{copy.verificationLabel}</dt><dd>{copy.verificationValue}</dd></div></dl>
        <button className="primary-action" type="button" onClick={optimize} disabled={state === 'working'}>{state === 'working' ? `${copy.optimizing} ${progress}%` : copy.optimize}</button>
        {state === 'working' && <button type="button" className="cancel-action" onClick={cancel}>{copy.cancel}</button>}
        <div className={`status ${state === 'error' ? 'error' : state === 'optimized' ? 'success' : ''}`} data-png-status={state} role="status" aria-live="polite">{status}</div>
      </aside>
    </section>
    {result && <section className="result" data-png-result="optimized" data-original-bytes={result.originalBytes} data-output-bytes={result.bytes} data-width={result.width} data-height={result.height} data-alpha={String(result.hasAlpha)}>
      <img src={result.url} alt={copy.previewAlt}/><div><strong>{copy.resultHeading}</strong><dl className="png-result-list"><div><dt>{copy.original}</dt><dd>{result.originalBytes.toLocaleString()} bytes</dd></div><div><dt>{copy.optimized}</dt><dd>{result.bytes.toLocaleString()} bytes</dd></div><div><dt>{copy.saving}</dt><dd>{savedPercent}%</dd></div><div><dt>{copy.dimensions}</dt><dd>{result.width} × {result.height}px</dd></div><div><dt>{copy.alpha}</dt><dd>{result.hasAlpha ? copy.alphaKept : copy.opaque}</dd></div><div><dt>{copy.metadata}</dt><dd>{result.metadataStatus === 'removed' ? copy.metadataRemoved : copy.metadataAbsent}</dd></div></dl><a data-png-download="true" href={result.url} download={downloadName}>{copy.download}</a></div>
    </section>}
    <div className="trust-grid"><div className="trust-card"><span className="trust-icon">♢</span><span><strong>{copy.localTitle}</strong><small>{copy.localText}</small></span></div><div className="trust-card"><span className="trust-icon">⌗</span><span><strong>{copy.exactTitle}</strong><small>{copy.exactText}</small></span></div><div className="trust-card"><span className="trust-icon">▧</span><span><strong>{copy.pngTitle}</strong><small>{copy.pngText}</small></span></div></div>
    <PngBatchOptimizationTool locale={locale} />
    <section className="content-section"><h2>{copy.whatHeading}</h2><p>{copy.whatText}</p><div className="steps">{copy.steps.map(([title, text], index) => <div className="step-card" key={title}><span className="step-no">{index + 1}</span><h3>{title}</h3><small>{text}</small></div>)}</div></section>
    <section className="content-section format-section"><h2>{copy.limitsHeading}</h2><p>{copy.limitsText}</p><div className="format-table" role="region" tabIndex={0} aria-label={copy.tableLabel}><table><tbody>{copy.tableRows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table></div></section>
    <section className="content-section faq-section"><div className="faq-heading"><h2>{copy.faqHeading}</h2></div><div className="faq-list">{copy.faq.map(([question, answer]) => <details className="faq-item" key={question}><summary><h3>{question}</h3></summary><p>{answer}</p></details>)}</div></section>
  </>;
}
