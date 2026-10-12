import { readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pendingReviewPaths } from '../src/lib/publication.mjs';

const root = process.cwd();
if (process.argv.includes('--build') && process.env.BUILD_FOR_RELEASE !== '1' && process.env.CF_PAGES !== '1') {
  console.log('Local build only. Pages builds and BUILD_FOR_RELEASE=1 builds run the release gate.');
  process.exit(0);
}
const config = JSON.parse(await readFile(join(root, 'config/site.json'), 'utf8'));
const evidence = JSON.parse(await readFile(join(root, 'config/release-evidence.json'), 'utf8'));
const requiredChecks = ['seoAndRouteReview', 'contentAndLegalReview', 'realGuideExamples', 'imageFixtureE2E', 'crossBrowserDownloadAndAlpha', 'wholeSiteVisualAndAccessibility', 'cloudflareBudget'];
const failures = [];
const origin = process.env.SITE_ORIGIN || config.origin;
if (typeof origin !== 'string' || !/^https:\/\/[^/]+$/.test(origin) || origin.includes('.example')) {
  failures.push('Set SITE_ORIGIN to the verified production HTTPS origin, without a path.');
}
if (typeof config.operator !== 'string' || !config.operator.trim()) failures.push('Verify and configure the real operator in config/site.json.');
if (typeof config.contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail)) failures.push('Configure and test a real contact inbox in config/site.json.');
if (config.contactEmailVerified !== true) failures.push('Verify delivery to the configured contact inbox, then set contactEmailVerified to true with supporting evidence.');
if (pendingReviewPaths.size) failures.push(`${pendingReviewPaths.size} route families remain noindex pending identity, legal or editorial review: ${[...pendingReviewPaths].join(', ')}`);
for (const check of requiredChecks) {
  const record = evidence[check];
  if (!record || typeof record !== 'object' || !['pass', 'pending'].includes(record.status) || typeof record.evidence !== 'string' || !record.evidence.trim()) {
    failures.push(`${check}: invalid or empty evidence record; use status pass/pending and a repository evidence file.`);
    continue;
  }
  const file = resolve(root, record.evidence);
  if (relative(root, file).startsWith('..')) { failures.push(`${check}: evidence must be inside the repository.`); continue; }
  let evidenceExists = true;
  try { if (!(await stat(file)).isFile()) { failures.push(`${check}: evidence is not a file: ${record.evidence}`); evidenceExists = false; } }
  catch { failures.push(`${check}: evidence file does not exist: ${record.evidence}`); evidenceExists = false; }
  if (record.status !== 'pass' && evidenceExists) failures.push(`${check}: pending; current evidence is recorded at ${record.evidence}.`);
}

if (failures.length) {
  console.error('Production release is not ready:\n- ' + failures.join('\n- '));
  process.exitCode = 1;
} else console.log('Identity, origin and editorial publication gates are cleared. Complete the remaining acceptance matrix before deployment.');
