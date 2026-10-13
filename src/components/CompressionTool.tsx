import { useEffect, useRef, useState } from 'react';
import { errorMessages, type ImageErrorCode } from '../lib/image/errors';
import { bytesFor, convertTargetUnit, type SizeUnit } from '../lib/presets';
import { compressionGroups, compressionPresetLabel, compressionGroupForPreset, compressionRangePresets, unifiedCompressionConfig, type CompressionGroup } from '../lib/compression-groups';
import { traditionalize } from '../lib/traditionalize';
import { safeDownloadName } from '../lib/image/download-name';

interface Props { group?: CompressionGroup; locale?: 'en' | 'zh-cn' | 'zh-tw'; }
const formatTarget = (value: number, unit: SizeUnit) => `${value} ${unit}`;
const zhErrors: Record<ImageErrorCode, string> = { FILE_TOO_LARGE: '图片超过 20 MB 限制。', PIXEL_LIMIT: '图片像素或目标尺寸超过 4000 万像素限制。', FORMAT_UNSUPPORTED: '仅支持静态 JPEG、PNG 和 WebP 图片。', ANIMATION_UNSUPPORTED: '不支持动态图片。请导出静态画面后重试。', TARGET_UNREACHABLE: '在当前格式和尺寸设置下无法达到目标大小。', ENCODER_UNAVAILABLE: '此浏览器无法完成图片编码。', PROCESSING_TIMEOUT: '处理超时，请尝试更小的图片或更大的目标大小。', DECODE_FAILED: '图片无法读取，请确认文件未损坏。', CANCELLED: '处理已取消。' };

