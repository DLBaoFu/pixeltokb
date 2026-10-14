import { useEffect, useRef, useState } from 'react';
import { errorMessages, type ImageErrorCode } from '../lib/image/errors';
import { safeDownloadName } from '../lib/image/download-name';
import { createStoredZip, initialBatchConcurrency, validateBatchSelection } from '../lib/png/batch';
import { pngBatchCopy } from '../lib/png/batch-content';
import { pngCopy, type PngLocale } from '../lib/png/content';

interface Props { locale?: PngLocale; }
type BatchStatus = 'queued' | 'processing' | 'optimized' | 'unchanged' | 'error' | 'cancelled';
type BatchPhase = 'idle' | 'ready' | 'working' | 'complete' | 'cancelled' | 'error';
type BatchItem = {
  id: string; file: File; status: BatchStatus; progress: number; retryable: boolean; error?: string;
  result?: { blob: Blob; url: string; bytes: number; width: number; height: number; hasAlpha: boolean };
};
type WorkerMessage = { type: string; value?: number; blob?: Blob; width?: number; height?: number; originalBytes?: number; hasAlpha?: boolean; outcome?: 'optimized' | 'unchanged'; reason?: 'not-smaller' | 'pixel-mismatch' | 'metadata-retained'; error?: string };
type WorkerHandle = { worker: Worker; reject: (reason: string) => void; timeout: ReturnType<typeof setTimeout> };

const localizedErrors: Record<Exclude<PngLocale, 'en'>, Record<ImageErrorCode, string>> = {
  'zh-cn': { FILE_TOO_LARGE: '文件超过 20 MB 限制。', BATCH_TOO_LARGE: '批量文件超过数量或总大小限制。', PIXEL_LIMIT: '图片超过 4000 万像素限制。', FORMAT_UNSUPPORTED: '文件不是签名与类型一致的静态 PNG。', ANIMATION_UNSUPPORTED: '不支持动态 PNG，请先导出静态画面。', DECODE_FAILED: 'PNG 结构、CRC 或图片数据损坏。', ENCODER_UNAVAILABLE: '此浏览器无法完成 PNG 编码。', TARGET_UNREACHABLE: '无法生成更小的文件。', PROCESSING_TIMEOUT: '处理超过 30 秒，请尝试更小的 PNG。', OUT_OF_MEMORY: '处理时内存不足。', CANCELLED: '处理已取消。' },
  'zh-tw': { FILE_TOO_LARGE: '檔案超過 20 MB 限制。', BATCH_TOO_LARGE: '批次檔案超過數量或總大小限制。', PIXEL_LIMIT: '圖片超過 4,000 萬像素限制。', FORMAT_UNSUPPORTED: '檔案不是簽章與類型一致的靜態 PNG。', ANIMATION_UNSUPPORTED: '不支援動態 PNG，請先匯出靜態畫面。', DECODE_FAILED: 'PNG 結構、CRC 或圖片資料損壞。', ENCODER_UNAVAILABLE: '此瀏覽器無法完成 PNG 編碼。', TARGET_UNREACHABLE: '無法產生較小的檔案。', PROCESSING_TIMEOUT: '處理超過 30 秒，請嘗試較小的 PNG。', OUT_OF_MEMORY: '處理時記憶體不足。', CANCELLED: '處理已取消。' }
};

