import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { isPendingReview } from '../src/lib/publication.mjs';
import { includedInCurrentBuild } from '../src/lib/current-routes.mjs';

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
const currentRoutes = site.routes.filter(includedInCurrentBuild);
const internalRoutes = new Set(['/admin/']);
const toolPaths = new Set(currentRoutes.filter((route) => route.kind === 'tool').map((route) => `${route.path}/`));
const expectedRoutes = new Set(currentRoutes.flatMap((route) => ['en', 'zh-cn', 'zh-tw'].map((locale) => {
  const base = route.path === '/' ? '/' : `${route.path}/`;
  return locale === 'en' ? base : `/${locale}${base}`;
})));
const generated = await pages(dist);
const generatedRoutes = new Set(generated.map(routeFor).filter((route) => !internalRoutes.has(route)));
const simplifiedOnly = new Set('图过标万仅静态当设无达浏览编码处时请尝试读确认损坏备进压缩绪选择须间输节检载败传为后点击实数会画质还吗决于细调许体积减应该广网么难采并适来将这预义单动结离开终获从项场邮带见问题张宽显铺满内区侧顶发现据说变');
const traditionalOnly = new Set('圖過標萬僅靜態當設無達瀏覽編碼處時請嘗試讀確認損壞備進壓縮緒選擇須間輸節檢載敗傳為後點擊實數會畫質還嗎決於細調許體積減應該廣網麼難採並適來將這預義單動結離開終獲從項場郵帶見問題張寬顯鋪滿內區側頂發現據說變');
const internalCopy = [
  /\b(?:E2E|R1|acceptance evidence|publication status|draft boundary|not yet a production release|production release remains blocked|local browser run|repository fixture)\b/i,
  /(?:验收证据|驗收證據|本地浏览器 E2E|本機瀏覽器 E2E|发布状态|發布狀態|尚非正式发布|尚非正式發布|本地验证|本機驗證|仍待测试|仍待測試)/
];
for (const route of expectedRoutes) if (!generatedRoutes.has(route)) failures.push(`Registered current-build route not generated: ${route}`);
for (const route of generatedRoutes) if (!expectedRoutes.has(route)) failures.push(`Unregistered route generated: ${route}`);

