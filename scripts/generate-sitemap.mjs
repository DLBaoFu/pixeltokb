// @ts-check
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const dist = join(process.cwd(), 'dist');
const configuredOrigin = process.env.SITE_ORIGIN;
const origin = (configuredOrigin || 'https://www.pixeltokb.com').replace(/\/$/, '');
if (configuredOrigin && (!/^https:\/\/[^/]+$/.test(origin) || origin.includes('.example'))) {
  throw new Error('SITE_ORIGIN must be a real HTTPS origin without a path.');
}

/** @type {{sites: Array<{id: string, routes: Array<{path: string, kind: string, firstRelease: string}>}>}} */
const registry = JSON.parse(await readFile(join(process.cwd(), 'kbresize-dev-package/routes.json'), 'utf8'));
const site = registry.sites.find((candidate) => candidate.id === 'kb');
if (!site) throw new Error('KB route registry is missing');
/** @type {Record<string, string>} */
const priorityByKind = { home: '1.0', tool: '0.9', category: '0.8', article: '0.8', 'blog-category': '0.7', foundation: '0.7' };
const routePriority = new Map(site.routes.filter((route) => route.firstRelease === 'R1').map((route) => {
  const path = route.path === '/' ? '/' : `${route.path}/`;
  return [path, priorityByKind[route.kind] || '0.6'];
}));

/** @param {string} directory @returns {Promise<string[]>} */
async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name === 'index.html') {
      const route = relative(dist, path).split(sep).join('/');
      if (!route.startsWith('en/')) files.push(path);
    }
  }
  return files;
}

/** @param {string} file @returns {string} */
function publicPath(file) {
  const relativePath = relative(dist, file).split(sep).join('/');
  if (relativePath === 'index.html') return `${origin}/`;
  const urlPath = relativePath.replace(/index\.html$/, '');
  return `${origin}/${urlPath}`;
}

const urls = [];
for (const file of (await htmlFiles(dist)).sort()) {
  const html = await readFile(file, 'utf8');
  if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) continue;
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  const expected = publicPath(file);
  if (canonical !== expected) throw new Error(`${file}: canonical must be ${expected}; found ${canonical ?? 'none'}`);
  const pathname = new URL(expected).pathname.replace(/^\/(zh-cn|zh-tw)(?=\/)/, '') || '/';
  const priority = routePriority.get(pathname);
  if (!priority) throw new Error(`${file}: no sitemap priority registered for ${pathname}`);
  urls.push({ loc: expected, priority });
}
const urlset = urls.map(({ loc, priority }) => `  <url>\n    <loc>${loc}</loc>\n    <priority>${priority}</priority>\n  </url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>\n`;
await writeFile(join(dist, 'sitemap.xml'), xml);
const allowedCrawlers = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Perplexity-User', 'meta-externalfetcher', 'MistralAI-User'];
const robotGroups = ['User-agent: *\nAllow: /', ...allowedCrawlers.map((crawler) => `User-agent: ${crawler}\nAllow: /`)];
await writeFile(join(dist, 'robots.txt'), `${robotGroups.join('\n\n')}\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Generated sitemap.xml (${urls.length} indexable URLs) using ${origin}${configuredOrigin ? '' : ' (production default)'}`);
