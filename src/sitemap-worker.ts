import { type Locale } from './lib/locales';
import { articleToMarkdown, cmsArticlePath, isCmsLocale, isCmsSlug, validateCmsArticle } from './lib/cms-content';
import { localeReleasePlan } from './lib/locale-release';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  CMS_SITEMAP_URL?: string;
  CMS_PUBLIC_ORIGIN?: string;
  CMS_GITHUB_OWNER?: string;
  CMS_GITHUB_REPO?: string;
  CMS_GITHUB_BRANCH?: string;
  CMS_ALLOWED_GITHUB_USERS?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  CMS_COOKIE_SECRET?: string;
}

type CmsConfig = { origin: string; owner: string; repo: string; branch: string; clientId: string; clientSecret: string; cookieSecret: string; allowedUsers: Set<string> };
type CmsSession = { login: string; token: string; exp: number };
type OAuthState = { state: string; verifier: string; exp: number };

const XML_HEADERS = { 'content-type': 'application/xml; charset=UTF-8', 'cache-control': 'public, max-age=300, stale-while-revalidate=60', 'x-content-type-options': 'nosniff' };
const JSON_HEADERS = { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const CANONICAL_ORIGIN = 'https://www.pixeltokb.com';
const OAUTH_COOKIE = '__Host-pixeltokb-cms-oauth';
const SESSION_COOKIE = '__Host-pixeltokb-cms-session';
const tenMinutes = 10 * 60;
const oneHour = 60 * 60;

function xml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!); }
function sitemapUrls(document: string) { return [...document.matchAll(/<url\b[^>]*>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>[\s\S]*?<\/url>/gi)].map((match) => match[1].replace(/&amp;/g, '&')); }
function isPublishedCanonical(value: string, origin: string) { try { const candidate = new URL(value); return candidate.origin === origin && candidate.protocol === 'https:' && !candidate.search && !candidate.hash; } catch { return false; } }

async function cmsUrls(source: string | undefined, origin: string) {
  if (!source) return [];
  try {
    const endpoint = new URL(source);
    if (endpoint.protocol !== 'https:') return [];
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000), headers: { accept: 'application/xml, text/xml;q=0.9' } });
    if (!response.ok) return [];
    const document = await response.text();
    return document.length > 1_000_000 ? [] : sitemapUrls(document).filter((url) => isPublishedCanonical(url, origin));
  } catch { return []; }
}

