// @ts-nocheck -- Chrome DevTools Protocol values are asserted at runtime.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fixture = resolve(process.cwd(), 'tests/fixtures/images/opaque-gradient.jpg');
const workspace = await mkdtemp(join(tmpdir(), 'pixeltokb-background-e2e-'));
const profile = join(workspace, 'profile'); const downloads = join(workspace, 'downloads');
await mkdir(profile); await mkdir(downloads);
const port = 9343;
const chromeProcess = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 60; attempt += 1) { try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); break; } catch { await delay(100); } }
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome debugging target did not become ready');
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolveOpen, reject) => { socket.addEventListener('open', resolveOpen, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let commandId = 0; const pending = new Map(); socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); if (!message.id) return; const request = pending.get(message.id); if (!request) return; pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result); });
  const send = (method, params = {}) => new Promise((resolveSend, reject) => { const id = ++commandId; pending.set(id, { resolve: resolveSend, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Browser evaluation failed'); return response.result.value; };
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  async function run(pathname, locale) {
    await send('Page.navigate', { url: `${origin}${pathname}` });
    for (let attempt = 0; attempt < 150; attempt += 1) { if (await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(pathname)} && Boolean(document.querySelector('.background-remover')) && !document.querySelector('astro-island[ssr]')`)) break; await delay(20); }
    const document = await send('DOM.getDocument', { depth: -1, pierce: true }); const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: '.background-remover input[type="file"]' }); assert.ok(input.nodeId);
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [fixture] }); await evaluate(`document.querySelector('.background-remover input[type="file"]').dispatchEvent(new Event('change',{bubbles:true}))`);
    for (let attempt = 0; attempt < 100; attempt += 1) { if (await evaluate('Boolean(document.querySelector(".signature-source"))')) break; await delay(20); }
    await evaluate('document.querySelector(".background-remover .signature-submit")?.click()');
    let state;
    for (let attempt = 0; attempt < 800; attempt += 1) {
      state = await evaluate(`(() => { const result=document.querySelector('.background-remover .result'); if (!result) return null; const image=result.querySelector('img'); const link=result.querySelector('a[download]'); if (!image?.complete || !image.naturalWidth) return null; const canvas=document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight; const ctx=canvas.getContext('2d'); ctx.drawImage(image,0,0); const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data; let transparent=0; for(let i=3;i<pixels.length;i+=4) if(pixels[i]===0) transparent++; return {width:image.naturalWidth,height:image.naturalHeight,download:link?.getAttribute('download'),text:result.textContent||'',transparent,lang:document.documentElement.lang}; })()`);
      if (state) break; await delay(20);
    }
    assert.ok(state, `no background removal result for ${pathname}`); assert.equal(state.lang, locale); assert.match(state.download, /^pixeltokb-.*\.png$/); assert.ok(state.transparent > 0, 'result must contain transparent pixels');
    const bytes = Number(state.text.match(/([\d,]+) bytes/)?.[1].replaceAll(',', '')); assert.ok(bytes > 0); await evaluate('document.querySelector(".background-remover .result a[download]")?.click()');
    for (let attempt = 0; attempt < 100; attempt += 1) { const files = await readdir(downloads); if (files.length) { const data = await readFile(join(downloads, files.at(-1))); assert.deepEqual([...data.subarray(0, 8)], [137,80,78,71,13,10,26,10]); assert.equal(data.length, bytes); return { pathname, locale, width: state.width, height: state.height, bytes, transparent: state.transparent }; } await delay(20); }
    throw new Error(`download timed out for ${pathname}`);
  }
  const results = [await run('/signature-background-remover/', 'en'), await run('/zh-cn/signature-background-remover/', 'zh-CN'), await run('/zh-tw/signature-background-remover/', 'zh-TW')];
  console.log(JSON.stringify({ fixture, results }));
} finally { socket?.close(); chromeProcess.kill('SIGTERM'); await new Promise((resolveClose) => chromeProcess.once('exit', resolveClose)); await rm(workspace, { recursive: true, force: true }); }
