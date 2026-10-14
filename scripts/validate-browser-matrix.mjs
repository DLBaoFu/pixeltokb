import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const screenshotDirectory = process.argv[2];
let screenshotCount = 0;
const profile = await mkdtemp(join(tmpdir(), 'pixeltokb-browser-matrix-'));
const port = 9339;
const processHandle = spawn(chrome, ['--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

/** @param {number} ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** @type {WebSocket | undefined} */
let pageSocket;
try {
  let target;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); break; }
    catch { await delay(100); }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome debugging target did not become ready');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  pageSocket = socket;
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let commandId = 0;
  /** @type {Map<number, {resolve: (value: any) => void, reject: (reason?: any) => void}>} */
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  /** @param {string} method @param {Record<string, unknown>} [params] */
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  /** @param {string} expression */
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  /** @param {string} theme */
  const applyTheme = async (theme) => evaluate(`(() => {
    const root = document.documentElement;
    localStorage.setItem('pixeltokb-theme', ${JSON.stringify(theme)});
    root.dataset.theme = ${JSON.stringify(theme)};
    root.dataset.themePreference = ${JSON.stringify(theme)};
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const active = button.getAttribute('data-theme-choice') === ${JSON.stringify(theme)};
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  })()`);
  await send('Page.enable');
  await send('Runtime.enable');

  const paths = ['/', '/tools/', '/tools/compress/', '/tools/resize/', '/tools/forms/', '/tools/inspect/', '/blog/', '/blog/category/tutorials/', '/blog/category/troubleshooting/', '/blog/compress-without-changing-dimensions/', '/blog/why-image-wont-fit-50kb/', '/blog/kb-vs-kib/', '/blog/check-image-size-and-dpi/', '/blog/compress-image-to-100kb/', '/about/', '/contact/', '/privacy/', '/terms/', '/cookies/', '/editorial-policy/', '/how-it-works/', '/faq/', '/changelog/', '/authors/editor/', '/compress-image/', '/compress-png/', '/signature-resizer/', '/signature-compressor/', '/aspect-ratio-calculator/', '/ppi-calculator/', '/photo-resizer/', '/compress-image/?preset=200-500kb', '/compress-image/?preset=500kb-1mb', '/compress-image/?preset=2mb-5mb', '/resize-image/', '/resize-image/?width=1200&height=630&mode=fit', '/photo-resizer/?width=2&height=2&unit=in&dpi=300', '/crop-image/', '/image-size-checker/', '/image-dpi-checker/'];
  const localePrefixes = ['', '/zh-cn', '/zh-tw'];
  const widths = [360, 390, 768, 1366];
  const failures = [];
  let checks = 0;

  /** @param {string} url @param {number} width */
  async function navigate(url, width) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 620 });
    await send('Page.navigate', { url });
    const expectedPath = JSON.stringify(new URL(url).pathname);
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(`location.pathname === ${expectedPath} && document.readyState === "complete" && Boolean(document.querySelector('main')) && !document.querySelector('astro-island[ssr]')`)) return;
      await delay(20);
    }
    throw new Error(`Timed out loading ${url}`);
  }

  for (const prefix of localePrefixes) for (const path of paths) for (const width of widths) {
    const pathname = `${prefix}${path}`;
    await navigate(`${origin}${pathname}`, width);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      const result = await evaluate(`(() => {
        const root=document.documentElement, body=document.body;
        const bad=[];
        if(!document.querySelector('header.site-header')) bad.push('header');
        if(!document.querySelector('main')) bad.push('main');
        if(!document.querySelector('footer.site-footer')) bad.push('footer');
        if(document.querySelectorAll('h1').length!==1) bad.push('h1');
        if(document.querySelectorAll('.language-menu a[aria-current="page"]').length!==1) bad.push('language-current');
        if(Math.max(root.scrollWidth,body.scrollWidth)>innerWidth+1) bad.push('overflow:'+Math.max(root.scrollWidth,body.scrollWidth));
        if(!document.querySelector('main')?.textContent?.trim()) bad.push('empty-main');
        if(location.search && [...document.querySelectorAll('.language-menu a')].some((link) => new URL(link.href, location.href).search !== location.search)) bad.push('language-query');
        const isGuide=location.pathname.includes('/blog/')&&!location.pathname.includes('/category/')&&!location.pathname.endsWith('/blog/');
        // Every article must expose the verified measurements that exist for its fixture;
        // two rows is sufficient when an experiment has fewer reproducible dimensions.
        if(isGuide&&document.querySelectorAll('.example-panel dl div').length<2) bad.push('guide-example');
        if (isGuide && (
          document.querySelectorAll('.guide-situation').length !== 1 ||
          document.querySelectorAll('.guide-steps li').length < 3 ||
          document.querySelectorAll('.guide-screenshot img').length !== 1 ||
          document.querySelectorAll('.review-status').length !== 0
        )) bad.push('guide-workflow');
        return {bad,lang:root.lang,theme:root.dataset.theme};
      })()`);
      const expectedLang = prefix === '' ? 'en' : prefix === '/zh-cn' ? 'zh-CN' : 'zh-TW';
      if (result.lang !== expectedLang) result.bad.push(`lang:${result.lang}`);
      if (result.theme !== theme) result.bad.push(`theme:${result.theme}`);
      checks++;
      if (result.bad.length) failures.push({ pathname, width, theme, bad: result.bad });
    }
  }

  for (const [prefix, expectedLang] of [['', 'en'], ['/zh-cn', 'zh-CN'], ['/zh-tw', 'zh-TW']]) for (const width of widths) {
    const pathname = `${prefix}/not-a-real-route/`;
    await navigate(`${origin}${pathname}`, width);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      const result = await evaluate(`({lang:document.documentElement.lang,h1:document.querySelectorAll('h1').length,noindex:Boolean(document.querySelector('meta[name="robots"][content*="noindex"]')),overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth+1})`);
      checks++;
      const bad = [];
      if (result.lang !== expectedLang) bad.push(`lang:${result.lang}`);
      if (result.h1 !== 1) bad.push('h1');
      if (!result.noindex) bad.push('noindex');
      if (result.overflow) bad.push('overflow');
      if (bad.length) failures.push({ pathname, width, theme, bad });
    }
  }

  if (screenshotDirectory) {
    await mkdir(screenshotDirectory, { recursive: true });
    const families = ['/', '/tools/', '/tools/compress/', '/tools/resize/', '/tools/forms/', '/tools/inspect/', '/compress-image/', '/compress-png/', '/signature-resizer/', '/signature-compressor/', '/aspect-ratio-calculator/', '/ppi-calculator/', '/photo-resizer/', '/resize-image/', '/crop-image/', '/image-size-checker/', '/image-dpi-checker/', '/blog/', '/blog/category/tutorials/', '/blog/category/troubleshooting/', '/blog/compress-without-changing-dimensions/', '/blog/compress-image-to-100kb/', '/about/', '/contact/', '/privacy/', '/terms/', '/cookies/', '/editorial-policy/', '/changelog/', '/authors/editor/', '/not-a-real-route/'];
    let index = 0;
    for (const prefix of localePrefixes) for (const path of families) {
      const width = widths[index % widths.length];
      const theme = index % 2 ? 'dark' : 'light';
      await navigate(`${origin}${prefix}${path}`, width);
      await applyTheme(theme);
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
      const locale = prefix ? prefix.slice(1) : 'en';
      const family = path === '/' ? 'home' : path.replace(/^\//, '').replace(/\/$/, '').replaceAll('/', '-');
      await writeFile(join(screenshotDirectory, `${String(index + 1).padStart(2, '0')}-${locale}-${family}-${width}-${theme}.png`), Buffer.from(data, 'base64'));
      index++;
    }
    screenshotCount = index;
  }
  console.log(JSON.stringify({ checks, failures, screenshots: screenshotCount }));
  if (failures.length) process.exitCode = 1;
} finally {
  pageSocket?.close();
  processHandle.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => processHandle.once('exit', resolve)),
    delay(2000)
  ]);
  await rm(profile, { recursive: true, force: true });
}
