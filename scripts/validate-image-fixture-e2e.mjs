// @ts-nocheck -- CDP responses and binary fixture assertions are runtime-checked.
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
const workspace = await mkdtemp(join(tmpdir(), 'pixeltokb-image-fixture-e2e-'));
const profile = join(workspace, 'profile');
const downloads = join(workspace, 'downloads');
await mkdir(profile); await mkdir(downloads);
const port = 9343;
const chromeProcess = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const ascii = (bytes, offset, length) => Buffer.from(bytes.subarray(offset, offset + length)).toString('latin1');
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

function exifFixture() {
  // A valid little-endian EXIF block: orientation 6, GPS latitude/longitude.
  const gpsOffset = 38;
  const rationalOffset = gpsOffset + 54;
  const tiff = Buffer.alloc(rationalOffset + 48);
  tiff.write('II', 0, 'ascii'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);
  tiff.writeUInt16LE(0x0112, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(6, 18);
  tiff.writeUInt16LE(0x8825, 22); tiff.writeUInt16LE(4, 24); tiff.writeUInt32LE(1, 26); tiff.writeUInt32LE(gpsOffset, 30);
  tiff.writeUInt32LE(0, 34);
  tiff.writeUInt16LE(4, gpsOffset);
  const gpsEntry = (index, tag, type, count, value) => { const offset = gpsOffset + 2 + index * 12; tiff.writeUInt16LE(tag, offset); tiff.writeUInt16LE(type, offset + 2); tiff.writeUInt32LE(count, offset + 4); if (type === 2) tiff.write(value, offset + 8, 'ascii'); else tiff.writeUInt32LE(value, offset + 8); };
  gpsEntry(0, 0x0001, 2, 2, 'N\0'); gpsEntry(1, 0x0002, 5, 3, rationalOffset);
  gpsEntry(2, 0x0003, 2, 2, 'E\0'); gpsEntry(3, 0x0004, 5, 3, rationalOffset + 12);
  tiff.writeUInt32LE(0, gpsOffset + 50);
  [[35, 1], [40, 1], [0, 1], [139, 1], [41, 1], [0, 1]].forEach(([numerator, denominator], index) => { const offset = rationalOffset + index * 4; tiff.writeUInt32LE(numerator, offset); tiff.writeUInt32LE(denominator, offset + 4); });
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
  const segment = Buffer.alloc(payload.length + 4); segment.writeUInt16BE(0xffe1, 0); segment.writeUInt16BE(payload.length + 2, 2); payload.copy(segment, 4);
  return segment;
}
function addExif(bytes) { return Buffer.concat([bytes.subarray(0, 2), exifFixture(), bytes.subarray(2)]); }
function addIccProfile(bytes, profile) {
  const compressed = deflateSync(profile);
  const payload = Buffer.concat([Buffer.from('Display P3\0', 'latin1'), Buffer.from([0]), compressed]);
  return Buffer.concat([bytes.subarray(0, 33), pngChunk('iCCP', payload), bytes.subarray(33)]);
}
function jpegExifInfo(bytes) {
  const result = { hasExif: false, hasGps: false, orientation: null, hasIcc: false };
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return result;
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) break;
    const payload = bytes.subarray(offset + 4, offset + 2 + length);
    if (marker === 0xe2 && ascii(payload, 0, 11) === 'ICC_PROFILE') result.hasIcc = true;
    if (marker === 0xe1 && ascii(payload, 0, 6) === 'Exif\0\0') {
      result.hasExif = true;
      const tiff = payload.subarray(6); const little = ascii(tiff, 0, 2) === 'II'; const u16 = (at) => little ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at); const u32 = (at) => little ? tiff.readUInt32LE(at) : tiff.readUInt32BE(at);
      const ifd = u32(4); const count = u16(ifd);
      for (let index = 0; index < count; index += 1) { const entry = ifd + 2 + index * 12; const tag = u16(entry); if (tag === 0x0112) result.orientation = u16(entry + 8); if (tag === 0x8825) result.hasGps = true; }
    }
    offset += length + 2;
  }
  return result;
}

