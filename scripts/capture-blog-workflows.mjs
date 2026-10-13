import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fixture = resolve('tests/fixtures/images/opaque-gradient.jpg');
const assetRoot = resolve('public/blog-workflows');
const profile = await mkdtemp(join(tmpdir(), 'pixeltokb-blog-workflows-'));
const port = 9341;
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
  /** @param {string} expression */
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (await evaluate(expression)) return;
      await delay(50);
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  /** @param {string} selector */
  const upload = async (selector, selectedFixture = fixture) => {
    const { root } = await send('DOM.getDocument', { depth: 2 });
    const nodeId = (await send('DOM.querySelector', { nodeId: root.nodeId, selector })).nodeId;
    if (!nodeId) throw new Error(`Missing ${selector}`);
    await send('DOM.setFileInputFiles', { files: [selectedFixture], nodeId });
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.dispatchEvent(new Event('change', { bubbles: true }))`);
    await delay(250);
  };
  /** @param {string} theme */
  const applyTheme = async (theme) => evaluate(`(() => {
    localStorage.setItem('pixeltokb-theme', ${JSON.stringify(theme)});
    document.documentElement.dataset.theme = ${JSON.stringify(theme)};
    document.documentElement.dataset.themePreference = ${JSON.stringify(theme)};
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const active = button.getAttribute('data-theme-choice') === ${JSON.stringify(theme)};
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  })()`);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

  const locales = ['', '/zh-cn', '/zh-tw'];
  const workflows = [
    { name: 'compress-20kb', path: '/compress-image/?target=20&unit=KB', fixture: resolve('tests/fixtures/images/opaque-gradient.jpg'), ready: 'Boolean(document.querySelector(".result"))', action: 'document.querySelector(".primary-action")?.click()' },
    { name: 'compress-50kb', path: '/compress-image/?target=50&unit=KB', fixture: resolve('tests/fixtures/images/textured.webp'), ready: 'Boolean(document.querySelector(".result"))', action: 'document.querySelector(".primary-action")?.click()' },
    { name: 'compress-75kb', path: '/compress-image/?target=75&unit=KB', fixture: resolve('tests/fixtures/images/alpha-shapes.png'), ready: 'Boolean(document.querySelector(".result"))', action: 'document.querySelector(".primary-action")?.click()' },
    { name: 'compress-100kb', path: '/compress-image/?target=100&unit=KB', fixture: resolve('tests/fixtures/images/unoptimized-alpha.png'), ready: 'Boolean(document.querySelector(".result"))', action: 'document.querySelector(".primary-action")?.click()' },
    { name: 'resize', path: '/resize-image/', ready: 'Boolean(document.querySelector(".result"))', action: 'document.querySelector(".tool-shell > button:not(.cancel-action)")?.click()' },
    { name: 'crop', path: '/crop-image/', ready: 'Boolean(document.querySelector(".result"))', action: 'document.querySelector(".primary-action")?.click()' },
    { name: 'inspect', path: '/image-size-checker/', ready: 'Boolean(document.querySelector(".info-grid"))', action: '' }
  ];

  for (const prefix of locales) for (const workflow of workflows) {
    await send('Page.navigate', { url: `${origin}${prefix}${workflow.path}` });
    await waitFor('document.readyState === "complete" && Boolean(document.querySelector("main")) && Boolean(document.querySelector("input[type=file]"))');
    await applyTheme('light');
    await upload('input[type=file]', workflow.fixture);
    await waitFor('Boolean(document.querySelector("[data-image-selected=\\"true\\"]")) || Boolean(document.querySelector(".info-grid")) || Boolean(document.querySelector("input[type=file]")?.files?.length)');
    if (workflow.action) await evaluate(workflow.action);
    await waitFor(workflow.ready);
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
    const locale = prefix ? prefix.slice(1) : 'en';
    const output = join(assetRoot, locale, `${workflow.name}.png`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, Buffer.from(data, 'base64'));
    console.log(JSON.stringify({ locale, workflow: workflow.name, output }));
  }
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), delay(2000)]);
  await rm(profile, { recursive: true, force: true });
}
