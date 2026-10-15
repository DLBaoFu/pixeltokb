import fs from 'node:fs';
import path from 'node:path';
import { guides } from '../src/lib/guide-content.ts';
import { guideWorkflows } from '../src/lib/guide-workflows.ts';

/** @typedef {import('../src/lib/guide-content.ts').Guide} Guide */
/** @typedef {import('../src/lib/guide-content.ts').PublishedLocale} PublishedLocale */
/** @typedef {{ fields: Record<string, any>, body: string } | { error: string } | null} ParsedMarkdown */

const root = process.cwd();
const outputPath = path.join(root, 'artifacts/blog-migration-diff.json');
/** @type {PublishedLocale[]} */
const locales = ['en', 'zh-cn', 'zh-tw'];

/** @param {string} filePath @returns {ParsedMarkdown} */
function parseMarkdown(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { error: 'missing-frontmatter' };
  /** @type {Record<string, any>} */
  const fields = {};
  for (const line of match[1].split('\n')) {
    const divider = line.indexOf(': ');
    if (divider < 1) continue;
    try { fields[line.slice(0, divider)] = JSON.parse(line.slice(divider + 2)); } catch { fields[line.slice(0, divider)] = line.slice(divider + 2); }
  }
  return { fields, body: match[2].trim() };
}

/** @param {string} body @returns {string[]} */
function bodyHeadings(body) {
  return body.split('\n').map((line) => line.match(/^##?\s+(.+)$/)?.[1]?.trim()).filter((value) => typeof value === 'string');
}

/** @param {string[]} differences @param {string} field @param {unknown} expected @param {unknown} actual */
function compareValue(differences, field, expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) differences.push(field);
}

/** @param {PublishedLocale} locale @param {Guide} guide */
function compareArticle(locale, guide) {
  const filePath = path.join(root, 'content/blog', locale, `${guide.slug}.md`);
  const cms = parseMarkdown(filePath);
  const expected = { title: guide.title, description: guide.intro, category: guide.category, sections: guide.sections, example: guide.example, sources: guide.sources, workflow: guideWorkflows[locale][guide.slug] };
  if (!cms) return { locale, slug: guide.slug, status: 'not-migrated', differences: ['cms-file-missing'], expected };
  if ('error' in cms) return { locale, slug: guide.slug, status: 'invalid', differences: [cms.error], expected };
  const fields = cms.fields;
  const body = cms.body;
  /** @type {string[]} */
  const differences = [];
  compareValue(differences, 'title', expected.title, fields.title);
  compareValue(differences, 'description', expected.description, fields.description);
  compareValue(differences, 'category', expected.category, fields.category);
  compareValue(differences, 'section-headings', expected.sections.map(([heading]) => heading), bodyHeadings(body));
  compareValue(differences, 'example', expected.example, fields.render?.example);
  compareValue(differences, 'sources', expected.sources, fields.render?.sources);
  compareValue(differences, 'workflow', expected.workflow, fields.render?.workflow);
  if (fields.status !== 'published') differences.push(`status:${fields.status ?? 'missing'}`);
  return { locale, slug: guide.slug, status: differences.length ? 'different' : 'match', differences, expected, cms: { status: fields.status, publishedAt: fields.publishedAt } };
}

export function buildMigrationReport() {
  const records = locales.flatMap((locale) => guides[locale].map((guide) => compareArticle(locale, guide)));
  const summary = { total: records.length, notMigrated: records.filter((record) => record.status === 'not-migrated').length, different: records.filter((record) => record.status === 'different').length, invalid: records.filter((record) => record.status === 'invalid').length, match: records.filter((record) => record.status === 'match').length };
  return { generatedAt: new Date().toISOString(), migrationReady: summary.total > 0 && summary.match === summary.total, summary, records };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = buildMigrationReport();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Blog migration diff: ${report.summary.match}/${report.summary.total} exact matches; ${report.summary.notMigrated} not migrated; ${report.summary.different} different; ${report.summary.invalid} invalid.`);
  console.log(`Report written to ${path.relative(root, outputPath)}.`);
}
