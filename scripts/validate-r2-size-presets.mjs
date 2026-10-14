// @ts-nocheck -- browser protocol values are checked at runtime.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { physicalResizePresets, pixelResizePresets } from '../src/lib/resize-presets.ts';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fixture = resolve(process.cwd(), 'tests/fixtures/images/opaque-gradient.jpg');
const profile = await mkdtemp(join(tmpdir(), 'pixeltokb-r2-presets-'));
const port = 9344;
const chromeProcess = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const locales = [['', 'en'], ['/zh-cn', 'zh-CN'], ['/zh-tw', 'zh-TW']];
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

  async function navigate(pathname, selector) {
    await send('Page.navigate', { url: `${origin}${pathname}` });
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (await evaluate(`location.pathname === ${JSON.stringify(pathname.split('?')[0])} && document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(selector)})) && !document.querySelector('astro-island[ssr]')`)) return;
      await delay(20);
    }
    throw new Error(`Timed out loading ${pathname}`);
  }

  async function upload(selector) {
    const document = await send('DOM.getDocument', { depth: -1, pierce: true });
    const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector });
    assert.ok(input.nodeId, `file input must exist: ${selector}`);
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [fixture] });
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change',{bubbles:true}))`);
  }

  async function waitFor(expression, message, attempts = 150) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (await evaluate(expression)) return;
      await delay(20);
    }
    throw new Error(message);
  }

  const result = { browser: '', pixelInitializations: [], physicalInitializations: [], pixelOutputs: [], physicalOutputs: [] };
  for (const [prefix, language] of locales) for (const preset of pixelResizePresets) {
    const query = `?width=${preset.width}&height=${preset.height}&mode=${preset.mode}`;
    await navigate(`${prefix}/resize-image/${query}`, '.tool-shell');
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const state = await evaluate(`(() => { const inputs=document.querySelectorAll('.controls input[type=number]'); const mode=document.querySelector('.controls select'); const links=[...document.querySelectorAll('.language-menu a')].map((link)=>new URL(link.href,location.href).search); return {width:inputs[0]?.value,height:inputs[1]?.value,mode:mode?.value,links,lang:document.documentElement.lang}; })()`);
      if (state.width === String(preset.width) && state.height === String(preset.height) && state.mode === preset.mode) {
        assert.equal(state.lang, language); assert.ok(state.links.every((search) => search === query), 'language links must preserve the size query'); result.pixelInitializations.push({ locale: language, slug: preset.slug, width: preset.width, height: preset.height }); break;
      }
      if (attempt === 99) throw new Error(`Preset did not hydrate: ${preset.slug} ${language}`);
      await delay(20);
    }
  }
  for (const [prefix, language] of locales) for (const preset of physicalResizePresets) {
    const query = `?width=${preset.width}&height=${preset.height}&unit=${preset.unit}&dpi=${preset.dpi}`;
    await navigate(`${prefix}/photo-resizer/${query}`, '.physical-resizer');
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const state = await evaluate(`(() => { const inputs=document.querySelectorAll('.physical-grid input'); const selects=document.querySelectorAll('.physical-grid select'); const links=[...document.querySelectorAll('.language-menu a')].map((link)=>new URL(link.href,location.href).search); return {width:inputs[0]?.value,height:inputs[1]?.value,unit:selects[0]?.value,dpi:inputs[2]?.value,links,lang:document.documentElement.lang}; })()`);
      if (state.width === String(preset.width) && state.height === String(preset.height) && state.unit === preset.unit && state.dpi === String(preset.dpi)) {
        assert.equal(state.lang, language); assert.ok(state.links.every((search) => search === query), 'language links must preserve the photo query'); result.physicalInitializations.push({ locale: language, slug: preset.slug, width: preset.width, height: preset.height }); break;
      }
      if (attempt === 99) throw new Error(`Photo preset did not hydrate: ${preset.slug} ${language}`);
      await delay(20);
    }
  }

  for (const preset of pixelResizePresets) {
    const query = `?width=${preset.width}&height=${preset.height}&mode=${preset.mode}`;
    await navigate(`/resize-image/${query}`, '.tool-shell'); await upload('.tool-shell input[type="file"]');
    await waitFor(`document.querySelector('.tool-shell')?.dataset.imageSelected === 'true'`, `Pixel fixture was not accepted: ${preset.slug}`);
    await evaluate(`document.querySelector('.tool-shell > button:not(.cancel-action)')?.click()`);
    for (let attempt = 0; attempt < 800; attempt += 1) {
      const state = await evaluate(`(() => { const image=document.querySelector('.tool-shell .result img'); return image?.complete && image.naturalWidth ? {width:image.naturalWidth,height:image.naturalHeight} : null; })()`);
      if (state) { assert.deepEqual(state, { width: preset.width, height: preset.height }); result.pixelOutputs.push({ slug: preset.slug, ...state }); break; }
      if (attempt === 799) throw new Error(`Pixel output did not finish: ${preset.slug}`);
      await delay(20);
    }
  }
  for (const preset of physicalResizePresets) {
    const query = `?width=${preset.width}&height=${preset.height}&unit=${preset.unit}&dpi=${preset.dpi}`;
    await navigate(`/photo-resizer/${query}`, '.physical-resizer'); await upload('.physical-resizer input[type="file"]');
    await waitFor(`document.querySelector('.physical-resizer input[type="file"]')?.files?.length === 1 && !document.querySelector('.physical-resizer .status')?.textContent?.includes('Choose a photo first.')`, `Photo fixture was not accepted: ${preset.slug}`);
    await evaluate(`document.querySelector('.physical-actions .primary-action')?.click()`);
    for (let attempt = 0; attempt < 800; attempt += 1) {
      const state = await evaluate(`(() => { const result=document.querySelector('.physical-result'); if (!result) return null; const text=result.textContent || ''; const match=text.match(/(\\d+) × (\\d+) px/); return match ? {width:Number(match[1]),height:Number(match[2]),dpi:text.includes('300 DPI') ? 300 : 0} : null; })()`);
      const width = Math.round((preset.unit === 'mm' ? preset.width / 25.4 : preset.width) * preset.dpi); const height = Math.round((preset.unit === 'mm' ? preset.height / 25.4 : preset.height) * preset.dpi);
      if (state) { assert.deepEqual(state, { width, height, dpi: 300 }); result.physicalOutputs.push({ slug: preset.slug, ...state }); break; }
      if (attempt === 799) throw new Error(`Photo output did not finish: ${preset.slug}`);
      await delay(20);
    }
  }
  result.browser = await evaluate('navigator.userAgent');
  console.log(JSON.stringify(result));
} finally {
  socket?.close(); chromeProcess.kill('SIGTERM');
  await new Promise((resolveClose) => chromeProcess.once('exit', resolveClose));
  await rm(profile, { recursive: true, force: true });
}
