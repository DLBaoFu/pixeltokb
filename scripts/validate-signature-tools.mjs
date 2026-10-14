// @ts-nocheck -- CDP responses and browser-side evaluation values are asserted at runtime.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = process.cwd();
const fixture = resolve(root, 'tests/fixtures/images/opaque-gradient.jpg');
const workspace = await mkdtemp(join(tmpdir(), 'pixeltokb-signature-e2e-'));
const profile = join(workspace, 'profile');
const downloads = join(workspace, 'downloads');
const port = 9342;
await mkdir(profile); await mkdir(downloads);
const chromeProcess = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

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
  let commandId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data); if (!message.id) return;
    const request = pending.get(message.id); if (!request) return;
    pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolveSend, reject) => { const id = ++commandId; pending.set(id, { resolve: resolveSend, reject }); socket.send(JSON.stringify({ id, method, params })); });
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
      if (await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(pathname)} && Boolean(document.querySelector('.signature-tool')) && !document.querySelector('astro-island[ssr]')`)) return;
      await delay(20);
    }
    throw new Error(`Timed out loading ${pathname}`);
  }
  async function chooseFile() {
    const document = await send('DOM.getDocument', { depth: -1, pierce: true });
    const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: '.signature-tool input[type="file"]' });
    assert.ok(input.nodeId, 'signature file input must exist');
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [fixture] });
    await evaluate(`document.querySelector('.signature-tool input[type="file"]').dispatchEvent(new Event('change',{bubbles:true}))`);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(`Boolean(document.querySelector('.signature-source'))`)) return;
      await delay(20);
    }
    throw new Error('Timed out selecting the signature fixture');
  }
  async function run(pathname, locale, expectTargetKB) {
    await navigate(pathname); await chooseFile();
    await evaluate(`document.querySelector('.signature-tool > button:not(.cancel-action)')?.click()`);
    for (let attempt = 0; attempt < 800; attempt += 1) {
      const state = await evaluate(`(() => { const result=document.querySelector('.signature-tool .result'); if (!result) return null; const image=result.querySelector('img'); const link=result.querySelector('a[download]'); const text=result.textContent || ''; return image?.complete && image.naturalWidth ? { width:image.naturalWidth, height:image.naturalHeight, download:link?.getAttribute('download'), text, lang:document.documentElement.lang } : null; })()`);
      if (state) {
        assert.equal(state.lang, locale);
        assert.match(state.download, /^pixeltokb-.*\.jpg$/);
        const bytes = Number(state.text.match(/([\d,]+) bytes/)?.[1].replaceAll(',', ''));
        assert.ok(bytes > 0 && bytes <= expectTargetKB * 1000, `${pathname} must meet its exact byte target`);
        assert.ok(state.width > 0 && state.height > 0);
        await evaluate(`document.querySelector('.signature-tool .result a[download]')?.click()`);
        for (let downloadAttempt = 0; downloadAttempt < 100; downloadAttempt += 1) {
          const files = await readdir(downloads);
          if (files.length) {
            const data = await readFile(join(downloads, files.at(-1)));
            assert.deepEqual([...data.subarray(0, 3)], [0xff, 0xd8, 0xff], 'saved result must be a JPEG');
            assert.equal(data.length, bytes, 'saved file size must match the verified result');
            return { pathname, locale, width: state.width, height: state.height, bytes, saved: files.at(-1) };
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
  results.push(await run('/signature-resizer/', 'en', 100));
  results.push(await run('/signature-compressor/', 'en', 50));
  results.push(await run('/zh-cn/signature-resizer/', 'zh-CN', 100));
  results.push(await run('/zh-cn/signature-compressor/', 'zh-CN', 50));
  results.push(await run('/zh-tw/signature-resizer/', 'zh-TW', 100));
  results.push(await run('/zh-tw/signature-compressor/', 'zh-TW', 50));
  console.log(JSON.stringify({ browser: await evaluate('navigator.userAgent'), fixture, results }));
} finally {
  socket?.close(); chromeProcess.kill('SIGTERM');
  await new Promise((resolveClose) => chromeProcess.once('exit', resolveClose));
  await rm(workspace, { recursive: true, force: true });
}
