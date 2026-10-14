// @ts-nocheck -- JSON registry records are validated by assertions in this test.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { includedInCurrentBuild } from '../../src/lib/current-routes.mjs';

const registry = JSON.parse(await readFile(new URL('../../kbresize-dev-package/routes.json', import.meta.url), 'utf8'));
const routes = registry.sites.find((site) => site.id === 'kb').routes;

test('only explicitly released R2 routes join the current static build', () => {
  const currentR2 = routes.filter((route) => route.firstRelease === 'R2' && includedInCurrentBuild(route)).map((route) => route.path);
  assert.deepEqual(currentR2, ['/tools/forms', '/compress-png', '/signature-resizer', '/signature-compressor', '/photo-resizer', '/aspect-ratio-calculator', '/ppi-calculator']);
  assert.equal(routes.find((route) => route.path === '/compress-png').engine, 'png-lossless');
});
