import { useEffect, useRef, useState } from 'react';
import { validateImageFile, ImageValidationError } from '../lib/image/file-validation';
import { pixelsFromPhysical, type PhysicalOutput, type PhysicalUnit } from '../lib/physical-resize';
import { physicalPresetFromSearch } from '../lib/resize-presets';
import { traditionalize } from '../lib/traditionalize';
import MetadataPrivacyToggle, { privacyMetadataErrorText, privacyMetadataResultText } from './MetadataPrivacyToggle';

type Locale = 'en' | 'zh-cn' | 'zh-tw';
const presets = [
  { key: '2x2', width: 2, height: 2, unit: 'in' as const, label: '2 × 2 in' },
  { key: '35x45', width: 35, height: 45, unit: 'mm' as const, label: '35 × 45 mm' },
  { key: '30x40', width: 30, height: 40, unit: 'mm' as const, label: '30 × 40 mm' },
  { key: '50x50', width: 50, height: 50, unit: 'mm' as const, label: '50 × 50 mm' }
];
const copy = {
  en: { choose: 'Drop a photo here or click to choose', formats: 'Static JPEG, PNG, WebP · up to 20 MB', size: 'Physical size', width: 'Width', height: 'Height', unit: 'Unit', mm: 'Millimetres', inch: 'Inches', dpi: 'DPI metadata', output: 'Output format', pixels: 'Output pixels', resize: 'Resize photo', reset: 'Reset', local: 'The image stays in your browser. JPEG and PNG exports are re-read after writing DPI metadata.', select: 'Choose a photo first.', working: 'Resizing photo…', ready: 'Photo is ready to download.', download: 'Download photo', verified: 'Verified DPI', warning: 'This tool changes pixels and writes print-density metadata. It does not certify any passport, visa, ID, or form requirement.', failed: 'The photo could not be processed.', animated: 'Animated images are not supported. Export a still frame first.' },
  'zh-cn': { choose: '将照片拖到这里，或点击选择', formats: '支持静态 JPEG、PNG、WebP · 最大 20 MB', size: '物理尺寸', width: '宽度', height: '高度', unit: '单位', mm: '毫米', inch: '英寸', dpi: 'DPI 元数据', output: '输出格式', pixels: '输出像素', resize: '调整照片尺寸', reset: '重置', local: '图片始终留在浏览器中。JPEG 和 PNG 导出后会重新读取 DPI 元数据。', select: '请先选择照片。', working: '正在调整照片尺寸…', ready: '照片已准备好下载。', download: '下载照片', verified: '已验证 DPI', warning: '此工具会修改像素并写入打印密度元数据，不保证任何护照、签证、证件照或表单要求。', failed: '无法处理这张照片。', animated: '不支持动态图片，请先导出静态画面。' },
  'zh-tw': { choose: '將相片拖到這裡，或點擊選擇', formats: '支援靜態 JPEG、PNG、WebP · 最大 20 MB', size: '實體尺寸', width: '寬度', height: '高度', unit: '單位', mm: '毫米', inch: '英吋', dpi: 'DPI 中繼資料', output: '輸出格式', pixels: '輸出像素', resize: '調整相片尺寸', reset: '重設', local: '圖片會留在瀏覽器中。JPEG 與 PNG 匯出後會重新讀取 DPI 中繼資料。', select: '請先選擇相片。', working: '正在調整相片尺寸…', ready: '相片已準備好下載。', download: '下載相片', verified: '已驗證 DPI', warning: '此工具會修改像素並寫入列印密度中繼資料，不保證任何護照、簽證、證件照或表單要求。', failed: '無法處理這張相片。', animated: '不支援動態圖片，請先匯出靜態畫面。' }
} as const;

