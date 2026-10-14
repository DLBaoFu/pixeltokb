import { allLocales, type Locale } from './locales.ts';

export type CmsArticleStatus = 'draft' | 'published';

export type CmsArticleDraft = {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  status: CmsArticleStatus;
  body: string;
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
  if (candidate.status !== 'draft' && candidate.status !== 'published') errors.push('Choose draft or published status.');
  if (!text(candidate.body, 60_000)) errors.push('Article body must be between 1 and 60,000 characters.');
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
      body: body.trim()
    }
  };
}

function frontmatterValue(value: string) {
  return JSON.stringify(value);
}

export function articleToMarkdown(article: CmsArticleDraft) {
  return `---\nslug: ${frontmatterValue(article.slug)}\nlocale: ${frontmatterValue(article.locale)}\ntitle: ${frontmatterValue(article.title)}\ndescription: ${frontmatterValue(article.description)}\ncategory: ${frontmatterValue(article.category)}\npublishedAt: ${frontmatterValue(article.publishedAt)}\nstatus: ${frontmatterValue(article.status)}\n---\n\n${article.body}\n`;
}
