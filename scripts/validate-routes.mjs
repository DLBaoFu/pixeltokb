import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { isPendingReview } from '../src/lib/publication.mjs';

const dist = join(process.cwd(), 'dist');
const origin = (process.env.SITE_ORIGIN || 'https://www.pixeltokb.com').replace(/\/$/, '');
const failures = [];

/** @param {string} directory @returns {Promise<string[]>} */
async function pages(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await pages(path));
    else if (entry.name === 'index.html') found.push(path);
  }
  return found;
}

/** @param {string} file */
function routeFor(file) {
  return `/${relative(dist, file).split(sep).join('/').replace(/index\.html$/, '')}`;
}

/** @param {string} html @param {string} tag @param {string} attribute */
function tagsWith(html, tag, attribute) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${attribute}="[^"]+"[^>]*>`, 'gi'))].map(([text]) => text);
}

/** @param {string} tag @param {string} attribute */
function value(tag, attribute) {
  return tag.match(new RegExp(`\\b${attribute}="([^"]*)"`, 'i'))?.[1];
}

/** @type {{sites: Array<{id: string, routes: Array<{path: string, firstRelease: string, kind: string}>}>}} */
const registry = JSON.parse(await readFile(join(process.cwd(), 'kbresize-dev-package/routes.json'), 'utf8'));
const site = registry.sites.find((candidate) => candidate.id === 'kb');
if (!site) throw new Error('KB route registry is missing');
const r1 = site.routes.filter((route) => route.firstRelease === 'R1');
const toolPaths = new Set(r1.filter((route) => route.kind === 'tool').map((route) => `${route.path}/`));
const expectedRoutes = new Set(r1.flatMap((route) => ['en', 'zh-cn', 'zh-tw'].map((locale) => {
  const base = route.path === '/' ? '/' : `${route.path}/`;
  return locale === 'en' ? base : `/${locale}${base}`;
})));
const generated = await pages(dist);
const generatedRoutes = new Set(generated.map(routeFor));
const simplifiedOnly = new Set('图过标万仅静态当设无达浏览编码处时请尝试读确认损坏备进压缩绪选择须间输节检载败传为后点击实数会画质还吗决于细调许体积减应该广网么难采并适来将这预义单动结离开终获从项场邮带见问题张宽显铺满内区侧顶发现据说变');
const traditionalOnly = new Set('圖過標萬僅靜態當設無達瀏覽編碼處時請嘗試讀確認損壞備進壓縮緒選擇須間輸節檢載敗傳為後點擊實數會畫質還嗎決於細調許體積減應該廣網麼難採並適來將這預義單動結離開終獲從項場郵帶見問題張寬顯鋪滿內區側頂發現據說變');
const internalCopy = [
  /\b(?:E2E|R1|acceptance evidence|publication status|draft boundary|not yet a production release|production release remains blocked|local browser run|repository fixture)\b/i,
  /(?:验收证据|驗收證據|本地浏览器 E2E|本機瀏覽器 E2E|发布状态|發布狀態|尚非正式发布|尚非正式發布|本地验证|本機驗證|仍待测试|仍待測試)/
];
for (const route of expectedRoutes) if (!generatedRoutes.has(route)) failures.push(`Registered R1 route not generated: ${route}`);
for (const route of generatedRoutes) if (!expectedRoutes.has(route)) failures.push(`Unregistered route generated: ${route}`);

