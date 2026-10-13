import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const evidencePath = resolve(process.env.BLOG_CASE_EVIDENCE_PATH || 'artifacts/blog-case-evidence.json');
const downloadDirectory = await mkdtemp(join(tmpdir(), 'pixeltokb-blog-downloads-'));
const profile = await mkdtemp(join(tmpdir(), 'pixeltokb-blog-audit-'));
const port = 9342;
const browser = spawn(chrome, ['--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
/** @param {number} ms */
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
/** @type {WebSocket | undefined} */
let socket;

const fixtures = {
  jpeg: { path: resolve('tests/fixtures/images/opaque-gradient.jpg'), bytes: 2930, width: 320, height: 240, mime: 'image/jpeg', alpha: false },
  texturedWebp: { path: resolve('tests/fixtures/images/textured.webp'), bytes: 15968, width: 320, height: 240, mime: 'image/webp', alpha: false },
  transparentPng: { path: resolve('tests/fixtures/images/alpha-shapes.png'), bytes: 7287, width: 320, height: 240, mime: 'image/png', alpha: true },
  rgbaPng: { path: resolve('tests/fixtures/images/unoptimized-alpha.png'), bytes: 307892, width: 320, height: 240, mime: 'image/png', alpha: true }
};
const workflows = [
  { caseId: 'compress-20kb-jpeg', path: '/compress-image/?target=20&unit=KB', fixture: fixtures.jpeg, targetBytes: 20_000 },
  { caseId: 'compress-50kb-textured-webp', path: '/compress-image/?target=50&unit=KB', fixture: fixtures.texturedWebp, targetBytes: 50_000 },
  { caseId: 'compress-75kb-transparent-png', path: '/compress-image/?target=75&unit=KB', fixture: fixtures.transparentPng, targetBytes: 75_000 },
  { caseId: 'compress-100kb-rgba-png', path: '/compress-image/?target=100&unit=KB', fixture: fixtures.rgbaPng, targetBytes: 100_000 }
];

try {
  let target;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); break; }
    catch { await delay(100); }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome debugging target did not become ready');
  const connection = new WebSocket(target.webSocketDebuggerUrl);
  socket = connection;
  await new Promise((resolveOpen, rejectOpen) => { connection.addEventListener('open', resolveOpen, { once: true }); connection.addEventListener('error', rejectOpen, { once: true }); });
  let commandId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  /** @param {string} method @param {Record<string, unknown>} [params] */
  const send = (method, params = {}) => new Promise((resolveSend, rejectSend) => {
    const id = ++commandId;
    pending.set(id, { resolve: resolveSend, reject: rejectSend });
    connection.send(JSON.stringify({ id, method, params }));
  });
  /** @param {string} expression */
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  /** @param {string} expression */
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 240; attempt++) {
      if (await evaluate(expression)) return;
      await delay(50);
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  /** @param {string} path */
  const upload = async (path) => {
    const { root } = await send('DOM.getDocument', { depth: 2 });
    const nodeId = (await send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' })).nodeId;
    if (!nodeId) throw new Error('Missing image file input');
    await send('DOM.setFileInputFiles', { files: [path], nodeId });
    await evaluate("document.querySelector('input[type=file]')?.dispatchEvent(new Event('change', { bubbles: true }))");
  };
  /** @param {string} path */
  const navigate = async (path) => {
    await send('Page.navigate', { url: `${origin}${path}` });
    await waitFor('document.readyState === "complete" && Boolean(document.querySelector("main")) && Boolean(document.querySelector("input[type=file]"))');
  };
  /** @param {Uint8Array} bytes */
  const signature = (bytes) => {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
    return 'unknown';
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDirectory });

  const evidence = [];
  for (const workflow of workflows) {
    await navigate(workflow.path);
    await upload(workflow.fixture.path);
    await waitFor('Boolean(document.querySelector("[data-image-selected=\\"true\\"]"))');
    await evaluate('document.querySelector(".primary-action")?.click()');
    await waitFor('Boolean(document.querySelector(".result"))');
    const result = await evaluate(`(() => { const result = document.querySelector('.result'); const image = result?.querySelector('img'); return { text: result?.textContent?.trim() || '', preview: image?.getAttribute('src') || '' }; })()`);
    const before = new Set(await readdir(downloadDirectory));
    await evaluate('document.querySelector(".result a[download]")?.click()');
    let downloaded;
    for (let attempt = 0; attempt < 120; attempt++) {
      const names = (await readdir(downloadDirectory)).filter((name) => !name.endsWith('.crdownload') && !before.has(name));
      if (names.length) { downloaded = names[0]; break; }
      await delay(50);
    }
    if (!downloaded) throw new Error(`${workflow.caseId}: browser download did not finish`);
    const downloadedPath = join(downloadDirectory, downloaded);
    const downloadedStat = await stat(downloadedPath);
    const downloadedBytes = new Uint8Array(await readFile(downloadedPath));
    const mime = signature(downloadedBytes);
    evidence.push({
      caseId: workflow.caseId,
      source: { file: workflow.fixture.path.replace(`${process.cwd()}/`, ''), bytes: workflow.fixture.bytes, mime: workflow.fixture.mime, width: workflow.fixture.width, height: workflow.fixture.height, alpha: workflow.fixture.alpha },
      targetBytes: workflow.targetBytes,
      browserResultText: result.text,
      downloadedFile: downloaded,
      output: { bytes: downloadedStat.size, mime, width: workflow.fixture.width, height: workflow.fixture.height, withinTarget: downloadedStat.size <= workflow.targetBytes }
    });
  }

  await navigate('/image-size-checker/');
  await upload(fixtures.jpeg.path);
  await waitFor('Boolean(document.querySelector(".info-grid"))');
  evidence.push({
    caseId: 'inspect-opaque-gradient-jpeg',
    source: { file: fixtures.jpeg.path.replace(`${process.cwd()}/`, ''), bytes: fixtures.jpeg.bytes, mime: fixtures.jpeg.mime, width: fixtures.jpeg.width, height: fixtures.jpeg.height, alpha: fixtures.jpeg.alpha },
    checkerText: await evaluate('document.querySelector(".info-grid")?.textContent?.trim() || ""')
  });
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify({ generatedAt: new Date().toISOString(), origin, command: 'pnpm audit:blog-cases', cases: evidence }, null, 2)}\n`);
  console.log(JSON.stringify({ evidencePath, cases: evidence.length, downloaded: evidence.filter((item) => item.output).length, allWithinTarget: evidence.filter((item) => item.output).every((item) => item.output?.withinTarget === true) }));
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await Promise.race([new Promise((resolveExit) => browser.once('exit', resolveExit)), delay(2000)]);
  await rm(profile, { recursive: true, force: true });
  await rm(downloadDirectory, { recursive: true, force: true });
}
