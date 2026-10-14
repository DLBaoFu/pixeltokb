// @ts-nocheck -- CDP responses and browser-side evaluation values are asserted at runtime.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { inspectPng } from '../src/lib/png/lossless.ts';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputPath = process.argv[2];
const root = process.cwd();
const sourcePath = resolve(root, 'tests/fixtures/images/unoptimized-alpha.png');
const jpegPath = resolve(root, 'tests/fixtures/images/opaque-gradient.jpg');
const workspace = await mkdtemp(join(tmpdir(), 'pixeltokb-png-e2e-'));
const profile = join(workspace, 'profile');
const downloads = join(workspace, 'downloads');
await mkdir(profile); await mkdir(downloads);
const port = 9341;
const chromeProcess = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  crcTable[index] = value >>> 0;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0); typeBytes.copy(chunk, 4); Buffer.from(data).copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(data)])), data.length + 8);
  return chunk;
}
function readStoredZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0, 'batch ZIP must use stored entries');
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    entries.push({ name: Buffer.from(bytes.subarray(nameStart, nameStart + nameLength)).toString('utf8'), data: Buffer.from(bytes.subarray(dataStart, dataStart + size)) });
    offset = dataStart + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50, 'batch ZIP must include a central directory');
  return entries;
}

let socket;
try {
  const source = await readFile(sourcePath);
  const animatedPath = join(workspace, 'animated.png');
  const exifPath = join(workspace, 'with-exif.png');
  const opaquePath = join(workspace, 'opaque-rgb.png');
  const mismatchedPath = join(workspace, 'jpeg-disguised-as-png.png');
  const animationControl = pngChunk('acTL', Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]));
  await writeFile(animatedPath, Buffer.concat([source.subarray(0, 33), animationControl, source.subarray(33)]));
  await writeFile(exifPath, Buffer.concat([source.subarray(0, 33), pngChunk('eXIf', Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 0, 0])), source.subarray(33)]));
  const opaqueHeader = Buffer.alloc(13); opaqueHeader.writeUInt32BE(320, 0); opaqueHeader.writeUInt32BE(240, 4); opaqueHeader.set([8, 2, 0, 0, 0], 8);
  const opaqueScanlines = Buffer.alloc((320 * 3 + 1) * 240);
  for (let y = 0; y < 240; y += 1) for (let x = 0; x < 320; x += 1) {
    const offset = y * (320 * 3 + 1) + 1 + x * 3;
    opaqueScanlines[offset] = x & 0xff; opaqueScanlines[offset + 1] = y; opaqueScanlines[offset + 2] = (x + y) & 0xff;
  }
  await writeFile(opaquePath, Buffer.concat([Buffer.from(PNG_SIGNATURE), pngChunk('IHDR', opaqueHeader), pngChunk('tEXt', Buffer.from('Fixture\0opaque RGB gradient')), pngChunk('IDAT', deflateSync(opaqueScanlines)), pngChunk('IEND', Buffer.alloc(0))]));
  await writeFile(mismatchedPath, await readFile(jpegPath));
  const batchOverflowPaths = [];
  for (let index = 0; index < 21; index += 1) {
    const path = join(workspace, `batch-${index + 1}.png`);
    await writeFile(path, source);
    batchOverflowPaths.push(path);
  }

  let target;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); break; }
    catch { await delay(100); }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome debugging target did not become ready');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, reject) => { socket.addEventListener('open', resolveOpen, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let commandId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolveSend, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve: resolveSend, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Browser evaluation failed');
    return response.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  async function navigate(pathname) {
    await send('Page.navigate', { url: `${origin}${pathname}` });
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(pathname)} && Boolean(document.querySelector('[data-png-optimizer="true"]')) && !document.querySelector('astro-island[ssr]')`)) return;
      await delay(20);
    }
    throw new Error(`Timed out loading ${pathname}`);
  }
  await navigate('/compress-png/');
  const userAgent = await evaluate('navigator.userAgent');

  async function setFile(path) {
    const document = await send('DOM.getDocument', { depth: -1, pierce: true });
    const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: '[data-png-optimizer="true"] input[type="file"]' });
    assert.ok(input.nodeId, 'PNG file input must exist');
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [path] });
    await evaluate(`document.querySelector('[data-png-optimizer="true"] input[type="file"]').dispatchEvent(new Event('change',{bubbles:true}))`);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const state = await evaluate(`document.querySelector('[data-png-status]')?.dataset.pngStatus`);
      if (state === 'ready' || state === 'error') return state;
      await delay(20);
    }
    throw new Error(`Timed out selecting ${path}`);
  }
  async function runAndWait() {
    await evaluate(`document.querySelector('[data-png-optimizer="true"] .primary-action').click()`);
    for (let attempt = 0; attempt < 1600; attempt += 1) {
      const state = await evaluate(`document.querySelector('[data-png-status]')?.dataset.pngStatus`);
      if (['optimized', 'unchanged', 'error', 'cancelled'].includes(state)) return state;
      await delay(20);
    }
    throw new Error('Timed out waiting for PNG optimization');
  }
  async function setBatchFiles(paths) {
    const document = await send('DOM.getDocument', { depth: -1, pierce: true });
    const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: '[data-png-batch="true"] input[type="file"]' });
    assert.ok(input.nodeId, 'batch PNG file input must exist');
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: paths });
    await evaluate(`document.querySelector('[data-png-batch="true"] input[type="file"]').dispatchEvent(new Event('change',{bubbles:true}))`);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const state = await evaluate(`document.querySelector('[data-png-batch-status]')?.dataset.pngBatchStatus`);
      if (state === 'ready' || state === 'error') return state;
      await delay(20);
    }
    throw new Error('Timed out selecting batch PNG files');
  }
  async function runBatchAndWait() {
    await evaluate(`document.querySelector('[data-png-batch="true"] .primary-action').click()`);
    for (let attempt = 0; attempt < 2400; attempt += 1) {
      const state = await evaluate(`document.querySelector('[data-png-batch-status]')?.dataset.pngBatchStatus`);
      if (['complete', 'cancelled', 'error'].includes(state)) return state;
      await delay(20);
    }
    throw new Error('Timed out waiting for batch PNG optimization');
  }

  assert.equal(await setFile(sourcePath), 'ready');
  assert.equal(await runAndWait(), 'optimized');
  const result = await evaluate(`(() => { const node=document.querySelector('[data-png-result="optimized"]'); return node ? { originalBytes:Number(node.dataset.originalBytes), outputBytes:Number(node.dataset.outputBytes), width:Number(node.dataset.width), height:Number(node.dataset.height), alpha:node.dataset.alpha==='true', download:document.querySelector('[data-png-download="true"]')?.getAttribute('download') } : null; })()`);
  assert.ok(result, 'optimized result must be rendered');
  assert.equal(result.originalBytes, source.length);
  assert.ok(result.outputBytes > 0 && result.outputBytes < result.originalBytes);
  assert.deepEqual([result.width, result.height, result.alpha], [320, 240, true]);
  assert.match(result.download, /-optimized\.png$/);
  const pixelComparison = await evaluate(`(async()=>{const sourceFile=document.querySelector('[data-png-optimizer="true"] input[type="file"]').files[0];const image=document.querySelector('[data-png-result="optimized"] img');const source=await createImageBitmap(sourceFile);const output=await createImageBitmap(await (await fetch(image.src)).blob());const left=new OffscreenCanvas(source.width,source.height);const right=new OffscreenCanvas(output.width,output.height);const leftContext=left.getContext('2d',{willReadFrequently:true});const rightContext=right.getContext('2d',{willReadFrequently:true});leftContext.drawImage(source,0,0);rightContext.drawImage(output,0,0);const a=leftContext.getImageData(0,0,source.width,source.height).data;const b=rightContext.getImageData(0,0,output.width,output.height).data;let mismatches=0;for(let index=0;index<a.length;index+=1)if(a[index]!==b[index])mismatches+=1;const corner=b[3];const center=b[(Math.floor(output.height/2)*output.width+Math.floor(output.width/2))*4+3];source.close();output.close();return {mismatches,corner,center};})()`);
  assert.deepEqual(pixelComparison, { mismatches: 0, corner: 0, center: 255 });
  await evaluate(`document.querySelector('[data-png-download="true"]').click()`);
  let downloadedFile;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const entries = (await readdir(downloads)).filter((name) => !name.endsWith('.crdownload'));
    if (entries.length) { downloadedFile = join(downloads, entries[0]); break; }
    await delay(25);
  }
  assert.ok(downloadedFile, 'optimized PNG must be saved to disk');
  const downloaded = await readFile(downloadedFile);
  const downloadedInspection = inspectPng(new Uint8Array(downloaded));
  assert.equal(downloaded.length, result.outputBytes);
  assert.deepEqual([downloadedInspection.width, downloadedInspection.height, downloadedInspection.hasAlpha], [320, 240, true]);
  assert.deepEqual(downloadedInspection.metadataChunks, []);

  assert.equal(await setFile(opaquePath), 'ready');
  assert.equal(await runAndWait(), 'optimized');
  const opaqueCase = await evaluate(`(async()=>{const node=document.querySelector('[data-png-result="optimized"]');const link=document.querySelector('[data-png-download="true"]');const bytes=new Uint8Array(await (await fetch(link.href)).arrayBuffer());return {state:document.querySelector('[data-png-status]')?.dataset.pngStatus,originalBytes:Number(node.dataset.originalBytes),outputBytes:Number(node.dataset.outputBytes),alpha:node.dataset.alpha==='true',colorType:bytes[25],signature:Array.from(bytes.slice(0,8)).map(value=>value.toString(16).padStart(2,'0')).join('')}})()`);
  assert.equal(opaqueCase.state, 'optimized'); assert.equal(opaqueCase.alpha, false); assert.equal(opaqueCase.colorType, 2); assert.equal(opaqueCase.signature, '89504e470d0a1a0a'); assert.ok(opaqueCase.outputBytes < opaqueCase.originalBytes);

  assert.equal(await setFile(exifPath), 'ready');
  assert.equal(await runAndWait(), 'optimized');
  const metadataCase = await evaluate(`({ state:document.querySelector('[data-png-status]')?.dataset.pngStatus, result:Boolean(document.querySelector('[data-png-result="optimized"]')), download:Boolean(document.querySelector('[data-png-download="true"]')), metadata:document.querySelector('.png-result-list > div:nth-child(6) dd')?.textContent })`);
  assert.deepEqual([metadataCase.state, metadataCase.result, metadataCase.download], ['optimized', true, true]);
  assert.match(metadataCase.metadata, /removed|移除/i);

  assert.equal(await setFile(downloadedFile), 'ready');
  assert.equal(await runAndWait(), 'unchanged');
  const noSaving = await evaluate(`({ state:document.querySelector('[data-png-status]')?.dataset.pngStatus, text:document.querySelector('[data-png-status]')?.textContent, result:Boolean(document.querySelector('[data-png-result]')), download:Boolean(document.querySelector('[data-png-download]')) })`);
  assert.equal(noSaving.state, 'unchanged');
  assert.match(noSaving.text, /already as small|无法继续减小|無法繼續縮小/i);
  assert.equal(noSaving.result, false); assert.equal(noSaving.download, false);

  const negativeCases = [];
  for (const [name, path, expectedPattern] of [
    ['animated PNG', animatedPath, /animated|动态|動態/i],
    ['mismatched PNG signature', mismatchedPath, /PNG|supported|支持|支援/i]
  ]) {
    assert.equal(await setFile(path), 'ready');
    assert.equal(await runAndWait(), 'error');
    const details = await evaluate(`({ text:document.querySelector('[data-png-status]')?.textContent, result:Boolean(document.querySelector('[data-png-result]')), download:Boolean(document.querySelector('[data-png-download]')) })`);
    assert.match(details.text, expectedPattern);
    assert.equal(details.result, false); assert.equal(details.download, false);
    negativeCases.push({ name, state: 'error', message: details.text, result: false, download: false });
  }

  assert.equal(await setFile(sourcePath), 'ready');
  await evaluate(`document.querySelector('[data-png-optimizer="true"] .primary-action').click(); setTimeout(()=>document.querySelector('.cancel-action')?.click(),0)`);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await evaluate(`document.querySelector('[data-png-status]')?.dataset.pngStatus`);
    if (state === 'cancelled') break;
    await delay(10);
  }
  const canceled = await evaluate(`({ state:document.querySelector('[data-png-status]')?.dataset.pngStatus, result:Boolean(document.querySelector('[data-png-result]')), download:Boolean(document.querySelector('[data-png-download]')) })`);
  assert.deepEqual(canceled, { state: 'cancelled', result: false, download: false });

  assert.equal(await setBatchFiles([sourcePath, opaquePath, animatedPath, mismatchedPath, downloadedFile]), 'ready');
  assert.equal(await runBatchAndWait(), 'complete');
  const batchRows = await evaluate(`Array.from(document.querySelectorAll('[data-batch-item]')).map(node=>({name:node.dataset.batchItem,status:node.dataset.batchStatus,download:Boolean(node.querySelector('a[download]'))}))`);
  assert.deepEqual(batchRows.map((row) => row.status), ['optimized', 'optimized', 'error', 'error', 'unchanged']);
  assert.deepEqual(batchRows.map((row) => row.download), [true, true, false, false, false]);
  const zipButton = await evaluate(`({disabled:document.querySelector('[data-png-batch-zip]')?.disabled,text:document.querySelector('[data-png-batch-zip]')?.textContent})`);
  assert.equal(zipButton.disabled, false);
  assert.match(zipButton.text, /2 successful files/i);
  await evaluate(`document.querySelector('[data-png-batch-zip]').click()`);
  let zipPath;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const zipName = (await readdir(downloads)).find((name) => name.endsWith('.zip'));
    if (zipName) { zipPath = join(downloads, zipName); break; }
    await delay(25);
  }
  assert.ok(zipPath, 'batch ZIP must be saved to disk');
  const zipEntries = readStoredZip(await readFile(zipPath));
  assert.equal(zipEntries.length, 2);
  assert.deepEqual(zipEntries.map((entry) => entry.name), ['unoptimized-alpha-optimized.png', 'opaque-rgb-optimized.png']);
  for (const entry of zipEntries) {
    assert.equal(entry.data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    inspectPng(new Uint8Array(entry.data));
  }
  assert.equal(zipEntries.some((entry) => /animated|disguised|pixeltokb-unoptimized/.test(entry.name)), false);
  const batchCase = { rows: batchRows, zip: { file: zipPath.split('/').pop(), entries: zipEntries.map((entry) => ({ name: entry.name, bytes: entry.data.length, signature: entry.data.subarray(0, 8).toString('hex') })) } };
  if (process.env.PNG_BATCH_SCREENSHOT) {
    const bounds = await evaluate(`(() => { const node = document.querySelector('.png-batch-section'); const rect = node.getBoundingClientRect(); return { x: rect.left, y: rect.top + scrollY, width: rect.width, height: rect.height }; })()`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...bounds, scale: 1 } });
    await writeFile(process.env.PNG_BATCH_SCREENSHOT, Buffer.from(screenshot.data, 'base64'));
  }

  assert.equal(await setBatchFiles(batchOverflowPaths), 'error');
  const overflowCase = await evaluate(`({state:document.querySelector('[data-png-batch-status]')?.dataset.pngBatchStatus,text:document.querySelector('[data-png-batch-status]')?.textContent,rows:document.querySelectorAll('[data-batch-item]').length,zip:Boolean(document.querySelector('[data-png-batch-zip]'))})`);
  assert.equal(overflowCase.state, 'error'); assert.match(overflowCase.text, /at most 20/i); assert.equal(overflowCase.rows, 0); assert.equal(overflowCase.zip, false);

  await evaluate(`Object.defineProperty(navigator,'deviceMemory',{value:4,configurable:true})`);
  assert.equal(await setBatchFiles([sourcePath, opaquePath]), 'ready');
  assert.equal(await runBatchAndWait(), 'complete');
  const lowMemoryCase = await evaluate(`({notice:document.querySelector('.batch-notice')?.textContent,statuses:Array.from(document.querySelectorAll('[data-batch-item]')).map(node=>node.dataset.batchStatus)})`);
  assert.match(lowMemoryCase.notice, /limited memory/i); assert.deepEqual(lowMemoryCase.statuses, ['optimized', 'optimized']);

  assert.equal(await setBatchFiles(batchOverflowPaths.slice(0, 10)), 'ready');
  await evaluate(`document.querySelector('[data-png-batch="true"] .primary-action').click(); setTimeout(()=>document.querySelector('[data-png-batch="true"] .cancel-action')?.click(),0)`);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`document.querySelector('[data-png-batch-status]')?.dataset.pngBatchStatus === 'cancelled'`)) break;
    await delay(10);
  }
  const batchCancellation = await evaluate(`({state:document.querySelector('[data-png-batch-status]')?.dataset.pngBatchStatus,statuses:Array.from(document.querySelectorAll('[data-batch-item]')).map(node=>node.dataset.batchStatus)})`);
  assert.equal(batchCancellation.state, 'cancelled');
  assert.equal(batchCancellation.statuses.every((state) => state === 'cancelled' || state === 'optimized'), true);

  const localizedRuns = [];
  for (const [pathname, expectedLang, expectedText] of [
    ['/zh-cn/compress-png/', 'zh-CN', '已验证更小的 PNG'],
    ['/zh-tw/compress-png/', 'zh-TW', '已驗證較小的 PNG']
  ]) {
    await navigate(pathname);
    assert.equal(await setFile(sourcePath), 'ready');
    assert.equal(await runAndWait(), 'optimized');
    const localized = await evaluate(`({ lang:document.documentElement.lang, status:document.querySelector('[data-png-status]')?.textContent, result:Boolean(document.querySelector('[data-png-result="optimized"]')), download:Boolean(document.querySelector('[data-png-download="true"]')) })`);
    assert.equal(localized.lang, expectedLang); assert.equal(localized.status, expectedText); assert.equal(localized.result, true); assert.equal(localized.download, true);
    assert.equal(await setBatchFiles([sourcePath, opaquePath]), 'ready');
    assert.equal(await runBatchAndWait(), 'complete');
    const localizedBatch = await evaluate(`({phase:document.querySelector('[data-png-batch-status]')?.dataset.pngBatchStatus,statuses:Array.from(document.querySelectorAll('[data-batch-item]')).map(node=>node.dataset.batchStatus),downloads:document.querySelectorAll('[data-batch-item] a[download]').length,zipDisabled:document.querySelector('[data-png-batch-zip]')?.disabled})`);
    assert.deepEqual(localizedBatch.statuses, ['optimized', 'optimized']); assert.equal(localizedBatch.downloads, 2); assert.equal(localizedBatch.zipDisabled, false);
    localizedRuns.push({ pathname, ...localized, batch: localizedBatch });
  }

  const report = {
    browser: userAgent,
    route: '/compress-png/',
    input: { file: 'tests/fixtures/images/unoptimized-alpha.png', bytes: source.length, width: 320, height: 240, alpha: true, metadataChunks: inspectPng(new Uint8Array(source)).metadataChunks },
    output: { file: result.download, bytes: downloaded.length, width: downloadedInspection.width, height: downloadedInspection.height, alpha: downloadedInspection.hasAlpha, pixelComparison, metadataChunks: downloadedInspection.metadataChunks, colorChunks: downloadedInspection.chunkTypes.filter((type) => ['sRGB', 'iCCP', 'gAMA', 'cHRM'].includes(type)), signature: downloaded.subarray(0, 8).toString('hex'), savedToDisk: true },
    opaqueCase,
    metadataCase,
    noSaving,
    negativeCases,
    cancellation: canceled,
    batchCase,
    batchOverflow: overflowCase,
    lowMemoryBatch: lowMemoryCase,
    batchCancellation,
    localizedRuns
  };
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} finally {
  socket?.close();
  chromeProcess.kill('SIGTERM');
  await Promise.race([new Promise((resolveExit) => chromeProcess.once('exit', resolveExit)), delay(2000)]);
  await rm(workspace, { recursive: true, force: true });
}