export default function PhotoResizer({ locale = 'en' }: { locale?: Locale }) {
  const t = copy[locale]; const [file, setFile] = useState<File | null>(null); const [width, setWidth] = useState(35); const [height, setHeight] = useState(45); const [unit, setUnit] = useState<PhysicalUnit>('mm'); const [dpi, setDpi] = useState(300); const [output, setOutput] = useState<PhysicalOutput>('jpeg'); const [erasePrivacyMetadata, setErasePrivacyMetadata] = useState(false); const [status, setStatus] = useState<string>(t.select); const [result, setResult] = useState<{url:string;bytes:number;width:number;height:number;dpi:number;extension:string} | null>(null);
  const worker = useRef<Worker | null>(null); const input = useRef<HTMLInputElement>(null);
  const targetWidth = pixelsFromPhysical(width, unit, dpi); const targetHeight = pixelsFromPhysical(height, unit, dpi); const working = status === t.working;
  const clear = () => { worker.current?.terminate(); worker.current = null; setResult((current) => { if (current) URL.revokeObjectURL(current.url); return null; }); };
  useEffect(() => () => { worker.current?.terminate(); }, []);
  useEffect(() => { const preset = physicalPresetFromSearch(window.location.search); if (preset) { setWidth(preset.width); setHeight(preset.height); setUnit(preset.unit); setDpi(preset.dpi); } }, []);
  const choose = async (next?: File) => { if (!next) return; clear(); try { await validateImageFile(next); setFile(next); setStatus(`${next.name} · ${(next.size / 1000).toFixed(1)} KB`); } catch (error) { setFile(null); setStatus(error instanceof ImageValidationError && error.code === 'ANIMATION_UNSUPPORTED' ? t.animated : t.failed); } };
  const applyPreset = (key: string) => { const preset = presets.find((item) => item.key === key); if (!preset) return; clear(); setWidth(preset.width); setHeight(preset.height); setUnit(preset.unit); };
  const resize = () => {
    if (!file) { setStatus(t.select); return; } if (!targetWidth || !targetHeight) { setStatus(t.failed); return; }
    clear(); const next = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' }); worker.current = next; setStatus(t.working);
    next.onmessage = (event: MessageEvent<{type:string;blob?:Blob;width?:number;height?:number;bytes?:number;dpi?:number;privacyMetadataStatus?:'removed'|'none-present'|'preserved';error?:string}>) => { if (worker.current !== next) return; const data = event.data; if (data.type === 'success' && data.blob && data.dpi === dpi) { const url = URL.createObjectURL(data.blob); setResult({ url, bytes: data.bytes ?? data.blob.size, width: data.width ?? targetWidth, height: data.height ?? targetHeight, dpi: data.dpi, extension: output === 'jpeg' ? 'jpg' : 'png' }); setStatus(`${t.ready} ${privacyMetadataResultText(locale, data.privacyMetadataStatus)}`); } else setStatus(privacyMetadataErrorText(locale, data.error) ?? t.failed); next.terminate(); if (worker.current === next) worker.current = null; };
    next.onerror = () => { setStatus(t.failed); next.terminate(); if (worker.current === next) worker.current = null; };
    next.postMessage({ type: 'physical-resize', file, width: targetWidth, height: targetHeight, dpi, output, erasePrivacyMetadata });
  };
  const reset = () => { clear(); setWidth(35); setHeight(45); setUnit('mm'); setDpi(300); setOutput('jpeg'); setStatus(file ? `${file.name} · ${(file.size / 1000).toFixed(1)} KB` : t.select); };
  const statusError = status === t.select || status === t.failed || status === t.animated;
  const content = <section className="physical-resizer cards" aria-label={t.size} aria-busy={working}>
    <label className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label={t.choose} onChange={(event) => choose(event.target.files?.[0])}/><strong>{t.choose}</strong><span>{t.formats}</span></label>
    <div className="physical-presets" role="group" aria-label={t.size}>{presets.map((preset) => <button type="button" key={preset.key} onClick={() => applyPreset(preset.key)}>{preset.label}</button>)}</div>
    <div className="physical-grid"><label>{t.width}<input type="number" min="1" max="10000" step="0.1" value={width} onChange={(event) => { clear(); setWidth(Number(event.target.value)); }}/></label><label>{t.height}<input type="number" min="1" max="10000" step="0.1" value={height} onChange={(event) => { clear(); setHeight(Number(event.target.value)); }}/></label><label className="physical-select-field">{t.unit}<span className="physical-select-wrap"><select value={unit} onChange={(event) => { clear(); setUnit(event.target.value as PhysicalUnit); }}><option value="mm">{t.mm}</option><option value="in">{t.inch}</option></select></span></label><label>{t.dpi}<input type="number" min="1" max="1200" value={dpi} onChange={(event) => { clear(); setDpi(Math.min(1200, Math.max(1, Math.round(Number(event.target.value) || 1)))); }}/></label><label className="physical-select-field">{t.output}<span className="physical-select-wrap"><select value={output} onChange={(event) => { clear(); setOutput(event.target.value as PhysicalOutput); }}><option value="jpeg">JPEG</option><option value="png">PNG</option></select></span></label><output><strong>{t.pixels}</strong><span>{targetWidth && targetHeight ? `${targetWidth} × ${targetHeight} px` : '—'}</span></output></div>
    <MetadataPrivacyToggle locale={locale} checked={erasePrivacyMetadata} onChange={(value) => { clear(); setErasePrivacyMetadata(value); }} /><p className="physical-note">{t.local}</p><div className="physical-actions"><button className="primary-action" type="button" onClick={resize} disabled={working}>{t.resize}</button><button className="secondary-action" type="button" onClick={reset}>{t.reset}</button></div><p className={`status physical-status ${statusError ? 'error' : result ? 'success' : ''}`} role="status" aria-live="polite">{status}</p>
    {result && <section className="physical-result"><strong>{t.verified}: {result.dpi} DPI</strong><span>{result.width} × {result.height} px · {result.bytes.toLocaleString()} bytes · {output.toUpperCase()}</span><a href={result.url} download={`pixeltokb-${result.width}x${result.height}-${result.dpi}dpi.${result.extension}`}>{t.download}</a></section>}<p className="physical-warning">{t.warning}</p>
  </section>;
  return locale === 'zh-tw' ? traditionalize(content, file ? [file.name] : []) : content;
}