let socket;
try {
  const jpegSource = await readFile(resolve(root, 'tests/fixtures/images/opaque-gradient.jpg'));
  const pngSource = await readFile(resolve(root, 'tests/fixtures/images/unoptimized-alpha.png'));
  const iccProfile = await readFile('/System/Library/ColorSync/Profiles/Display P3.icc');
  const orientedPath = join(workspace, 'oriented-gps.jpg');
  const iccPath = join(workspace, 'display-p3.png');
  await writeFile(orientedPath, addExif(jpegSource));
  await writeFile(iccPath, addIccProfile(pngSource, iccProfile));
  const inputExif = jpegExifInfo(await readFile(orientedPath));
  assert.deepEqual(inputExif, { hasExif: true, hasGps: true, orientation: 6, hasIcc: false });

  let target;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); break; }
    catch { await delay(100); }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome debugging target did not become ready');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, reject) => { socket.addEventListener('open', resolveOpen, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let commandId = 0; const pending = new Map();
  socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); if (!message.id) return; const request = pending.get(message.id); if (!request) return; pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result); });
  const send = (method, params = {}) => new Promise((resolveSend, reject) => { const id = ++commandId; pending.set(id, { resolve: resolveSend, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Browser evaluation failed'); return response.result.value; };
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  async function navigate(pathname, selector) {
    await send('Page.navigate', { url: `${origin}${pathname}` });
    for (let attempt = 0; attempt < 150; attempt += 1) { if (await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(pathname)} && Boolean(document.querySelector(${JSON.stringify(selector)})) && !document.querySelector('astro-island[ssr]')`)) return; await delay(20); }
    throw new Error(`Timed out loading ${pathname}`);
  }
  async function setFile(selector, path) {
    const document = await send('DOM.getDocument', { depth: -1, pierce: true }); const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector }); assert.ok(input.nodeId, `file input not found: ${selector}`);
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [path] }); await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change',{bubbles:true}))`);
  }
  async function waitFor(expression, label) { for (let attempt = 0; attempt < 1800; attempt += 1) { const value = await evaluate(expression); if (value) return value; await delay(20); } throw new Error(`Timed out waiting for ${label}`); }

  await navigate('/compress-image/', 'section.workspace');
  assert.equal(await evaluate(`document.querySelector('.metadata-privacy-option button[role="switch"]')?.getAttribute('aria-checked')`), 'false', 'privacy metadata cleanup should be disabled by default');
  await evaluate(`document.querySelector('.metadata-privacy-option button[role="switch"]').click()`);
  await setFile('section.workspace input[type="file"]', orientedPath);
  await waitFor(`Boolean(document.querySelector('[data-image-selected="true"]'))`, 'oriented JPEG selection');
  await evaluate(`document.querySelector('.primary-action').click()`);
  await waitFor(`Boolean(document.querySelector('.result a[download]'))`, 'oriented JPEG result');
  const orientedOutput = await evaluate(`(async()=>{const img=document.querySelector('.result img');const link=document.querySelector('.result a[download]');const response=await fetch(img.src);const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return {width:img.naturalWidth,height:img.naturalHeight,download:link.getAttribute('download'),mime:response.headers.get('content-type'),base64:btoa(binary)}})()`);
  const orientedBytes = Buffer.from(orientedOutput.base64, 'base64'); const orientedExif = jpegExifInfo(orientedBytes);
  assert.deepEqual([orientedOutput.width, orientedOutput.height], [240, 320]);
  assert.equal(orientedOutput.mime, 'image/jpeg'); assert.equal(orientedExif.hasExif, false); assert.equal(orientedExif.hasGps, false); assert.equal(orientedExif.orientation, null);
  assert.match(await evaluate(`document.querySelector('[role="status"]')?.textContent ?? ''`), /removed and checked|no supported privacy metadata was found/i);
  await evaluate(`document.querySelector('.result a[download]').click()`);
  for (let attempt = 0; attempt < 150; attempt += 1) { if ((await readdir(downloads)).some((name) => !name.endsWith('.crdownload'))) break; await delay(25); }
  const orientedDownloadedName = (await readdir(downloads)).find((name) => !name.endsWith('.crdownload')); assert.ok(orientedDownloadedName, 'oriented JPEG must save to disk');
  const orientedDownloaded = await readFile(join(downloads, orientedDownloadedName)); const orientedDownloadedExif = jpegExifInfo(orientedDownloaded); assert.equal(orientedDownloadedExif.hasExif, false); assert.equal(orientedDownloadedExif.hasGps, false); assert.equal(orientedDownloadedExif.orientation, null);

  await evaluate(`document.querySelector('.metadata-privacy-option button[role="switch"]').click()`);
  assert.equal(await evaluate(`document.querySelector('.metadata-privacy-option button[role="switch"]')?.getAttribute('aria-checked')`), 'false');
  await evaluate(`document.querySelector('.primary-action').click()`);
  await waitFor(`Boolean(document.querySelector('.result a[download]'))`, 'metadata-preserving JPEG result');
  assert.match(await evaluate(`document.querySelector('[role="status"]')?.textContent ?? ''`), /preserved and checked/i);
  const preservedOutput = await evaluate(`(async()=>{const img=document.querySelector('.result img');const link=document.querySelector('.result a[download]');const response=await fetch(img.src);const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return {width:img.naturalWidth,height:img.naturalHeight,download:link.getAttribute('download'),mime:response.headers.get('content-type'),base64:btoa(binary)}})()`);
  const preservedBytes = Buffer.from(preservedOutput.base64, 'base64'); const preservedExif = jpegExifInfo(preservedBytes);
  assert.deepEqual([preservedOutput.width, preservedOutput.height], [240, 320]);
  assert.equal(preservedExif.hasExif, true); assert.equal(preservedExif.hasGps, true); assert.equal(preservedExif.orientation, 1);
  await evaluate(`document.querySelector('.result a[download]').click()`);
  const preservedDownloadedName = preservedOutput.download;
  let preservedDownloaded;
  for (let attempt = 0; attempt < 150; attempt += 1) { try { const candidate = await readFile(join(downloads, preservedDownloadedName)); if (candidate.equals(preservedBytes)) { preservedDownloaded = candidate; break; } } catch {} await delay(25); }
  assert.ok(preservedDownloaded, 'metadata-preserving JPEG must save to disk');
  assert.deepEqual(preservedDownloaded, preservedBytes, 'metadata-preserving JPEG download must match the preview Blob');
  const preservedDownloadedExif = jpegExifInfo(preservedDownloaded);
  assert.equal(preservedDownloadedExif.hasExif, true); assert.equal(preservedDownloadedExif.hasGps, true); assert.equal(preservedDownloadedExif.orientation, 1);

  const privacyExports = [];
  for (const format of ['png', 'webp']) {
    await navigate('/crop-image/', '.crop-tool');
    await setFile('.crop-tool input[type="file"]', orientedPath);
    await waitFor(`Boolean(document.querySelector('.crop-preview img'))`, `${format} crop input`);
    if (format === 'webp') await evaluate(`(()=>{const select=document.querySelector('.crop-controls select');select.value='webp';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await evaluate(`document.querySelector('.metadata-privacy-option button[role="switch"]')?.getAttribute('aria-checked')`), 'false', `${format} privacy switch should default off`);
    await evaluate(`document.querySelector('.metadata-privacy-option button[role="switch"]').click()`);
    await evaluate(`document.querySelector('.crop-tool .primary-action').click()`);
    await waitFor(`Boolean(document.querySelector('.crop-tool .result a[download]'))`, `${format} crop result`);
    const browserOutput = await evaluate(`(async()=>{const img=document.querySelector('.crop-tool .result img');const link=document.querySelector('.crop-tool .result a[download]');const response=await fetch(img.src);const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return {width:img.naturalWidth,height:img.naturalHeight,mime:response.headers.get('content-type'),download:link.getAttribute('download'),base64:btoa(binary)}})()`);
    assert.equal(browserOutput.mime, format === 'png' ? 'image/png' : 'image/webp');
    const expectedPath = join(downloads, browserOutput.download);
    await evaluate(`document.querySelector('.crop-tool .result a[download]').click()`);
    for (let attempt = 0; attempt < 150; attempt += 1) { try { await readFile(expectedPath); break; } catch { await delay(25); } }
    const saved = await readFile(expectedPath);
    const previewBytes = Buffer.from(browserOutput.base64, 'base64');
    assert.deepEqual(saved, previewBytes, `${format} downloaded bytes must match the preview Blob`);
    const { hasPrivacyMetadata } = await import('../src/lib/image/privacy-metadata.ts');
    assert.equal(hasPrivacyMetadata(new Uint8Array(saved), browserOutput.mime), false, `${format} saved file must contain no supported privacy metadata`);
    if (format === 'png') {
      const png = inspectPng(new Uint8Array(saved));
      assert.deepEqual([png.width, png.height], [browserOutput.width, browserOutput.height]);
      assert.deepEqual(png.metadataChunks, []);
    }
    privacyExports.push({ format, bytes: saved.length, dimensions: [browserOutput.width, browserOutput.height], mime: browserOutput.mime, savedMatchesPreview: true, supportedPrivacyMetadata: false });
  }

  await navigate('/compress-png/', '[data-png-optimizer="true"]');
  await setFile('[data-png-optimizer="true"] input[type="file"]', iccPath);
  await waitFor(`document.querySelector('[data-png-status]')?.dataset.pngStatus === 'ready'`, 'ICC PNG selection');
  await evaluate(`document.querySelector('[data-png-optimizer="true"] .primary-action').click()`);
  await waitFor(`['optimized','unchanged'].includes(document.querySelector('[data-png-status]')?.dataset.pngStatus)`, 'ICC PNG result');
  const pngOutput = await evaluate(`(async()=>{const link=document.querySelector('[data-png-download="true"]');if(!link)return null;const bytes=new Uint8Array(await (await fetch(link.href)).arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)})()`);
  assert.ok(pngOutput, 'ICC PNG should produce an optimized download');
  const pngBytes = new Uint8Array(Buffer.from(pngOutput, 'base64')); const pngInspection = inspectPng(pngBytes);
  assert.equal(pngInspection.hasAlpha, true); assert.equal(pngInspection.width, 320); assert.equal(pngInspection.height, 240); assert.equal(pngInspection.chunkTypes.includes('iCCP'), false); assert.equal(pngInspection.chunkTypes.includes('sRGB'), true); assert.deepEqual(pngInspection.metadataChunks, []);
  const report = {
    browser: await evaluate('navigator.userAgent'),
    privacyExports,
    orientationCase: { input: { file: 'generated oriented-gps.jpg', bytes: (await readFile(orientedPath)).length, ...inputExif, sourceDimensions: [320, 240] }, output: { bytes: orientedBytes.length, dimensions: [orientedOutput.width, orientedOutput.height], mime: orientedOutput.mime, ...orientedExif, savedFile: orientedDownloadedName, savedFileExif: orientedDownloadedExif } },
    preservationCase: { switchDefault: 'off', input: { bytes: (await readFile(orientedPath)).length, ...inputExif }, output: { bytes: preservedBytes.length, dimensions: [preservedOutput.width, preservedOutput.height], mime: preservedOutput.mime, ...preservedExif, savedFile: preservedDownloadedName, savedMatchesPreview: true, savedFileExif: preservedDownloadedExif } },
    colorProfileCase: { input: { file: 'generated display-p3.png', bytes: (await readFile(iccPath)).length, profile: 'Display P3 ICC', chunk: 'iCCP' }, output: { bytes: pngBytes.length, dimensions: [pngInspection.width, pngInspection.height], alpha: pngInspection.hasAlpha, chunks: pngInspection.chunkTypes, metadataChunks: pngInspection.metadataChunks, sRgb: pngInspection.chunkTypes.includes('sRGB'), iccProfileRemoved: !pngInspection.chunkTypes.includes('iCCP') } }
  };
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} finally {
  socket?.close(); chromeProcess.kill('SIGTERM'); await Promise.race([new Promise((resolveExit) => chromeProcess.once('exit', resolveExit)), delay(2000)]); await rm(workspace, { recursive: true, force: true });
}
