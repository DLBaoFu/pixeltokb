import { spawnSync } from 'node:child_process';

const started = performance.now();
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

/** @param {string} command @param {string[]} args */
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(pnpm, ['check']);
run(pnpm, ['lint']);
run(pnpm, ['test']);
run(process.execPath, ['scripts/check-release.mjs', '--build']);
run(pnpm, ['exec', 'astro', 'build']);
run(process.execPath, ['scripts/enhance-static-seo.mjs']);
run(process.execPath, ['scripts/generate-sitemap.mjs']);
run(process.execPath, ['scripts/validate-routes.mjs']);
run(process.execPath, ['scripts/validate-redirects.mjs']);

const buildSeconds = Number(((performance.now() - started) / 1000).toFixed(3));
run(process.execPath, ['scripts/generate-delivery-evidence.mjs', `--build-seconds=${buildSeconds}`]);