export default function PngBatchOptimizationTool({ locale = 'en' }: Props) {
  const copy = pngBatchCopy[locale];
  const singleCopy = pngCopy[locale];
  const [items, setItems] = useState<BatchItem[]>([]);
  const [status, setStatus] = useState(copy.idle);
  const [notice, setNotice] = useState('');
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<BatchPhase>('idle');
  const [zipWorking, setZipWorking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<BatchItem[]>([]);
  const handles = useRef(new Map<string, WorkerHandle>());
  const cancelled = useRef(false);

  const replaceItems = (updater: (current: BatchItem[]) => BatchItem[]) => setItems((current) => {
    const next = updater(current);
    itemsRef.current = next;
    return next;
  });
  const updateItem = (id: string, patch: Partial<BatchItem>) => replaceItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const revokeResults = (current: BatchItem[]) => current.forEach((item) => { if (item.result) URL.revokeObjectURL(item.result.url); });
  const errorText = (code: string) => (locale === 'en' ? errorMessages : localizedErrors[locale])[code as ImageErrorCode] ?? singleCopy.genericError;

  const stopWorkers = () => {
    for (const [id, handle] of handles.current) {
      clearTimeout(handle.timeout);
      handle.worker.terminate();
      handle.reject('CANCELLED');
      handles.current.delete(id);
    }
  };
  useEffect(() => () => { cancelled.current = true; stopWorkers(); revokeResults(itemsRef.current); }, []);

  const selectFiles = (selection: FileList | File[]) => {
    cancelled.current = true;
    stopWorkers();
    revokeResults(itemsRef.current);
    setRunning(false); setZipWorking(false); setNotice('');
    const files = Array.from(selection);
    const validation = validateBatchSelection(files);
    if (!validation.accepted) {
      replaceItems(() => []);
      setPhase('error');
      setStatus(validation.reason === 'too-many-files' ? copy.tooMany : copy.totalTooLarge);
      return;
    }
    const next = files.map((file, index): BatchItem => {
      const error = validation.itemErrors[index];
      return { id: `${Date.now()}-${index}`, file, status: error ? 'error' : 'queued', progress: 0, retryable: !error, ...(error ? { error: errorText(error) } : {}) };
    });
    replaceItems(() => next);
    setPhase(files.length ? 'ready' : 'idle');
    setStatus(files.length ? copy.ready(files.length, (validation.totalBytes / 1_000_000).toFixed(2)) : copy.idle);
  };

  const runWorker = (item: BatchItem): Promise<WorkerMessage> => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' });
    const finish = () => {
      const handle = handles.current.get(item.id);
      if (handle) clearTimeout(handle.timeout);
      worker.terminate();
      handles.current.delete(item.id);
    };
    const timeout = setTimeout(() => { finish(); reject('PROCESSING_TIMEOUT'); }, 30_000);
    handles.current.set(item.id, { worker, reject, timeout });
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (cancelled.current || !handles.current.has(item.id)) return;
      if (event.data.type === 'progress') { updateItem(item.id, { progress: event.data.value ?? 0 }); return; }
      finish();
      if (event.data.type === 'error') reject(event.data.error ?? 'DECODE_FAILED');
      else if (event.data.type === 'success') resolve(event.data);
    };
    worker.onerror = () => { finish(); reject('DECODE_FAILED'); };
    worker.postMessage({ type: 'optimize-png', file: item.file });
  });

  const runBatch = (retryOnly = false) => {
    if (running) return;
    const targetIds = itemsRef.current.filter((item) => item.retryable && (retryOnly ? item.status === 'error' || item.status === 'cancelled' : item.status === 'queued')).map((item) => item.id);
    if (!targetIds.length) return;
    cancelled.current = false;
    setRunning(true); setPhase('working'); setZipWorking(false); setNotice('');
    replaceItems((current) => current.map((item) => targetIds.includes(item.id) ? { ...item, status: 'queued', progress: 0, error: undefined } : item));
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    let concurrency: 1 | 2 = initialBatchConcurrency(deviceMemory);
    if (concurrency === 1) setNotice(copy.lowMemory);
    const queue = targetIds.map((id) => ({ id, attempts: 0 }));
    let active = 0;
    let terminal = itemsRef.current.filter((item) => !targetIds.includes(item.id)).length;
    let successful = itemsRef.current.filter((item) => item.status === 'optimized').length;
    const total = itemsRef.current.length;

    const finishIfDone = () => {
      if (active || queue.length || cancelled.current) return;
      setRunning(false);
      setPhase('complete');
      setStatus(copy.complete(successful, total));
      if (!successful) setNotice((current) => current || copy.noSuccess);
    };
    const schedule = () => {
      if (cancelled.current) return;
      while (active < concurrency && queue.length) {
        const job = queue.shift()!;
        const item = itemsRef.current.find((candidate) => candidate.id === job.id);
        if (!item) continue;
        active += 1;
        updateItem(item.id, { status: 'processing', progress: 10, error: undefined });
        setStatus(copy.running(Math.min(terminal + 1, total), total));
        runWorker(item).then((message) => {
          if (message.outcome === 'optimized' && message.blob?.type === 'image/png' && message.blob.size < item.file.size && message.width && message.height) {
            const url = URL.createObjectURL(message.blob);
            updateItem(item.id, { status: 'optimized', progress: 100, result: { blob: message.blob, url, bytes: message.blob.size, width: message.width, height: message.height, hasAlpha: Boolean(message.hasAlpha) } });
            successful += 1;
          } else if (message.outcome === 'unchanged' && message.reason === 'not-smaller') {
            updateItem(item.id, { status: 'unchanged', progress: 100, error: singleCopy.noSaving });
          } else {
            updateItem(item.id, { status: 'error', progress: 0, error: message.reason === 'metadata-retained' ? singleCopy.metadataRetained : singleCopy.verificationFailed });
          }
          terminal += 1;
        }).catch((code: string) => {
          if (code === 'OUT_OF_MEMORY' && concurrency === 2 && job.attempts === 0 && !cancelled.current) {
            concurrency = 1;
            setNotice(copy.reducedConcurrency);
            updateItem(item.id, { status: 'queued', progress: 0, error: undefined });
            queue.unshift({ id: item.id, attempts: 1 });
            return;
          }
          updateItem(item.id, { status: code === 'CANCELLED' ? 'cancelled' : 'error', progress: 0, error: errorText(code) });
          terminal += 1;
        }).finally(() => {
          active -= 1;
          schedule();
          finishIfDone();
        });
      }
      finishIfDone();
    };
    schedule();
  };

  const cancelBatch = () => {
    cancelled.current = true;
    stopWorkers();
    replaceItems((current) => current.map((item) => item.status === 'processing' || item.status === 'queued' ? { ...item, status: 'cancelled', progress: 0, error: errorText('CANCELLED') } : item));
    setRunning(false); setPhase('cancelled'); setStatus(copy.cancelled);
  };
  const reset = () => {
    cancelled.current = true; stopWorkers(); revokeResults(itemsRef.current);
    replaceItems(() => []); setRunning(false); setPhase('idle'); setZipWorking(false); setNotice(''); setStatus(copy.idle);
    if (input.current) input.current.value = '';
  };
  const downloadZip = async () => {
    const successes = itemsRef.current.filter((item) => item.status === 'optimized' && item.result).map((item) => ({ name: item.file.name, blob: item.result!.blob }));
    if (!successes.length || zipWorking) { if (!successes.length) setNotice(copy.noSuccess); return; }
    setZipWorking(true);
    try {
      const archive = await createStoredZip(successes);
      const url = URL.createObjectURL(archive.blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'pixeltokb-optimized-pngs.zip'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { setNotice(singleCopy.genericError); }
    finally { setZipWorking(false); }
  };

  const successes = items.filter((item) => item.status === 'optimized' && item.result);
  const retryableFailures = items.some((item) => item.retryable && (item.status === 'error' || item.status === 'cancelled'));
  const statusLabel = (item: BatchItem) => item.status === 'queued' ? copy.queued : item.status === 'processing' ? copy.processing : item.status === 'optimized' ? copy.optimized : item.status === 'unchanged' ? copy.unchanged : item.status === 'cancelled' ? copy.cancelled : copy.failed;

  return <section className="content-section png-batch-section" aria-labelledby="png-batch-heading">
    <h2 id="png-batch-heading">{copy.heading}</h2><p>{copy.intro}</p>
    <div className="batch-workspace" data-png-batch="true" aria-label={copy.toolLabel} aria-busy={running}>
      <label className="batch-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFiles(event.dataTransfer.files); }}>
        <input ref={input} type="file" multiple accept="image/png" aria-label={copy.choose} onClick={(event) => { event.currentTarget.value = ''; }} onChange={(event) => selectFiles(event.target.files ?? [])}/>
        <strong>{copy.drop}</strong><small>{copy.limits}</small><span className="batch-choose" aria-hidden="true">{copy.choose}</span>
      </label>
      <div className="batch-controls">
        <button type="button" className="primary-action" disabled={running || !items.some((item) => item.status === 'queued')} onClick={() => runBatch(false)}>{copy.start}</button>
        {running && <button type="button" className="cancel-action" onClick={cancelBatch}>{copy.cancel}</button>}
        {!running && retryableFailures && <button type="button" className="secondary-action" onClick={() => runBatch(true)}>{copy.retry}</button>}
        {!running && items.length > 0 && <button type="button" className="secondary-action" onClick={reset}>{copy.reset}</button>}
      </div>
      <div className="status" data-png-batch-status={phase} role="status" aria-live="polite">{status}</div>
      {notice && <p className="batch-notice" role="status">{notice}</p>}
    </div>
    {items.length > 0 && <div className="batch-results" role="region" aria-label={copy.summaryLabel}>
      {items.map((item) => <article className={`batch-row batch-${item.status}`} key={item.id} data-batch-item={item.file.name} data-batch-status={item.status}>
        <div className="batch-file"><strong>{item.file.name}</strong><small>{(item.file.size / 1000).toFixed(1)} KB</small></div>
        <div className="batch-state"><span>{statusLabel(item)}{item.status === 'processing' ? ` ${item.progress}%` : ''}</span>{item.status === 'processing' && <progress max="100" value={item.progress}>{item.progress}%</progress>}</div>
        <div className="batch-detail">{item.result ? <><span>{copy.original}: {item.file.size.toLocaleString()} bytes</span><span>{copy.result}: {item.result.bytes.toLocaleString()} bytes · {((1 - item.result.bytes / item.file.size) * 100).toFixed(1)}% {copy.saved}</span></> : item.error ? <span>{item.error}</span> : null}</div>
        <div className="batch-download">{item.result && <a href={item.result.url} download={safeDownloadName(item.file.name, 'png').replace(/\.png$/, '-optimized.png')}>{copy.download}</a>}</div>
      </article>)}
      <button type="button" className="zip-action" data-png-batch-zip="true" disabled={!successes.length || running || zipWorking} onClick={downloadZip}>{zipWorking ? copy.preparingZip : copy.zip(successes.length)}</button>
    </div>}
  </section>;
}