function responseJson(value: unknown, status = 200, headers: HeadersInit = {}) { return new Response(JSON.stringify(value), { status, headers: { ...JSON_HEADERS, ...headers } }); }
function cmsConfig(env: Env): CmsConfig | null {
  const origin = env.CMS_PUBLIC_ORIGIN?.trim();
  const owner = env.CMS_GITHUB_OWNER?.trim();
  const repo = env.CMS_GITHUB_REPO?.trim();
  const branch = env.CMS_GITHUB_BRANCH?.trim();
  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  const cookieSecret = env.CMS_COOKIE_SECRET?.trim();
  const allowedUsers = new Set((env.CMS_ALLOWED_GITHUB_USERS ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (!origin || !owner || !repo || !branch || !clientId || clientId.startsWith('REPLACE_') || !clientSecret || !cookieSecret || cookieSecret.length < 32 || allowedUsers.size === 0) return null;
  try { const parsed = new URL(origin); if (parsed.origin !== origin || parsed.protocol !== 'https:') return null; } catch { return null; }
  return { origin, owner, repo, branch, clientId, clientSecret, cookieSecret, allowedUsers };
}
function cookieValue(request: Request, name: string) { const pair = request.headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`)); return pair?.slice(name.length + 1); }
function cookie(name: string, value: string, maxAge: number) { return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`; }
function clearCookie(name: string) { return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }
function headersWithCookies(headers: HeadersInit, cookies: string[]) { const result = new Headers(headers); for (const value of cookies) result.append('set-cookie', value); return result; }
function base64UrlEncode(value: Uint8Array) { let binary = ''; for (const byte of value) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function base64Encode(value: Uint8Array) { let binary = ''; for (const byte of value) binary += String.fromCharCode(byte); return btoa(binary); }
function base64UrlDecode(value: string) { const normalized = value.replace(/-/g, '+').replace(/_/g, '/'); const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4)); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); }
function randomUrlSafe(bytes = 32) { const value = new Uint8Array(bytes); crypto.getRandomValues(value); return base64UrlEncode(value); }
async function hmacKey(secret: string, purpose: string) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:${purpose}`)); return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function aesKey(secret: string) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:cms-session-encryption`)); return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function seal(value: unknown, secret: string) {
  const iv = new Uint8Array(12); crypto.getRandomValues(iv);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), new TextEncoder().encode(JSON.stringify(value))));
  const payload = `${base64UrlEncode(iv)}.${base64UrlEncode(encrypted)}`;
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret, 'cms-session-signature'), new TextEncoder().encode(payload)));
  return `${payload}.${base64UrlEncode(signature)}`;
}
async function unseal<T>(value: string | undefined, secret: string): Promise<T | null> {
  if (!value) return null;
  const [ivPart, encryptedPart, signaturePart, ...extra] = value.split('.');
  if (!ivPart || !encryptedPart || !signaturePart || extra.length) return null;
  try {
    const payload = `${ivPart}.${encryptedPart}`;
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret, 'cms-session-signature'), base64UrlDecode(signaturePart), new TextEncoder().encode(payload));
    if (!valid) return null;
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlDecode(ivPart) }, await aesKey(secret), base64UrlDecode(encryptedPart));
    return JSON.parse(new TextDecoder().decode(decrypted)) as T;
  } catch { return null; }
}
async function oauthCookie(state: OAuthState, config: CmsConfig) { return cookie(OAUTH_COOKIE, await seal(state, config.cookieSecret), tenMinutes); }
async function sessionCookie(session: CmsSession, config: CmsConfig) { return cookie(SESSION_COOKIE, await seal(session, config.cookieSecret), oneHour); }
function callbackUrl(config: CmsConfig) { return `${config.origin}/api/cms-auth/callback`; }
function sha256Base64Url(value: string) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then((hash) => base64UrlEncode(new Uint8Array(hash))); }
function githubHeaders(token?: string): HeadersInit {
  return {
    accept: 'application/vnd.github+json',
    'user-agent': 'PixelToKB-CMS',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}
async function githubUser(token: string) { const response = await fetch('https://api.github.com/user', { headers: githubHeaders(token) }); if (!response.ok) return null; const data = await response.json() as { login?: unknown }; return typeof data.login === 'string' ? data.login : null; }
async function canPush(config: CmsConfig, token: string, login: string) {
  // The configured repository owner is an explicit deployment-level allowlist
  // entry. GitHub may omit `permissions.push` from an OAuth repository
  // response, but the owner still has write authority. Trust that identity
  // relationship before relying on the optional permissions field.
  if (config.owner.toLowerCase() === login.toLowerCase()) return true;
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`, { headers: githubHeaders(token) });
  if (!response.ok) return false;
  const data = await response.json() as { owner?: { login?: unknown }; permissions?: { push?: unknown } };
  if (data.permissions?.push === true) return true;
  // GitHub can omit the permissions object for an OAuth token even when the
  // authenticated account owns the repository. The repository owner still has
  // write authority, so keep the explicit username allowlist and accept that
  // authoritative owner relationship as a safe fallback.
  return typeof data.owner?.login === 'string' && data.owner.login.toLowerCase() === login.toLowerCase() && config.owner.toLowerCase() === login.toLowerCase();
}
async function validSession(request: Request, config: CmsConfig) { const session = await unseal<CmsSession>(cookieValue(request, SESSION_COOKIE), config.cookieSecret); if (!session || typeof session.login !== 'string' || typeof session.token !== 'string' || !Number.isFinite(session.exp) || session.exp <= Date.now() || !config.allowedUsers.has(session.login.toLowerCase())) return null; return session; }
function protectJsonOrigin(request: Request, config: CmsConfig, required = false) { const origin = request.headers.get('origin'); return required ? origin === config.origin : !origin || origin === config.origin; }
function gitContentUrl(config: CmsConfig, contentPath: string) { return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${contentPath.split('/').map(encodeURIComponent).join('/')}`; }

async function listArticles(config: CmsConfig, session: CmsSession) {
  const response = await fetch(`${gitContentUrl(config, 'content/blog')}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders(session.token) });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('Unable to list articles.');
  const directories = (await response.json() as Array<{ type?: string; name?: string; path?: string }>).filter((entry) => entry.type === 'dir' && typeof entry.name === 'string' && isCmsLocale(entry.name));
  const groups = await Promise.all(directories.map(async (directory) => {
    const listing = await fetch(`${gitContentUrl(config, directory.path!)}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders(session.token) });
    if (!listing.ok) return [];
    return (await listing.json() as Array<{ type?: string; name?: string; path?: string; sha?: string }>).filter((file) => file.type === 'file' && file.name?.endsWith('.md')).map((file) => ({ locale: directory.name!, slug: file.name!.slice(0, -3), path: file.path, sha: file.sha })).filter((file) => isCmsSlug(file.slug));
  }));
  return groups.flat().sort((a, b) => `${a.locale}/${a.slug}`.localeCompare(`${b.locale}/${b.slug}`));
}
async function getArticle(config: CmsConfig, session: CmsSession, locale: Locale, slug: string) {
  const response = await fetch(`${gitContentUrl(config, cmsArticlePath(locale, slug))}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders(session.token) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Unable to read article.');
  const data = await response.json() as { content?: string; encoding?: string; sha?: string };
  if (data.encoding !== 'base64' || typeof data.content !== 'string') throw new Error('Unsupported article format.');
  return { markdown: new TextDecoder().decode(base64UrlDecode(data.content.replace(/\n/g, ''))), sha: data.sha };
}
function parseArticleRoute(pathname: string) { const match = pathname.match(/^\/api\/cms\/articles\/([^/]+)\/([^/]+)$/); return match && isCmsLocale(match[1]) && isCmsSlug(match[2]) ? { locale: match[1], slug: match[2] } : null; }

async function handleCms(request: Request, env: Env, url: URL) {
  const config = cmsConfig(env);
  if (!config) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  if (url.pathname === '/api/cms-auth/login' && request.method === 'GET') {
    const state = randomUrlSafe(); const verifier = randomUrlSafe(48); const authorization = new URL('https://github.com/login/oauth/authorize');
    authorization.searchParams.set('client_id', config.clientId); authorization.searchParams.set('redirect_uri', callbackUrl(config)); authorization.searchParams.set('scope', 'read:user public_repo'); authorization.searchParams.set('state', state); authorization.searchParams.set('code_challenge_method', 'S256'); authorization.searchParams.set('code_challenge', await sha256Base64Url(verifier));
    return new Response(null, { status: 302, headers: headersWithCookies({ location: authorization.href, 'cache-control': 'no-store' }, [await oauthCookie({ state, verifier, exp: Date.now() + tenMinutes * 1000 }, config)]) });
  }
  if (url.pathname === '/api/cms-auth/callback' && request.method === 'GET') {
    const oauth = await unseal<OAuthState>(cookieValue(request, OAUTH_COOKIE), config.cookieSecret); const code = url.searchParams.get('code'); const state = url.searchParams.get('state');
    if (!oauth || !code || !state || oauth.state !== state || oauth.exp <= Date.now()) return new Response('OAuth session expired. Start again from the admin page.', { status: 400, headers: headersWithCookies({ 'cache-control': 'no-store' }, [clearCookie(OAUTH_COOKIE)]) });
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: callbackUrl(config), code_verifier: oauth.verifier }) });
    const tokenResult = await tokenResponse.json() as { access_token?: unknown };
    if (!tokenResponse.ok || typeof tokenResult.access_token !== 'string') return new Response('GitHub authorization could not be completed.', { status: 403, headers: headersWithCookies({ 'cache-control': 'no-store' }, [clearCookie(OAUTH_COOKIE)]) });
    const login = await githubUser(tokenResult.access_token);
    if (!login) return new Response('GitHub account identity could not be verified. Please try again.', { status: 403, headers: headersWithCookies({ 'cache-control': 'no-store' }, [clearCookie(OAUTH_COOKIE)]) });
    if (!config.allowedUsers.has(login.toLowerCase())) return new Response('This GitHub account is not on the CMS allowlist.', { status: 403, headers: headersWithCookies({ 'cache-control': 'no-store' }, [clearCookie(OAUTH_COOKIE)]) });
    if (!(await canPush(config, tokenResult.access_token, login))) return new Response('The allowlisted GitHub account does not have write access to this repository.', { status: 403, headers: headersWithCookies({ 'cache-control': 'no-store' }, [clearCookie(OAUTH_COOKIE)]) });
    return new Response(null, { status: 302, headers: headersWithCookies({ location: '/admin/?cms=authorized', 'cache-control': 'no-store' }, [clearCookie(OAUTH_COOKIE), await sessionCookie({ login, token: tokenResult.access_token, exp: Date.now() + oneHour * 1000 }, config)]) });
  }
  if (url.pathname === '/api/cms-auth/logout' && request.method === 'POST') {
    if (!protectJsonOrigin(request, config, true)) return responseJson({ error: 'Invalid request origin.' }, 403);
    return responseJson({ ok: true }, 200, { 'set-cookie': clearCookie(SESSION_COOKIE) });
  }
  const session = await validSession(request, config);
  if (!session) return responseJson({ error: 'Authentication required.' }, 401, { 'set-cookie': clearCookie(SESSION_COOKIE) });
  if (url.pathname === '/api/cms/session' && request.method === 'GET') return responseJson({ user: session.login, repository: `${config.owner}/${config.repo}`, branch: config.branch, locales: localeReleasePlan });
  if (request.method === 'PUT' && !protectJsonOrigin(request, config, true)) return responseJson({ error: 'Invalid request origin.' }, 403);
  if (url.pathname === '/api/cms/articles' && request.method === 'GET') { try { return responseJson({ articles: await listArticles(config, session) }); } catch { return responseJson({ error: 'Unable to load articles from GitHub.' }, 502); } }
  const articleRoute = parseArticleRoute(url.pathname);
  if (!articleRoute) return responseJson({ error: 'Not found.' }, 404);
  if (request.method === 'GET') { try { const article = await getArticle(config, session, articleRoute.locale, articleRoute.slug); return article ? responseJson(article) : responseJson({ error: 'Not found.' }, 404); } catch { return responseJson({ error: 'Unable to load this article from GitHub.' }, 502); } }
  if (request.method !== 'PUT') return responseJson({ error: 'Method not allowed.' }, 405, { allow: 'GET, PUT' });
  try {
    const payload = await request.json() as { article?: unknown; sha?: unknown }; const validation = validateCmsArticle(payload.article);
    if (!validation.ok || validation.article.locale !== articleRoute.locale || validation.article.slug !== articleRoute.slug) return responseJson({ error: validation.ok ? 'The URL and article identity must match.' : validation.errors }, 422);
    const response = await fetch(gitContentUrl(config, cmsArticlePath(articleRoute.locale, articleRoute.slug)), { method: 'PUT', headers: { ...githubHeaders(session.token), 'content-type': 'application/json' }, body: JSON.stringify({ message: `cms: update ${articleRoute.locale}/${articleRoute.slug}`, content: base64Encode(new TextEncoder().encode(articleToMarkdown(validation.article))), branch: config.branch, ...(typeof payload.sha === 'string' ? { sha: payload.sha } : {}) }) });
    if (response.status === 409 || response.status === 422) return responseJson({ error: 'The GitHub file changed. Reload it before saving again.' }, 409);
    if (!response.ok) return responseJson({ error: 'GitHub did not accept this update.' }, 502);
    const result = await response.json() as { content?: { sha?: string }; commit?: { sha?: string } };
    return responseJson({ ok: true, sha: result.content?.sha, commit: result.commit?.sha });
  } catch { return responseJson({ error: 'The article could not be saved.' }, 400); }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/admin/' || url.pathname === '/admin' || url.pathname.startsWith('/api/cms/') || url.pathname.startsWith('/api/cms-auth/')) {
      const config = cmsConfig(env);
      if (!config) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
      if (url.pathname === '/admin/' || url.pathname === '/admin') return request.method === 'GET' ? env.ASSETS.fetch(request) : new Response('Method not allowed', { status: 405, headers: { allow: 'GET' } });
      return handleCms(request, env, url);
    }
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
