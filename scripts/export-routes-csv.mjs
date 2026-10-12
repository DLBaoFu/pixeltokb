import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const source = join(root, 'kbresize-dev-package/routes.json');
const target = join(root, 'kbresize-dev-package/routes.csv');
const registry = JSON.parse(await readFile(source, 'utf8'));
const fields = ['siteId', 'path', 'name', 'kind', 'firstRelease', 'primaryKeyword', 'secondaryKeywords', 'engine', 'defaults', 'category', 'initialStatus', 'indexAfterReview', 'adEligibleAfterApproval'];
/** @param {unknown} value */
const cell = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const rows = [fields.join(',')];
for (const site of registry.sites) {
  for (const route of site.routes) {
    const record = { ...route, siteId: site.id, secondaryKeywords: route.secondaryKeywords.join('; '), defaults: JSON.stringify(route.defaults) };
    rows.push(fields.map((field) => cell(record[field])).join(','));
  }
}
await writeFile(target, `${rows.join('\n')}\n`);
console.log(`Updated ${target} from routes.json (${rows.length - 1} routes).`);
