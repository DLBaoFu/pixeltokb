import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { includedInCurrentBuild } from '../src/lib/current-routes.mjs';

const root = process.cwd();
const dist = join(root, 'dist');
const redirectText = await readFile(join(dist, '_redirects'), 'utf8');
/** @type {{sites:Array<{id:string,routes:Array<{path:string,firstRelease:string}>}>,aliases:{kb:Record<string,string>}}} */
const registry = JSON.parse(await readFile(join(root, 'kbresize-dev-package/routes.json'), 'utf8'));
const failures = [];
const redirects = new Map();

for (const [index, rawLine] of redirectText.split(/\r?\n/).entries()) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const [source, target, status, ...extra] = line.split(/\s+/);
  if (!source || !target || status !== '301' || extra.length) {
    failures.push(`_redirects:${index + 1}: expected "source target 301"`);
    continue;
  }
  if (!source.startsWith('/') || !target.startsWith('/')) failures.push(`_redirects:${index + 1}: redirects must stay on this origin`);
  if (redirects.has(source)) failures.push(`_redirects:${index + 1}: duplicate source ${source}`);
  redirects.set(source, target);
}

/** @param {string} target */
const targetPath = (target) => new URL(target, 'https://pixeltokb.invalid').pathname;
/** @param {string} left @param {string} right */
const equivalentTarget = (left, right) => {
  /** @param {string} value */
  const normalized = (value) => {
    const url = new URL(value, 'https://pixeltokb.invalid');
    const path = url.pathname === '/' ? '/' : `${url.pathname.replace(/\/$/, '')}/`;
    return `${path}${url.search}`;
  };
  return normalized(left) === normalized(right);
};

for (const [source, target] of redirects) {
  const path = targetPath(target);
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path, 'index.html');
  try { if (!(await stat(file)).isFile()) failures.push(`${source}: target is not a generated page: ${target}`); }
  catch { failures.push(`${source}: target is not a generated page: ${target}`); }
  if ([...redirects.keys()].some((candidate) => equivalentTarget(candidate, path))) failures.push(`${source}: target creates a redirect chain through ${path}`);
  if (equivalentTarget(source, target)) failures.push(`${source}: redirect points to itself`);
}

const site = registry.sites.find((candidate) => candidate.id === 'kb');
if (!site) throw new Error('KB route registry is missing');
for (const route of site.routes.filter(includedInCurrentBuild)) {
  const canonical = route.path === '/' ? '/' : `${route.path}/`;
  const legacy = `/en${canonical}`;
  const actual = redirects.get(legacy);
  if (!actual || !equivalentTarget(actual, canonical)) failures.push(`${legacy}: missing direct redirect to ${canonical}`);
}
for (const [source, target] of Object.entries(registry.aliases.kb)) {
  const actual = redirects.get(source);
  if (!actual || !equivalentTarget(actual, target)) failures.push(`${source}: _redirects target must match registry target ${target}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${redirects.size} one-hop 301 redirects; every target is generated and every registered legacy alias is covered.`);
}
