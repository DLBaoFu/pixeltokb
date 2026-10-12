// @ts-check
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const dist = join(process.cwd(), 'dist');
const configuredOrigin = process.env.SITE_ORIGIN;
const origin = (configuredOrigin || 'https://www.pixeltokb.com').replace(/\/$/, '');
if (configuredOrigin && (!/^https:\/\/[^/]+$/.test(origin) || origin.includes('.example'))) {
  throw new Error('SITE_ORIGIN must be a real HTTPS origin without a path.');
}

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
  urls.push(expected);
}
const urlset = urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>\n`;
await writeFile(join(dist, 'sitemap.xml'), xml);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Generated sitemap.xml (${urls.length} indexable URLs) using ${origin}${configuredOrigin ? '' : ' (production default)'}`);
