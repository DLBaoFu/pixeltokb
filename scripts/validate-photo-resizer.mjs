// @ts-nocheck -- CDP and byte-level result values are asserted at runtime.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = process.cwd();
const fixtures = {
  jpeg: resolve(root, 'tests/fixtures/images/opaque-gradient.jpg'),
  png: resolve(root, 'tests/fixtures/images/alpha-shapes.png')
};
const workspace = await mkdtemp(join(tmpdir(), 'pixeltokb-photo-resizer-e2e-'));
const profile = join(workspace, 'profile');
const downloads = join(workspace, 'downloads');
const port = 9343;
await mkdir(profile); await mkdir(downloads);
const chromeProcess = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

function jpegDpi(bytes) {
  for (let offset = 2; offset + 16 <= bytes.length && bytes[offset] === 0xff;) {
    const marker = bytes[offset + 1]; const length = bytes.readUInt16BE(offset + 2);
    if (marker === 0xe0 && bytes.subarray(offset + 4, offset + 9).toString('ascii') === 'JFIF\0' && bytes[offset + 11] === 1) return Math.round((bytes.readUInt16BE(offset + 12) + bytes.readUInt16BE(offset + 14)) / 2);
    if (length < 2 || marker === 0xda || offset + length + 2 > bytes.length) break;
    offset += length + 2;
  }
  return 0;
}

function pngDpi(bytes) {
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset); const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'pHYs' && length >= 9 && bytes[offset + 16] === 1) return Math.round(((bytes.readUInt32BE(offset + 8) + bytes.readUInt32BE(offset + 12)) / 2) * .0254);
    offset += length + 12;
  }
  return 0;
}

let socket;
try {
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
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });

  async function navigate(pathname) {
    await send('Page.navigate', { url: `${origin}${pathname}` });
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(pathname)} && Boolean(document.querySelector('.physical-resizer')) && !document.querySelector('astro-island[ssr]')`)) return;
      await delay(20);
    }
    throw new Error(`Timed out loading ${pathname}`);
  }

  async function chooseFile(file) {
    const document = await send('DOM.getDocument', { depth: -1, pierce: true });
    const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: '.physical-resizer input[type="file"]' });
    assert.ok(input.nodeId, 'photo-resizer file input must exist');
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [file] });
    await evaluate(`document.querySelector('.physical-resizer input[type="file"]').dispatchEvent(new Event('change',{bubbles:true}))`);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(`!document.querySelector('.physical-resizer .status')?.textContent?.includes('Choose a photo') && !document.querySelector('.physical-resizer .status')?.textContent?.includes('请先选择照片') && !document.querySelector('.physical-resizer .status')?.textContent?.includes('請先選擇相片')`)) return;
      await delay(20);
    }
    throw new Error('Timed out selecting the photo fixture');
  }

  async function run(pathname, locale, output) {
    await navigate(pathname); await chooseFile(fixtures[output === 'jpeg' ? 'jpeg' : 'png']);
    if (output === 'png') await evaluate(`(() => { const select=document.querySelectorAll('.physical-grid select')[1]; select.value='png'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await evaluate(`document.querySelector('.physical-actions .primary-action')?.click()`);
    for (let attempt = 0; attempt < 800; attempt += 1) {
      const state = await evaluate(`(() => { const result=document.querySelector('.physical-result'); if (!result) return null; const link=result.querySelector('a[download]'); return link ? { text:result.textContent || '', download:link.getAttribute('download'), lang:document.documentElement.lang } : null; })()`);
      if (state) {
        assert.equal(state.lang, locale); assert.match(state.text, /300 DPI/); assert.match(state.download, output === 'jpeg' ? /\.jpg$/ : /\.png$/);
        const bytes = Number(state.text.match(/([\d,]+) bytes/)?.[1].replaceAll(',', ''));
        assert.ok(bytes > 0, 'reported bytes must be positive');
        await Promise.all((await readdir(downloads)).map((name) => rm(join(downloads, name), { force: true })));
        await evaluate(`document.querySelector('.physical-result a[download]')?.click()`);
        for (let downloadAttempt = 0; downloadAttempt < 150; downloadAttempt += 1) {
          const name = (await readdir(downloads)).at(-1);
          if (name) {
            const data = await readFile(join(downloads, name));
            assert.equal(data.length, bytes, 'saved byte count must equal the verified result');
            assert.equal(output === 'jpeg' ? jpegDpi(data) : pngDpi(data), 300, 'saved file must retain 300 DPI metadata');
            return { pathname, locale, output, bytes, saved: name, dpi: 300 };
          }
          await delay(20);
        }
        throw new Error(`Timed out downloading ${pathname}`);
      }
      await delay(20);
    }
    throw new Error(`Timed out preparing ${pathname}`);
  }

  const results = [];
  for (const [pathname, locale] of [['/photo-resizer/', 'en'], ['/zh-cn/photo-resizer/', 'zh-CN'], ['/zh-tw/photo-resizer/', 'zh-TW']]) {
    results.push(await run(pathname, locale, 'jpeg'));
    results.push(await run(pathname, locale, 'png'));
  }
  console.log(JSON.stringify({ browser: await evaluate('navigator.userAgent'), fixtures, results }));
} finally {
  socket?.close(); chromeProcess.kill('SIGTERM');
  await new Promise((resolveClose) => chromeProcess.once('exit', resolveClose));
  await rm(workspace, { recursive: true, force: true });
}