const indexable = new Set();
const titlesByLocale = new Map();
const descriptionsByLocale = new Map();
for (const file of generated) {
  const html = await readFile(file, 'utf8');
  const source = routeFor(file);
  if (internalRoutes.has(source)) continue;
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
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
  const keywords = html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i)?.[1]?.trim();
  const author = html.match(/<meta\s+name="author"\s+content="([^"]+)"/i)?.[1]?.trim();
  if (!title || !description) failures.push(`${source}: missing title or description`);
  if (!keywords || keywords.split(',').filter(Boolean).length < 4) failures.push(`${source}: missing focused meta keywords`);
  if (keywords && keywords.length > 100) failures.push(`${source}: focused meta keywords exceed 100 characters`);
  if (author !== 'PixelTokb') failures.push(`${source}: missing PixelTokb author metadata`);
  if (noindex !== isPendingReview(source)) failures.push(`${source}: noindex disagrees with publication review status`);
  if (noindex) {
    if (canonical.length || alternates.length) failures.push(`${source}: pending-review page must not advertise canonical/hreflang`);
  } else {
    indexable.add(url);
    const titleKey = `${locale}:${title}`;
    const descriptionKey = `${locale}:${description}`;
    if (titlesByLocale.has(titleKey)) failures.push(`${source}: duplicate indexable title also used by ${titlesByLocale.get(titleKey)}`);
    else titlesByLocale.set(titleKey, source);
    if (descriptionsByLocale.has(descriptionKey)) failures.push(`${source}: duplicate indexable description also used by ${descriptionsByLocale.get(descriptionKey)}`);
    else descriptionsByLocale.set(descriptionKey, source);
    const robotsContent = tagsWith(html, 'meta', 'name').find((tag) => value(tag, 'name') === 'robots');
    if (!robotsContent || value(robotsContent, 'content') !== 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1') failures.push(`${source}: incomplete indexable robots directives`);
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
  if (!noindex) {
    for (const required of ['og:title', 'og:description', 'og:url', 'og:locale', 'og:image', 'og:image:alt']) if (!html.includes(`property="${required}"`)) failures.push(`${source}: missing ${required}`);
    for (const required of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) if (!html.includes(`name="${required}"`)) failures.push(`${source}: missing ${required}`);
    const schemaBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
    /** @type {{'@graph'?: Array<Record<string, unknown>>} | undefined} */
    let graph;
    try { graph = schemaBlocks.map((block) => JSON.parse(block)).find((schema) => Array.isArray(schema['@graph'])); }
    catch { failures.push(`${source}: invalid JSON-LD graph`); }
    for (const type of ['Organization', 'WebSite', 'WebPage']) if (!graph?.['@graph']?.some((item) => item['@type'] === type)) failures.push(`${source}: missing ${type} JSON-LD`);
  }
  if ((html.match(/<h1\b/gi) || []).length !== 1) failures.push(`${source}: expected one H1`);
  for (const anchor of html.matchAll(/<a\b([^>]*)>[\s\S]*?<\/a>/gi)) if (!/\btitle="[^"]+"/i.test(anchor[1])) failures.push(`${source}: link missing a descriptive title attribute`);
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
const runtimeEntries = JSON.parse(await readFile(join(dist, '_sitemap-entries.json'), 'utf8'));
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapEntries = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<priority>([01](?:\.\d)?)<\/priority>\s*<\/url>/g)].map((match) => ({ url: match[1], priority: Number(match[2]) }));
if (new Set(sitemapUrls).size !== sitemapUrls.length) failures.push('sitemap.xml: duplicate loc entries');
if (sitemapEntries.length !== sitemapUrls.length) failures.push('sitemap.xml: every URL must have one valid priority');
for (const entry of sitemapEntries) if (entry.priority < 0 || entry.priority > 1) failures.push(`sitemap.xml: invalid priority for ${entry.url}`);
for (const url of indexable) if (!sitemapUrls.includes(url)) failures.push(`sitemap.xml: missing ${url}`);
for (const url of sitemapUrls) if (!indexable.has(url)) failures.push(`sitemap.xml: non-indexable URL ${url}`);
if (!Array.isArray(runtimeEntries) || runtimeEntries.length !== sitemapEntries.length) failures.push('runtime sitemap entries: must match sitemap.xml entry count');
for (const entry of runtimeEntries) {
  if (!entry || typeof entry.loc !== 'string' || !sitemapUrls.includes(entry.loc)) failures.push(`runtime sitemap entries: invalid URL ${entry?.loc ?? 'unknown'}`);
  const staticEntry = sitemapEntries.find((candidate) => candidate.url === entry?.loc);
  if (!staticEntry || Number(staticEntry.priority) !== Number(entry?.priority)) failures.push(`runtime sitemap entries: priority mismatch for ${entry?.loc ?? 'unknown'}`);
}
const sitemapFiles = (await readdir(dist)).filter((name) => /^sitemap.*\.xml$/i.test(name));
if (sitemapFiles.length !== 1 || sitemapFiles[0] !== 'sitemap.xml') failures.push(`Expected only sitemap.xml; found ${sitemapFiles.join(', ')}`);
const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) failures.push('robots.txt: sitemap origin does not match build origin');
for (const crawler of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Perplexity-User', 'meta-externalfetcher', 'MistralAI-User']) {
  if (!robots.includes(`User-agent: ${crawler}\nAllow: /`)) failures.push(`robots.txt: ${crawler} is not explicitly allowed`);
}

const socialImage = await readFile(join(dist, 'og-image.png'));
const pngSignature = '89504e470d0a1a0a';
if (socialImage.subarray(0, 8).toString('hex') !== pngSignature || socialImage.readUInt32BE(16) !== 1200 || socialImage.readUInt32BE(20) !== 630) failures.push('og-image.png: expected a valid 1200×630 PNG');
const llms = await readFile(join(dist, 'llms.txt'), 'utf8');
for (const route of ['/compress-image/', '/compress-png/', '/signature-resizer/', '/signature-compressor/', '/aspect-ratio-calculator/', '/ppi-calculator/', '/photo-resizer/', '/resize-image/', '/crop-image/', '/image-size-checker/', '/image-dpi-checker/']) if (!llms.includes(`${origin}${route}`)) failures.push(`llms.txt: missing current tool ${route}`);
if (/\b(?:AVIF|GIF|HEIC|TIFF|OCR|AI image generator)\b/i.test(llms)) failures.push('llms.txt: contains an unsupported current feature');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Validated ${generated.length} registered current-build pages, ${indexable.size} indexable URLs, canonical/hreflang, sitemap, robots and internal links.`);
