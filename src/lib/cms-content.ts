import { allLocales, type Locale } from './locales.ts';

export type CmsArticleStatus = 'draft' | 'needs-review' | 'published';

export type CmsArticleRenderSpec = {
  articleId: string;
  sourceLocale: Locale;
  translationOf?: string;
  readMinutes: number;
  categorySlug: 'tutorials' | 'troubleshooting';
  workflow: {
    situation: string;
    steps: Array<[string, string]>;
    image: string;
    caption: string;
    links: Array<[string, string]>;
  };
  example: {
    heading: string;
    rows: Array<[string, string]>;
    note: string;
  };
  sources: Array<[string, string]>;
};

export type CmsArticleDraft = {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  status: CmsArticleStatus;
  body: string;
  render?: CmsArticleRenderSpec;
};

export const cmsContentRoot = 'content/blog';

const text = (value: unknown, limit: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= limit;

export function isCmsLocale(value: string): value is Locale {
  return allLocales.includes(value as Locale);
}

export function isCmsSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+){0,11}$/.test(value) && value.length <= 96;
}

export function cmsArticlePath(locale: Locale, slug: string) {
  if (!isCmsLocale(locale) || !isCmsSlug(slug)) throw new Error('Invalid CMS article path.');
  return `${cmsContentRoot}/${locale}/${slug}.md`;
}

export function validateCmsArticle(value: unknown): { ok: true; article: CmsArticleDraft } | { ok: false; errors: string[] } {
  if (!value || typeof value !== 'object') return { ok: false, errors: ['The article payload must be an object.'] };
  const candidate = value as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof candidate.slug !== 'string' || !isCmsSlug(candidate.slug)) errors.push('Use a lowercase URL slug made of letters, numbers, and single hyphens.');
  if (typeof candidate.locale !== 'string' || !isCmsLocale(candidate.locale)) errors.push('Choose a supported locale.');
  if (!text(candidate.title, 120)) errors.push('Title must be between 1 and 120 characters.');
  if (!text(candidate.description, 180)) errors.push('Description must be between 1 and 180 characters.');
  if (!text(candidate.category, 60)) errors.push('Category must be between 1 and 60 characters.');
  if (typeof candidate.publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.publishedAt)) errors.push('Use a publication date in YYYY-MM-DD format.');
  if (candidate.status !== 'draft' && candidate.status !== 'needs-review' && candidate.status !== 'published') errors.push('Choose draft, needs-review or published status.');
  if (!text(candidate.body, 60_000)) errors.push('Article body must be between 1 and 60,000 characters.');
  const render = validateRenderSpec(candidate.render, errors);
  if (candidate.status === 'published' && !render) errors.push('Published articles must include complete rendering data so CMS pages use the same blog template as existing articles.');
  if (errors.length) return { ok: false, errors };
  const slug = candidate.slug as string;
  const locale = candidate.locale as Locale;
  const title = candidate.title as string;
  const description = candidate.description as string;
  const category = candidate.category as string;
  const publishedAt = candidate.publishedAt as string;
  const status = candidate.status as CmsArticleStatus;
  const body = candidate.body as string;
  return {
    ok: true,
    article: {
      slug: slug.trim(),
      locale,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      publishedAt,
      status,
      body: body.trim(),
      ...(render ? { render } : {})
    }
  };
}

function pairList(value: unknown, label: string, errors: string[]) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12 || value.some((item) => !Array.isArray(item) || item.length !== 2 || !text(item[0], 160) || !text(item[1], 4_000))) {
    errors.push(`${label} must contain between 1 and 12 text pairs.`);
    return null;
  }
  return value.map((item) => [String(item[0]).trim(), String(item[1]).trim()] as [string, string]);
}

