import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const artifactDir = join(root, 'artifacts');
const deliveryDir = join(root, 'delivery');
const buildArg = process.argv.find((arg) => arg.startsWith('--build-seconds='));
const buildSeconds = buildArg ? Number(buildArg.split('=')[1]) : null;

/** @param {string} directory @returns {Promise<string[]>} */
async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

/** @param {string} path */
async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

const [site, releaseEvidence, packageJson] = await Promise.all([
  readFile(join(root, 'config/site.json'), 'utf8').then(JSON.parse),
  readFile(join(root, 'config/release-evidence.json'), 'utf8').then(JSON.parse),
  readFile(join(root, 'package.json'), 'utf8').then(JSON.parse),
]);
const files = await filesBelow(dist);
const fileStats = await Promise.all(files.map(async (path) => ({
  path: relative(dist, path).replaceAll('\\', '/'),
  bytes: (await stat(path)).size,
})));
fileStats.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
const totalBytes = fileStats.reduce((sum, file) => sum + file.bytes, 0);
const htmlCount = fileStats.filter((file) => file.path.endsWith('.html')).length;
const redirectLines = (await readFile(join(dist, '_redirects'), 'utf8')).split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;
/** @param {string} path */
const exists = async (path) => access(path).then(() => true, () => false);
const functionsDirectoryPresent = await exists(join(root, 'functions'));
const routesFilePresent = await exists(join(dist, '_routes.json'));
const internalBudgets = { files: 18000, largestAssetBytes: 25165824, buildSeconds: 900 };
const measuredBuild = Number.isFinite(buildSeconds) ? buildSeconds : null;
const budgetChecks = {
  fileCount: { limit: internalBudgets.files, actual: files.length, pass: files.length <= internalBudgets.files },
  largestAssetBytes: { limit: internalBudgets.largestAssetBytes, actual: fileStats[0]?.bytes ?? 0, pass: (fileStats[0]?.bytes ?? 0) <= internalBudgets.largestAssetBytes },
  buildSeconds: { limit: internalBudgets.buildSeconds, actual: measuredBuild, pass: measuredBuild !== null && measuredBuild <= internalBudgets.buildSeconds },
};
const budgetPass = Object.values(budgetChecks).every((check) => check.pass);
const checkedAt = new Date().toISOString();
const quotaSourceUrls = [
  'https://developers.cloudflare.com/pages/platform/limits/',
  'https://developers.cloudflare.com/pages/functions/pricing/',
  'https://developers.cloudflare.com/workers/platform/limits/',
  'https://developers.cloudflare.com/pages/functions/routing/',
];
const budgetReport = {
  schemaVersion: '1.0',
  status: budgetPass ? 'pass' : 'fail',
  scope: 'local static build output; account usage and deployed runtime remain separately pending',
  siteId: site.siteId,
  packageName: packageJson.name,
  fileCount: files.length,
  htmlFileCount: htmlCount,
  totalBytes,
  largestAssetBytes: fileStats[0]?.bytes ?? 0,
  largestAssetPath: fileStats[0]?.path ?? null,
  buildSeconds: measuredBuild,
  routesInclude: [],
  routesExclude: [],
  redirectCount: redirectLines,
  cmsEnabled: site.cmsEnabled,
  functionsDirectoryPresent,
  routesFilePresent,
  checkedAt,
  quotaSourceUrls,
  budgetChecks,
  productionPending: ['live verification of https://www.pixeltokb.com', 'Cloudflare account plan and shared usage', 'deployed build duration', 'live response headers and redirects'],
};

await mkdir(artifactDir, { recursive: true });
await mkdir(deliveryDir, { recursive: true });
await writeFile(join(artifactDir, 'cloudflare-budget-report.json'), `${JSON.stringify(budgetReport, null, 2)}\n`);

const manifestInputs = [
  'README.md', 'DELIVERY.md', 'LICENSES.md', 'SETUP_REQUIRED.md', 'PROGRESS.md',
  'delivery/acceptance-report.md',
  'package.json', 'pnpm-lock.yaml', 'astro.config.mjs', 'config/site.json',
  'config/release-evidence.json', 'public/_headers', 'public/_redirects',
  'scripts/build.mjs', 'scripts/check-release.mjs', 'scripts/generate-delivery-evidence.mjs',
  'kbresize-dev-package/acceptance.md', 'kbresize-dev-package/deployment.md',
];
const manifestFiles = [];
for (const name of manifestInputs) {
  const path = join(root, name);
  const fileStat = await stat(path);
  manifestFiles.push({ path: name, bytes: fileStat.size, sha256: await sha256(path) });
}
const manifest = {
  schemaVersion: '1.0',
  generatedAt: checkedAt,
  deliveryStatus: 'local-r1-delivery-with-open-acceptance-items',
  sourcePackage: { name: packageJson.name, version: packageJson.version, packageManager: packageJson.packageManager },
  buildOutput: { fileCount: files.length, htmlFileCount: htmlCount, totalBytes, largestAsset: fileStats[0] ?? null },
  releaseEvidence,
  files: manifestFiles,
  excludedFromDelivery: ['node_modules/', 'dist/', '.astro/', '.env*', '.dev.vars', 'user images', 'production secrets'],
  unresolvedExternalItems: ['live verification of the configured production origin', 'verified mailbox delivery', 'Safari/Edge/iOS Safari/Android Chrome sign-off', 'Cloudflare/GitHub deployment and rollback evidence', 'named external native-language review'],
};
await writeFile(join(deliveryDir, 'delivery-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

if (!budgetPass) {
  console.error('Cloudflare local budget failed:', budgetChecks);
  process.exitCode = 1;
} else {
  console.log(`Cloudflare local budget passed: ${files.length} files, largest ${fileStats[0]?.bytes ?? 0} bytes, ${measuredBuild}s build.`);
  console.log('Delivery manifest generated at delivery/delivery-manifest.json.');
}