export default function CompressionTool({ group = 'small', locale = 'en' }: Props) {
  const config = group === 'small' ? unifiedCompressionConfig : compressionGroups[group];
  const zh = locale !== 'en';
  const [file, setFile] = useState<File | null>(null); const [target, setTarget] = useState(config.defaultBytes / (config.defaultUnit === 'MB' ? 1_000_000 : 1000)); const [unit, setUnit] = useState<SizeUnit>(config.defaultUnit);
  const [output, setOutput] = useState<'auto' | 'jpeg' | 'webp' | 'png'>('jpeg'); const [jpegBackground, setJpegBackground] = useState('#ffffff'); const [preserve, setPreserve] = useState(true); const [status, setStatus] = useState(zh ? '处理仅在本设备进行' : 'Processing stays on this device'); const [progress, setProgress] = useState(0); const [result, setResult] = useState<{ url: string; bytes: number; width: number; height: number; extension: string; mime: string } | null>(null); const [activePreset, setActivePreset] = useState<number>(config.defaultBytes);
  const worker = useRef<Worker | null>(null); const timeout = useRef<ReturnType<typeof setTimeout> | null>(null); const input = useRef<HTMLInputElement>(null);
  const targetLabel = activePreset ? compressionPresetLabel(activePreset) : formatTarget(target, unit);
  const downloadName = result && file ? safeDownloadName(file.name, result.extension) : 'pixeltokb-image.jpg';
  useEffect(() => () => { worker.current?.terminate(); if (timeout.current) clearTimeout(timeout.current); }, []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  const invalidate = () => { worker.current?.terminate(); worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; setResult(null); setProgress(0); setStatus(zh ? '设置已更改，请重新压缩。' : 'Settings changed. Compress again.'); };
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const preset = compressionGroupForPreset(query.get('preset') || '');
    const presetBytes = preset ? compressionRangePresets[preset].recommendedBytes : undefined;
    const queryTarget = Number(query.get('target'));
    const queryUnit: SizeUnit = ['KB', 'KiB', 'MB', 'MiB'].includes(query.get('unit') || '') ? query.get('unit') as SizeUnit : 'KB';
    const queryBytes = Number.isFinite(queryTarget) && queryTarget > 0 ? bytesFor(queryTarget, queryUnit) : undefined;
    const nextBytes = presetBytes ?? queryBytes;
    if (nextBytes && nextBytes >= config.minBytes && nextBytes <= config.maxBytes) {
      const nextUnit: SizeUnit = nextBytes >= 1_000_000 && !query.has('target') ? 'MB' : queryUnit;
      setTarget(nextBytes / ({ KB: 1000, KiB: 1024, MB: 1_000_000, MiB: 1_048_576 }[nextUnit]));
      setUnit(nextUnit);
      setActivePreset(config.presets.some((value) => value === nextBytes) ? nextBytes : 0);
    }
  }, [group]);
  const choose = (next?: File) => {
    if (!next) return;
    invalidate(); setFile(null);
    if (next.size > 20_000_000) { setStatus(zh ? '图片不能超过 20 MB。' : 'Images must be 20 MB or smaller.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) { setStatus(zh ? '仅支持静态 JPEG、PNG 和 WebP 图片。' : 'Use a static JPEG, PNG, or WebP image.'); return; }
    setFile(next); if (next.type !== 'image/jpeg') setOutput('auto'); setStatus(`${next.name} · ${(next.size / 1000).toFixed(1)} KB ${zh ? '已就绪' : 'ready to compress'}`);
  };
  const setPreset = (bytes: number) => { invalidate(); const nextUnit: SizeUnit = bytes >= 1_000_000 ? 'MB' : 'KB'; setActivePreset(bytes); setTarget(bytes / (nextUnit === 'MB' ? 1_000_000 : 1000)); setUnit(nextUnit); };
  const compress = () => {
    if (!file) { setStatus(zh ? '请先选择图片。' : 'Choose an image before compressing.'); return; }
    const targetBytes = bytesFor(target, unit);
    if (!Number.isFinite(targetBytes) || targetBytes < config.minBytes || targetBytes > config.maxBytes) { setStatus(zh ? `目标大小须在 ${compressionPresetLabel(config.minBytes)} 至 ${compressionPresetLabel(config.maxBytes)} 之间。` : `Choose a target between ${compressionPresetLabel(config.minBytes)} and ${compressionPresetLabel(config.maxBytes)}.`); return; }
    worker.current?.terminate(); if (timeout.current) clearTimeout(timeout.current); const nextWorker = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' }); worker.current = nextWorker; setStatus(zh ? '正在压缩图片…' : 'Compressing image…'); setProgress(0); setResult(null);
    const stopWorker = () => { if (timeout.current) clearTimeout(timeout.current); timeout.current = null; nextWorker.terminate(); if (worker.current === nextWorker) worker.current = null; };
    timeout.current = setTimeout(() => { stopWorker(); setResult(null); setStatus((zh ? zhErrors : errorMessages).PROCESSING_TIMEOUT); }, 30_000);
    nextWorker.onmessage = (event: MessageEvent<{ type: string; value?: number; blob?: Blob; width?: number; height?: number; bytes?: number; error?: string }>) => { if (worker.current !== nextWorker) return; const data = event.data; if (data.type === 'progress') setProgress(data.value ?? 0); else if (data.type === 'success' && data.blob) { if (data.blob.size > targetBytes || !['image/jpeg', 'image/png', 'image/webp'].includes(data.blob.type)) { setStatus(zh ? '输出未通过字节或格式检查，不能下载。' : 'The output failed the byte or format check and cannot be downloaded.'); stopWorker(); return; } const url = URL.createObjectURL(data.blob); const extension = data.blob.type === 'image/webp' ? 'webp' : data.blob.type === 'image/png' ? 'png' : 'jpg'; setResult({ url, bytes: data.blob.size, width: data.width ?? 0, height: data.height ?? 0, extension, mime: data.blob.type }); setStatus(zh ? `完成：已确认不超过 ${targetLabel}。` : `Done: verified at or below ${targetLabel}.`); stopWorker(); } else if (data.type === 'error') { setStatus((zh ? zhErrors : errorMessages)[data.error as ImageErrorCode] ?? (zh ? '处理失败，请重试。' : 'Processing failed. Please try again.')); stopWorker(); } };
    nextWorker.onerror = () => { if (worker.current !== nextWorker) return; setResult(null); setStatus(zh ? '图片处理失败，请重试。' : 'Image processing failed. Please try again.'); stopWorker(); };
    nextWorker.postMessage({ type: 'compress', file, targetBytes, output, preserveDimensions: preserve, jpegBackground });
  };
  const faq = zh ? {
    lead: '了解如何把图片压缩到所选大小。',
    q1: `如何把照片压缩到 ${targetLabel}？`, a1: `上传图片，确认目标为 ${targetLabel} 后点击“压缩图片”。只有实际字节数通过检查后，才会提供下载。`,
    q2: `${targetLabel} 的照片画质还好吗？`, a2: '画质取决于原图尺寸和细节。工具会先调整编码；允许缩小尺寸时，也会在目标体积无法达到时减少像素。',
    q3: '应该选择 JPG 还是 WebP？', a3: '需要广泛兼容时选 JPG；接收网站支持 WebP 时，WebP 通常更省空间。自动或 WebP 会保留透明度；主动选择 JPEG 会用所选背景色填充透明区域。',
    q4: '为什么 PNG 更难压缩？', a4: 'PNG 采用无损编码并保留透明度。照片通常更适合 JPEG 或 WebP；选择 PNG 时会通过减少像素来降低体积。'
  } : {
    lead: 'Find quick answers to common questions about compressing images.',
    q1: `How do I compress a photo to ${targetLabel}?`, a1: `Upload the image, keep ${targetLabel} selected, then choose Compress image. The result is only offered for download after its actual bytes are checked.`,
    q2: `Will a ${targetLabel} photo still look good?`, a2: 'It depends on the source dimensions and detail. pixeltokb adjusts encoding first, then can reduce pixels if you allow it and the target cannot otherwise be reached.',
    q3: 'Should I choose JPG or WebP?', a3: 'Choose JPG for broad compatibility. Choose WebP when the receiving website supports it. Auto or WebP preserves alpha; choosing JPEG fills transparent areas with your selected background.',
    q4: 'Why can PNG be harder to compress?', a4: 'PNG uses lossless encoding and keeps transparency. JPEG or WebP often works better for photos; PNG size is reduced by changing pixel dimensions.'
  };
  const working = status === 'Compressing image…' || status === '正在压缩图片…';
  const content = <>
    <section className="workspace" data-image-selected={Boolean(file)} aria-label={zh ? '图片压缩工具' : 'Image compression tool'} aria-busy={working}>
      <div className="upload-zone"><div className="upload-zone-inner" role="button" tabIndex={0} aria-label={zh ? '选择要压缩的图片，支持拖放' : 'Choose an image to compress, or drop one here'} onClick={() => input.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.current?.click(); } }} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag'); }} onDragLeave={(event) => event.currentTarget.classList.remove('drag')} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('drag'); choose(event.dataTransfer.files[0]); }}><input ref={input} type="file" tabIndex={-1} aria-label={zh ? '选择要压缩的图片' : 'Choose an image to compress'} accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0])} /><svg className="upload-icon" viewBox="0 0 72 58" aria-hidden="true"><path d="M22 48H16a13 13 0 1 1 4-25 17 17 0 0 1 32-4 14 14 0 0 1 4 28H48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M36 49V26m0 0-9 9m9-9 9 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg><strong>{zh ? '将图片拖到这里' : 'Drop an image here'}</strong><small>{zh ? 'JPEG、PNG 或 WebP · 最大 20 MB' : 'JPEG, PNG or WebP · up to 20 MB'}</small><span className="image-placeholder" aria-hidden="true" /></div></div>
      <aside className="settings-card">
        <div className="settings-heading"><span>{zh ? '目标大小' : 'Target size'}</span><span className="local-state">{zh ? '仅在本设备处理' : 'Processing stays on this device'}</span></div>
        <div className="preset-grid" role="group" aria-label={zh ? '目标大小预设' : 'Target size presets'}>
          {config.presets.map((bytes) => <button className={`preset ${activePreset === bytes ? 'active' : ''}`} type="button" key={bytes} aria-pressed={activePreset === bytes} onClick={() => setPreset(bytes)} style={activePreset === bytes ? undefined : { color: '#f4f8ff', backgroundColor: '#0d2035', backgroundImage: 'none' }}>{compressionPresetLabel(bytes)}</button>)}
        </div>
        <div className="settings-row">
          <input className="custom-radio" id="custom-target" type="radio" name="target-mode" aria-label={zh ? '自定义目标大小' : 'Custom target size'} checked={activePreset === 0} onChange={() => { invalidate(); setActivePreset(0); }} />
          <label htmlFor="custom-target">{zh ? '自定义' : 'Custom'}</label>
          <input aria-label={zh ? '自定义目标大小' : 'Custom target size'} type="number" min={config.minBytes / bytesFor(1, unit)} max={config.maxBytes / bytesFor(1, unit)} step="any" value={target} onChange={(event) => { invalidate(); setActivePreset(0); setTarget(Number(event.target.value)); }} />
          <select aria-label={zh ? '目标大小单位' : 'Target size unit'} value={unit} onChange={(event) => { invalidate(); const nextUnit = event.target.value as SizeUnit; setTarget(convertTargetUnit(target, unit, nextUnit)); setUnit(nextUnit); setActivePreset(0); }}><option>KB</option><option>KiB</option><option>MB</option><option>MiB</option></select>
        </div>
        <label className="field-label">{zh ? '输出格式' : 'Output format'}<select value={output} onChange={(event) => { invalidate(); setOutput(event.target.value as 'auto' | 'jpeg' | 'webp' | 'png'); }}><option value="jpeg">JPEG</option><option value="webp">WebP</option><option value="png">PNG</option><option value="auto">{zh ? '自动 · 保留透明度' : 'Auto · preserve alpha'}</option></select></label>
        {output === 'jpeg' && <>
          <label className="field-label jpeg-background-row"><span>{zh ? 'JPEG 背景色' : 'JPEG background'}</span><span className="jpeg-background-control"><input type="color" aria-label={zh ? '选择 JPEG 背景色' : 'Choose JPEG background color'} value={jpegBackground} onInput={(event) => { invalidate(); setJpegBackground(event.currentTarget.value); }} /><output>{jpegBackground.toUpperCase()}</output></span></label>
          {file && file.type !== 'image/jpeg' && <p className="jpeg-warning" role="note">{zh ? 'JPEG 不支持透明度。透明区域会填充为所选背景色；默认是白色。' : 'JPEG does not support transparency. Transparent areas will be filled with the selected background; white is the default.'}</p>}
        </>}
        <div className="field-label"><span>{zh ? '保持原始尺寸' : 'Keep dimensions'}</span><button className="switch" type="button" aria-pressed={preserve} aria-label={zh ? '保持原始尺寸' : 'Keep original dimensions'} onClick={() => { invalidate(); setPreserve((current) => !current); }} style={!preserve ? { background: '#94a3b8' } : undefined}><i style={!preserve ? { marginLeft: 0 } : undefined}/></button></div>
        <button className="primary-action" type="button" onClick={compress} disabled={working}>{working ? `${zh ? '压缩中' : 'Compressing'} ${progress}%` : zh ? '压缩图片 →' : 'Compress image →'}</button>
        {working && <button type="button" className="cancel-action" onClick={() => { worker.current?.terminate(); worker.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null; setProgress(0); setStatus(zh ? '已取消压缩。' : 'Compression canceled.'); }}>{zh ? '取消' : 'Cancel'}</button>}
        <div className={`status ${result ? 'success' : status.includes('Choose') || status.includes('请') || status.includes('Use a') || status.includes('不能') ? 'error' : ''}`} role="status" aria-live="polite">{status}</div>
      </aside>
    </section>
    {result && <section className="result"><img src={result.url} alt={zh ? '压缩后预览' : 'Compressed preview'}/><div><strong>{zh ? '压缩完成' : 'Compressed successfully'}</strong><p>{result.width} × {result.height}px · {result.mime === 'image/jpeg' ? 'JPEG' : result.mime === 'image/png' ? 'PNG' : 'WebP'} · {(result.bytes / 1000).toFixed(1)} KB · {result.bytes.toLocaleString()} {zh ? '字节' : 'bytes'}</p><a href={result.url} download={downloadName}>{zh ? '下载结果' : 'Download result'}</a></div></section>}
    <div className="trust-grid"><div className="trust-card"><span className="trust-icon">♢</span><span><strong>{zh ? '100% 本地处理' : '100% local'}</strong><small>{zh ? '所有操作都在浏览器中完成。' : 'Everything runs in your browser.'}</small></span></div><div className="trust-card"><span className="trust-icon">◌</span><span><strong>{zh ? '不会上传' : 'No upload'}</strong><small>{zh ? '图片不会离开你的设备。' : 'Your images never leave your device.'}</small></span></div><div className="trust-card"><span className="trust-icon">▧</span><span><strong>{zh ? '精确字节检查' : 'Exact byte check'}</strong><small>{zh ? '下载前可查看最终文件大小。' : 'See the final file size before downloading.'}</small></span></div></div>
    <section className="content-section"><h2>{zh ? '什么是精确大小图片压缩？' : 'What is exact-size image compression?'}</h2><p>{zh ? '精确大小图片压缩是生成不超过所选字节目标的 JPEG、PNG 或 WebP 文件，并依据设置保留或缩小像素尺寸。' : 'Exact-size image compression produces a JPEG, PNG, or WebP file that does not exceed a selected byte target while preserving or reducing pixel dimensions according to your setting.'}</p><h2>{zh ? '如何把图片压缩到精确大小？' : 'How do I compress an image to an exact size?'}</h2><p>{zh ? '上传图片，选择目标大小和输出格式，然后压缩；只有实际字节数通过检查后才会提供下载。' : 'Upload the image, choose the target size and output format, then compress it. The download is offered only after the actual byte count passes the target check.'}</p><div className="steps"><div className="step-card"><span className="step-no">1</span><h3>{zh ? '上传' : 'Upload'}</h3><small>{zh ? '拖放图片，或从设备中选择文件。' : 'Drag and drop an image or choose a file from your device.'}</small></div><div className="step-card"><span className="step-no">2</span><h3>{zh ? '选择目标' : 'Choose a target'}</h3><small>{zh ? '选择大小、格式和选项。自动会保留透明度；JPEG 使用所选背景色。' : 'Pick a size, format and options. Auto preserves alpha; JPEG uses the selected background.'}</small></div><div className="step-card"><span className="step-no">3</span><h3>{zh ? '下载' : 'Download'}</h3><small>{zh ? '压缩图片并立即下载结果。' : 'Compress your image and download the result instantly.'}</small></div></div></section>
    <section className="content-section format-section"><h2>{zh ? '应该选择哪种图片格式？' : 'Which image format should I choose?'}</h2><p>{zh ? '照片和通用兼容性优先选 JPG，支持 WebP 的网站可选 WebP，截图、标志或透明图形选 PNG。' : 'Choose JPG for photos and broad compatibility, WebP for websites that accept it, and PNG for screenshots, logos, or graphics that need transparency.'}</p><div className="format-table" role="region" tabIndex={0} aria-label={zh ? '图片格式比较表' : 'Image format comparison table'}><table><thead><tr><th scope="col">{zh ? '格式' : 'Format'}</th><th scope="col">{zh ? '如何达到目标' : 'How it reaches the target'}</th><th scope="col">{zh ? '适用场景' : 'Best for'}</th></tr></thead><tbody><tr><td><span className="format-name"><i className="format-icon" aria-hidden="true">⌁</i>JPG</span></td><td>{zh ? '先调整画质，再缩小像素尺寸。' : 'Adjusts quality, then pixel size.'}</td><td>{zh ? '表单、邮件和多数网站上的照片。' : 'Photos for forms, email and most websites.'}</td></tr><tr><td><span className="format-name"><i className="format-icon webp" aria-hidden="true">⌁</i>WebP</span></td><td>{zh ? '先调整画质，再缩小像素尺寸。' : 'Adjusts quality, then pixel size.'}</td><td>{zh ? '支持 WebP 的网站和应用。' : 'Websites and apps that accept WebP.'}</td></tr><tr><td><span className="format-name"><i className="format-icon" aria-hidden="true">▦</i>PNG</span></td><td>{zh ? '无损编码，仅缩小像素尺寸。' : 'Lossless encoding; pixel size only.'}</td><td>{zh ? '截图、标志、带透明背景的图形。' : 'Screenshots, logos, graphics with transparency.'}</td></tr></tbody></table></div><p className="format-source">{zh ? '格式资料来源：' : 'Format reference: '}<cite><a href="https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types">{zh ? 'MDN 图片文件类型与格式指南' : 'MDN image file type and format guide'}</a></cite>{zh ? '。' : '.'}</p><blockquote className="format-quote" cite="https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types"><p>{zh ? '「需要更精确的源图重现或透明度时，应优先选择 PNG，而非 JPEG。」' : '“PNG is preferred over JPEG for more precise reproduction of source images, or when transparency is needed.”'}</p><footer>— <cite><a href="https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types">MDN</a></cite></footer></blockquote></section>
    <section className="content-section faq-section"><div className="faq-heading"><h2>{zh ? '压缩图片前还需要了解什么？' : 'What should I know before compressing an image?'}</h2></div><p>{faq.lead}</p><div className="faq-list"><details className="faq-item"><summary><h3>{faq.q1}</h3></summary><p>{faq.a1}</p></details><details className="faq-item"><summary><h3>{faq.q2}</h3></summary><p>{faq.a2}</p></details><details className="faq-item"><summary><h3>{faq.q3}</h3></summary><p>{faq.a3}</p></details><details className="faq-item"><summary><h3>{faq.q4}</h3></summary><p>{faq.a4}</p></details></div></section>
  </>;
  return locale === 'zh-tw' ? traditionalize(content, file ? [file.name] : []) : content;
}