function validateRenderSpec(value: unknown, errors: string[]): CmsArticleRenderSpec | null {
  if (value === undefined) return null;
  if (!value || typeof value !== 'object') { errors.push('Rendering data must be an object.'); return null; }
  const candidate = value as Record<string, unknown>;
  const articleId = candidate.articleId;
  const sourceLocale = candidate.sourceLocale;
  const translationOf = candidate.translationOf;
  const readMinutes = candidate.readMinutes;
  const categorySlug = candidate.categorySlug;
  const workflow = candidate.workflow;
  const example = candidate.example;
  const sources = candidate.sources;
  if (typeof articleId !== 'string' || !isCmsSlug(articleId)) errors.push('Rendering articleId must be a lowercase stable identity.');
  if (typeof sourceLocale !== 'string' || !isCmsLocale(sourceLocale)) errors.push('Rendering sourceLocale must be a supported locale.');
  if (translationOf !== undefined && (typeof translationOf !== 'string' || !isCmsSlug(translationOf))) errors.push('Rendering translationOf must be a valid article identity.');
  if (typeof readMinutes !== 'number' || !Number.isInteger(readMinutes) || readMinutes < 1 || readMinutes > 60) errors.push('Rendering readMinutes must be an integer from 1 to 60.');
  if (categorySlug !== 'tutorials' && categorySlug !== 'troubleshooting') errors.push('Rendering categorySlug must be tutorials or troubleshooting.');
  if (!workflow || typeof workflow !== 'object') errors.push('Rendering workflow data is required.');
  if (!example || typeof example !== 'object') errors.push('Rendering example data is required.');
  const workflowRecord = workflow && typeof workflow === 'object' ? workflow as Record<string, unknown> : {};
  const exampleRecord = example && typeof example === 'object' ? example as Record<string, unknown> : {};
  const steps = pairList(workflowRecord.steps, 'Rendering workflow steps', errors);
  const links = pairList(workflowRecord.links, 'Rendering workflow links', errors);
  const rows = pairList(exampleRecord.rows, 'Rendering example rows', errors);
  if (!text(workflowRecord.situation, 4_000) || !text(workflowRecord.image, 160) || !text(workflowRecord.caption, 4_000)) errors.push('Rendering workflow situation, image and caption are required.');
  if (typeof workflowRecord.image !== 'string' || !isCmsSlug(workflowRecord.image)) errors.push('Rendering workflow image must be a safe existing screenshot basename.');
  if (!text(exampleRecord.heading, 160) || !text(exampleRecord.note, 4_000)) errors.push('Rendering example heading and note are required.');
  if (!Array.isArray(sources) || sources.length === 0 || sources.length > 12 || sources.some((item) => !Array.isArray(item) || item.length !== 2 || !text(item[0], 160) || !text(item[1], 4_000))) errors.push('Rendering sources must contain between 1 and 12 text pairs.');
  if (errors.length) return null;
  return {
    articleId: String(articleId).trim(), sourceLocale: sourceLocale as Locale,
    ...(translationOf ? { translationOf: String(translationOf).trim() } : {}),
    readMinutes: readMinutes as number, categorySlug: categorySlug as 'tutorials' | 'troubleshooting',
    workflow: { situation: String(workflowRecord.situation).trim(), steps: steps!, image: String(workflowRecord.image).trim(), caption: String(workflowRecord.caption).trim(), links: links! },
    example: { heading: String(exampleRecord.heading).trim(), rows: rows!, note: String(exampleRecord.note).trim() },
    sources: (sources as Array<[unknown, unknown]>).map((item) => [String(item[0]).trim(), String(item[1]).trim()])
  };
}

function frontmatterValue(value: unknown) {
  return JSON.stringify(value);
}

export function articleToMarkdown(article: CmsArticleDraft) {
  const fields = [
    ['slug', article.slug], ['locale', article.locale], ['title', article.title], ['description', article.description],
    ['category', article.category], ['publishedAt', article.publishedAt], ['status', article.status],
    ...(article.render ? [['render', article.render] as const] : [])
  ];
  return `---\n${fields.map(([key, value]) => `${key}: ${frontmatterValue(value)}`).join('\n')}\n---\n\n${article.body}\n`;
}
