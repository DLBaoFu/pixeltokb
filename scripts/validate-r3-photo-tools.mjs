// @ts-nocheck -- Chrome DevTools Protocol values are asserted at runtime.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = process.cwd();
const photo = resolve(root, 'tests/fixtures/images/opaque-gradient.jpg');
const signature = resolve(root, 'tests/fixtures/images/alpha-shapes.png');
const workspace = await mkdtemp(join(tmpdir(), 'pixeltokb-r3-photo-tools-'));
const profile = join(workspace, 'profile'); const downloads = join(workspace, 'downloads');
await mkdir(profile); await mkdir(downloads);
const port = 9344;
const chromeProcess = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 60; attempt += 1) { try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); break; } catch { await delay(100); } }
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
    for (let attempt = 0; attempt < 200; attempt += 1) { if (await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(pathname)} && Boolean(document.querySelector(${JSON.stringify(selector)})) && !document.querySelector('astro-island[ssr]')`)) return; await delay(20); }
    throw new Error(`Timed out loading ${pathname}`);
  }
  async function setFiles(selector, files) {
    const document = await send('DOM.getDocument', { depth: -1, pierce: true }); const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector }); assert.ok(input.nodeId, `file input missing: ${selector}`);
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files }); await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change',{bubbles:true}))`);
  }
  async function setNumber(selector, value) { await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(el,${Number(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`); }
  async function clearDownloads() { for (const name of await readdir(downloads)) await rm(join(downloads, name), { force: true }); }
  async function clickAndDownload(selector, parse) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
    for (let attempt = 0; attempt < 800; attempt += 1) { const state = await evaluate(`(() => { const result=document.querySelector('.result'); return result?.querySelector('a[download]') ? { text:result.textContent || '', download:result.querySelector('a[download]').getAttribute('download') } : null; })()`); if (state) { const bytes = Number(state.text.match(/([\d,]+) bytes/)?.[1].replaceAll(',', '')); assert.ok(bytes > 0, 'reported bytes must be positive'); await clearDownloads(); await evaluate(`document.querySelector('.result a[download]')?.click()`); for (let downloadAttempt = 0; downloadAttempt < 150; downloadAttempt += 1) { const name = (await readdir(downloads)).at(-1); if (name) { const data = await readFile(join(downloads, name)); assert.equal(data.length, bytes, 'saved bytes must equal the displayed bytes'); parse(data, state); return { bytes, saved: name, text: state.text }; } await delay(20); } throw new Error('download timed out'); } await delay(20); }
    throw new Error('tool result timed out');
  }
  async function runLocale(prefix, lang) {
    const mergePath = `${prefix}/photo-signature-merger/`; await navigate(mergePath, '.merger-tool'); await setFiles('.merger-tool .merge-inputs label:nth-child(1) input[type="file"]', [photo]); await setFiles('.merger-tool .merge-inputs label:nth-child(2) input[type="file"]', [signature]);
    const merge = await clickAndDownload('.merger-tool .primary-action', (data) => { assert.deepEqual([...data.subarray(0, 8)], [137,80,78,71,13,10,26,10]); });
    const printPath = `${prefix}/print-photo-sheet/`; await navigate(printPath, '.print-sheet-tool'); await setFiles('.print-sheet-tool input[type="file"]', [photo]); const print = await clickAndDownload('.print-sheet-tool .primary-action', (data) => { assert.ok(data.subarray(0, 8).toString('ascii').startsWith('%PDF-1.'), 'download must be a PDF'); assert.match(data.toString('latin1'), /20 mm calibration line/); });
    const increasePath = `${prefix}/increase-image-size/`; await navigate(increasePath, '.increase-size-tool'); await setFiles('.increase-size-tool input[type="file"]', [photo]); await setNumber('.increase-size-tool input[type="number"]', 10); const increase = await clickAndDownload('.increase-size-tool .primary-action', (data) => { assert.deepEqual([...data.subarray(0, 2)], [0xff, 0xd8]); assert.equal(data.length, 10_000); });
    const actualLang = await evaluate('document.documentElement.lang'); assert.equal(actualLang, lang); return { prefix: prefix || '/', lang, merge, print, increase };
  }
  const results = [await runLocale('', 'en'), await runLocale('/zh-cn', 'zh-CN'), await runLocale('/zh-tw', 'zh-TW')];
  console.log(JSON.stringify({ origin, results }));
} finally { socket?.close(); chromeProcess.kill('SIGTERM'); await new Promise((resolveClose) => chromeProcess.once('exit', resolveClose)); await rm(workspace, { recursive: true, force: true }); }
