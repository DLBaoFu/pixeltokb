import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = resolve(process.argv[2] || 'public/readme/crop-image-light.png');
const theme = process.argv[3] || 'light';
const pathname = process.argv[4] || '/crop-image/';
const expectedTitle = process.argv[5] || 'Crop image online';

if (!['light', 'dark'].includes(theme)) throw new Error('Theme must be light or dark.');
if (!pathname.startsWith('/') || !pathname.endsWith('/')) throw new Error('Pathname must be an absolute directory-style route.');

const profile = await (async () => {
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  return mkdtemp(join(tmpdir(), 'pixeltokb-product-preview-'));
})();
const port = 9340;
const browser = spawn(chrome, ['--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
/** @param {number} ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** @type {WebSocket | undefined} */
let socket;

try {
  let target;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); break; }
    catch { await delay(100); }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome debugging target did not become ready');

  const pageSocket = new WebSocket(target.webSocketDebuggerUrl);
  socket = pageSocket;
  await new Promise((resolve, reject) => { pageSocket.addEventListener('open', resolve, { once: true }); pageSocket.addEventListener('error', reject, { once: true }); });
  let commandId = 0;
  /** @type {Map<number, {resolve: (value: any) => void, reject: (reason?: any) => void}>} */
  const pending = new Map();
  pageSocket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  /** @param {string} method @param {Record<string, unknown>} [params] */
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    pageSocket.send(JSON.stringify({ id, method, params }));
  });
  /** @param {string} expression */
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}${pathname}` });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate('document.readyState === "complete" && Boolean(document.querySelector("main"))')) break;
    await delay(30);
    if (attempt === 99) throw new Error(`Timed out loading ${pathname}`);
  }

  const state = await evaluate(`(() => {
    const root = document.documentElement;
    const theme = ${JSON.stringify(theme)};
    localStorage.setItem('pixeltokb-theme', theme);
    root.dataset.theme = theme;
    root.dataset.themePreference = theme;
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const active = button.getAttribute('data-theme-choice') === theme;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    return {
      theme: root.dataset.theme,
      preference: root.dataset.themePreference,
      active: document.querySelector('[data-theme-choice][aria-pressed="true"]')?.getAttribute('data-theme-choice'),
      title: document.querySelector('h1')?.textContent?.trim()
    };
  })()`);
  if (state.theme !== theme || state.preference !== theme || state.active !== theme || state.title !== expectedTitle) throw new Error(`Preview state did not settle: ${JSON.stringify(state)}`);
  await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, Buffer.from(data, 'base64'));
  console.log(JSON.stringify({ output, pathname, ...state }));
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), delay(2000)]);
  const { rm } = await import('node:fs/promises');
  await rm(profile, { recursive: true, force: true });
}