const indexable = new Set();
for (const file of generated) {
  const html = await readFile(file, 'utf8');
  const source = routeFor(file);
  const locale = source.startsWith('/zh-cn/') ? 'zh-CN' : source.startsWith('/zh-tw/') ? 'zh-TW' : 'en';
  if (value(html.match(/<html\b[^>]*>/i)?.[0] || '', 'lang') !== locale) failures.push(`${source}: html lang must be ${locale}`);
  const visibleText = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '');
  if (internalCopy.some((pattern) => pattern.test(visibleText))) failures.push(`${source}: internal validation or pre-release wording leaked into public copy`);
  if (locale === 'en' && /[\u3400-\u9fff]/u.test(visibleText)) failures.push(`${source}: Chinese text leaked into English visible copy`);
  if (locale === 'zh-TW' && [...visibleText].some((character) => simplifiedOnly.has(character))) failures.push(`${source}: simplified glyph leaked into Traditional Chinese visible copy`);
  if (locale === 'zh-CN' && [...visibleText].some((character) => traditionalOnly.has(character))) failures.push(`${source}: traditional glyph leaked into Simplified Chinese visible copy`);
  const languageMenu = html.match(/<details\b[^>]*class="[^"]*language-menu[^"]*"[^>]*>([\s\S]*?)<\/details>/i)?.[1] || '';
  const selectedLanguages = [...languageMenu.matchAll(/<a\b[^>]*\baria-current="page"[^>]*>/gi)];
  if (selectedLanguages.length !== 1 || value(selectedLanguages[0][0], 'lang') !== locale) failures.push(`${source}: language menu selection disagrees with route`);
  if (source.startsWith('/en/')) failures.push(`${source}: obsolete English locale prefix generated`);
  const canonical = tagsWith(html, 'link', 'rel').filter((tag) => value(tag, 'rel') === 'canonical');
  const alternates = tagsWith(html, 'link', 'hreflang');
  const noindex = tagsWith(html, 'meta', 'name').some((tag) => value(tag, 'name') === 'robots' && /(?:^|,)\s*noindex(?:,|$)/i.test(value(tag, 'content') || ''));
  const url = `${origin}${source}`;
  if (noindex !== isPendingReview(source)) failures.push(`${source}: noindex disagrees with publication review status`);
  if (noindex) {
    if (canonical.length || alternates.length) failures.push(`${source}: pending-review page must not advertise canonical/hreflang`);
  } else {
    indexable.add(url);
    if (canonical.length !== 1 || value(canonical[0], 'href') !== url) failures.push(`${source}: expected one self canonical ${url}`);
    const base = source.replace(/^\/(zh-cn|zh-tw)(?=\/)/, '') || '/';
    const expectedAlternates = new Map([
      ['en', `${origin}${base}`], ['zh-CN', `${origin}/zh-cn${base}`],
      ['zh-TW', `${origin}/zh-tw${base}`], ['x-default', `${origin}${base}`]
    ]);
    if (alternates.length !== expectedAlternates.size) failures.push(`${source}: expected four hreflang links`);
    for (const tag of alternates) {
      const lang = value(tag, 'hreflang');
      const href = value(tag, 'href');
      if (!lang || expectedAlternates.get(lang) !== href) failures.push(`${source}: invalid hreflang ${lang} → ${href}`);
    }
    if (toolPaths.has(base)) {
      const schemaBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
      let applicationSchema;
      try { applicationSchema = schemaBlocks.map((block) => JSON.parse(block)).find((schema) => schema['@type'] === 'WebApplication'); }
      catch { failures.push(`${source}: invalid JSON-LD`); }
      if (!applicationSchema) failures.push(`${source}: tool page needs WebApplication JSON-LD`);
      else if (applicationSchema.url !== url || applicationSchema.name !== (html.match(/<title>([^<]+) \| pixeltokb<\/title>/i)?.[1])) failures.push(`${source}: WebApplication JSON-LD must match canonical title and URL`);
    }
  }
  if (!/<title>[^<]+<\/title>/i.test(html) || !/<meta\s+name="description"\s+content="[^"]+"/i.test(html)) failures.push(`${source}: missing title or description`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) failures.push(`${source}: expected one H1`);
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = match[1].replace(/&amp;/g, '&');
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const pathname = new URL(href, origin).pathname;
    if (pathname.startsWith('/en/')) failures.push(`${source}: obsolete English link ${href}`);
    const target = pathname === '/' ? join(dist, 'index.html') : join(dist, pathname, 'index.html');
    try { if (!(await stat(target)).isFile()) failures.push(`${source}: broken link ${href}`); }
    catch { failures.push(`${source}: broken link ${href}`); }
  }
}

const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (new Set(sitemapUrls).size !== sitemapUrls.length) failures.push('sitemap.xml: duplicate loc entries');
for (const url of indexable) if (!sitemapUrls.includes(url)) failures.push(`sitemap.xml: missing ${url}`);
for (const url of sitemapUrls) if (!indexable.has(url)) failures.push(`sitemap.xml: non-indexable URL ${url}`);
const sitemapFiles = (await readdir(dist)).filter((name) => /^sitemap.*\.xml$/i.test(name));
if (sitemapFiles.length !== 1 || sitemapFiles[0] !== 'sitemap.xml') failures.push(`Expected only sitemap.xml; found ${sitemapFiles.join(', ')}`);
const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) failures.push('robots.txt: sitemap origin does not match build origin');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Validated ${generated.length} registered R1 pages, ${indexable.size} indexable URLs, canonical/hreflang, sitemap, robots and internal links.`);
