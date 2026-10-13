interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  CMS_SITEMAP_URL?: string;
}

const XML_HEADERS = {
  'content-type': 'application/xml; charset=UTF-8',
  'cache-control': 'public, max-age=300, stale-while-revalidate=60',
  'x-content-type-options': 'nosniff'
};
const CANONICAL_ORIGIN = 'https://www.pixeltokb.com';

function xml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
}

function sitemapUrls(document: string) {
  return [...document.matchAll(/<url\b[^>]*>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>[\s\S]*?<\/url>/gi)]
    .map((match) => match[1].replace(/&amp;/g, '&'));
}

function isPublishedCanonical(value: string, origin: string) {
  try {
    const candidate = new URL(value);
    return candidate.origin === origin && candidate.protocol === 'https:' && !candidate.search && !candidate.hash;
  } catch {
    return false;
  }
}

async function cmsUrls(source: string | undefined, origin: string) {
  if (!source) return [];
  try {
    const endpoint = new URL(source);
    if (endpoint.protocol !== 'https:') return [];
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000), headers: { accept: 'application/xml, text/xml;q=0.9' } });
    if (!response.ok) return [];
    const document = await response.text();
    if (document.length > 1_000_000) return [];
    return sitemapUrls(document).filter((url) => isPublishedCanonical(url, origin));
  } catch {
    return [];
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/sitemap.xml') return env.ASSETS.fetch(request);

    const baseline = await env.ASSETS.fetch(new Request(new URL('/_sitemap-entries.json', url), request));
    if (!baseline.ok) return baseline;
    const baselineEntries: Array<{ loc: string; priority?: string }> = await baseline.json();
    const baseUrls = baselineEntries.map((entry) => entry.loc).filter((entry) => isPublishedCanonical(entry, CANONICAL_ORIGIN));
    const additions = await cmsUrls(env.CMS_SITEMAP_URL, CANONICAL_ORIGIN);
    const allUrls = [...new Set([...baseUrls, ...additions])];
    const priorities = new Map(baselineEntries.map((entry) => [entry.loc, entry.priority ?? '0.8']));
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls.map((entry) => `  <url>\n    <loc>${xml(entry)}</loc>\n    <priority>${priorities.get(entry) ?? '0.8'}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
    return new Response(body, { headers: { ...XML_HEADERS, 'x-pixeltokb-sitemap-source': additions.length ? 'static+cms' : 'static' } });
  }
};
