import fs from 'node:fs';
import path from 'node:path';
import { guides, type Guide, type PublishedLocale } from './guide-content.ts';
import { guideWorkflows, type GuideWorkflow } from './guide-workflows.ts';
import { articleMeta as legacyArticleMeta } from './blog-system.ts';
import { localeReleasePlan } from './locale-release.ts';
import { isCmsLocale, isCmsSlug, validateCmsArticle, type CmsArticleDraft, type CmsArticleRenderSpec } from './cms-content.ts';

export type BlogArticleMeta = {
  publishedAt: string;
  dateLabel: Record<PublishedLocale, string>;
  readMinutes: number;
  categorySlug: 'tutorials' | 'troubleshooting';
};

type CmsRecord = CmsArticleDraft & { render: CmsArticleRenderSpec };

const contentRoot = path.resolve(process.cwd(), 'content/blog');
const publicLocales = new Set<PublishedLocale>(localeReleasePlan.filter((entry) => entry.state === 'published').map((entry) => entry.locale as PublishedLocale));

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return null;
  const fields: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const divider = line.indexOf(': ');
    if (divider < 1) continue;
    const key = line.slice(0, divider).trim();
    const value = line.slice(divider + 2).trim();
    try { fields[key] = JSON.parse(value); } catch { fields[key] = value; }
  }
  return { fields, body: match[2].trim() };
}

function readCmsRecords() {
  if (!fs.existsSync(contentRoot)) return [] as CmsRecord[];
  const records: CmsRecord[] = [];
  for (const localeEntry of fs.readdirSync(contentRoot, { withFileTypes: true })) {
    if (!localeEntry.isDirectory() || !isCmsLocale(localeEntry.name)) continue;
    const locale = localeEntry.name;
    const localeRoot = path.join(contentRoot, locale);
    for (const file of fs.readdirSync(localeRoot, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.md')) continue;
      const slug = file.name.slice(0, -3);
      if (!isCmsSlug(slug)) continue;
      const parsed = parseFrontmatter(fs.readFileSync(path.join(localeRoot, file.name), 'utf8'));
      if (!parsed) continue;
      const validation = validateCmsArticle({ ...parsed.fields, slug, locale, body: parsed.body });
      if (!validation.ok || validation.article.status !== 'published' || !validation.article.render) continue;
      const article = validation.article;
      const render = article.render;
      if (!render) continue;
      if (!isCmsLocale(article.locale) || !isCmsSlug(render.articleId) || !Number.isInteger(render.readMinutes) || !isCmsSlug(render.workflow.image)) continue;
      if (!fs.existsSync(path.resolve(process.cwd(), 'public/blog-workflows', article.locale, `${render.workflow.image}.png`))) continue;
      records.push({ ...article, render });
    }
  }
  return records;
}

const cmsRecords = readCmsRecords();

function markdownSections(body: string): Array<[string, string]> {
  const sections: Array<[string, string]> = [];
  const chunks = body.split(/\n(?=##?\s+)/g).map((chunk) => chunk.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const heading = chunk.match(/^#{1,6}\s+(.+?)(?:\n|$)/);
    if (!heading) continue;
    const text = chunk.slice(heading[0].length).replace(/\n+/g, ' ').trim();
    if (text) sections.push([heading[1].trim(), text]);
  }
  if (sections.length) return sections.slice(0, 12);
  const text = body.replace(/\n+/g, ' ').trim();
  return text ? [['Article details', text.slice(0, 4_000)]] : [['Article details', '']];
}

function cmsGuide(record: CmsRecord): Guide {
  return {
    slug: record.slug,
    category: record.category,
    title: record.title,
    intro: record.description,
    sections: markdownSections(record.body),
    example: record.render.example,
    sources: record.render.sources
  };
}

function cmsWorkflow(record: CmsRecord): GuideWorkflow {
  return record.render.workflow;
}

function cmsRecord(locale: PublishedLocale, slug: string) {
  return cmsRecords.find((record) => record.locale === locale && record.slug === slug && publicLocales.has(locale));
}

export function blogGuides(locale: PublishedLocale) {
  const legacy = guides[locale];
  const occupied = new Set(legacy.map((article) => article.slug));
  const additions = cmsRecords
    .filter((record) => record.locale === locale && publicLocales.has(locale) && !occupied.has(record.slug))
    .sort((a, b) => `${b.publishedAt}/${b.slug}`.localeCompare(`${a.publishedAt}/${a.slug}`))
    .map(cmsGuide);
  return [...legacy, ...additions];
}

export function blogWorkflow(locale: PublishedLocale, slug: string) {
  return cmsRecord(locale, slug) ? cmsWorkflow(cmsRecord(locale, slug)!) : guideWorkflows[locale][slug];
}

function dateLabel(locale: PublishedLocale, date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return date;
  if (locale === 'en') return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

export function blogArticleMeta(locale: PublishedLocale, slug: string): BlogArticleMeta {
  const record = cmsRecord(locale, slug);
  if (!record) return legacyArticleMeta(slug);
  return {
    publishedAt: record.publishedAt,
    dateLabel: { en: dateLabel('en', record.publishedAt), 'zh-cn': dateLabel('zh-cn', record.publishedAt), 'zh-tw': dateLabel('zh-tw', record.publishedAt) },
    readMinutes: record.render.readMinutes,
    categorySlug: record.render.categorySlug
  };
}

export function blogRouteSlugs(locale: PublishedLocale) {
  return blogGuides(locale).map(({ slug }) => slug);
}

export function cmsBlogRecordCount() {
  return cmsRecords.length;
}
