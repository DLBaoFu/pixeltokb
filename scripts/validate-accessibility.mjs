import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { includedInCurrentBuild } from '../src/lib/current-routes.mjs';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = process.argv[2];
const axeSource = await readFile(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
/** @type {{sites:Array<{id:string,routes:Array<{path:string,firstRelease:string}>}>}} */
const registry = JSON.parse(await readFile(join(process.cwd(), 'kbresize-dev-package/routes.json'), 'utf8'));
const site = registry.sites.find((candidate) => candidate.id === 'kb');
if (!site) throw new Error('KB route registry is missing');
const paths = site.routes.filter(includedInCurrentBuild).flatMap((route) => {
  const path = route.path === '/' ? '/' : `${route.path}/`;
  return ['', '/zh-cn', '/zh-tw'].map((prefix) => `${prefix}${path}`);
});
const profile = await mkdtemp(join(tmpdir(), 'pixeltokb-a11y-'));
const port = 9340;
const chromeProcess = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
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
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome accessibility target did not become ready');
  const activeSocket = new WebSocket(target.webSocketDebuggerUrl);
  socket = activeSocket;
  await new Promise((resolve, reject) => { activeSocket.addEventListener('open', resolve, { once: true }); activeSocket.addEventListener('error', reject, { once: true }); });
  let commandId = 0;
  /** @type {Map<number,{resolve:(value:any)=>void,reject:(reason?:any)=>void}>} */
  const pending = new Map();
  activeSocket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  /** @param {string} method @param {Record<string,unknown>} [params] @returns {Promise<any>} */
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    activeSocket.send(JSON.stringify({ id, method, params }));
  });
  /** @param {string} expression */
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Accessibility.enable');

  const failures = [];
  let audits = 0;
  let keyboardChecks = 0;
  let accessibilityTrees = 0;
  for (const pathname of paths) {
    await send('Page.navigate', { url: `${origin}${pathname}` });
    for (let attempt = 0; attempt < 100; attempt++) {
      const expectedPath = JSON.stringify(pathname);
      if (await evaluate(`location.pathname === ${expectedPath} && document.readyState === "complete" && Boolean(document.querySelector('main')) && !document.querySelector('astro-island[ssr]')`)) break;
      await delay(20);
    }
    const tree = await send('Accessibility.getFullAXTree');
    accessibilityTrees++;
    if (!tree.nodes?.some((/** @type {any} */ node) => node.role?.value === 'main')) failures.push({ pathname, issue: 'accessibility tree has no main landmark' });
    if (!tree.nodes?.some((/** @type {any} */ node) => node.role?.value === 'heading' && node.name?.value)) failures.push({ pathname, issue: 'accessibility tree has no named heading' });

    await evaluate('document.activeElement?.blur()');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
    const firstFocus = await evaluate('document.activeElement?.classList.contains("skip-link")');
    keyboardChecks++;
    if (!firstFocus) failures.push({ pathname, issue: 'first keyboard focus is not the skip link' });
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
    const mainFocused = await evaluate('document.activeElement?.id === "main-content" || location.hash === "#main-content"');
    keyboardChecks++;
    if (!mainFocused) failures.push({ pathname, issue: 'skip link does not move to main content' });

    for (const theme of ['light', 'dark']) {
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      await evaluate(axeSource);
      const results = await evaluate(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } }).then((result) => ({ violations: result.violations.map((item) => ({ id:item.id, impact:item.impact, nodes:item.nodes.map((node) => ({ target:node.target, html:node.html, summary:node.failureSummary })) })) }))`);
      audits++;
      if (results.violations.length) failures.push({ pathname, theme, violations: results.violations });
    }
  }
  const report = { engine: 'axe-core 4.10.3 with Chrome accessibility tree', routes: paths.length, audits, keyboardChecks, accessibilityTrees, failures };
  if (output) await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ routes: paths.length, audits, keyboardChecks, accessibilityTrees, failures: failures.length }));
  if (failures.length) process.exitCode = 1;
} finally {
  socket?.close();
  chromeProcess.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => chromeProcess.once('exit', resolve)), delay(2000)]);
  await rm(profile, { recursive: true, force: true });
}
