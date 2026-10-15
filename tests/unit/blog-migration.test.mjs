import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMigrationReport } from '../../scripts/generate-blog-migration-diff.mjs';

test('legacy blog migration report is explicit while CMS copies do not exist', () => {
  const report = buildMigrationReport();
  assert.equal(report.summary.total, 15);
  assert.equal(report.summary.notMigrated, 15);
  assert.equal(report.summary.match, 0);
  assert.equal(report.migrationReady, false);
  assert.ok(report.records.every((record) => record.status === 'not-migrated'));
});
