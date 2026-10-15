import type { Locale } from './locales.ts';
import type { CmsArticleDraft, CmsArticleRenderSpec } from './cms-content.ts';

export type TranslationField = { key: string; value: string; protectMarkdown?: boolean };
export type TranslationResult = { fields: Record<string, string>; warnings: string[] };

const googleLanguage: Record<Locale, string> = {
  en: 'en', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW', es: 'es', 'pt-br': 'pt-BR', fr: 'fr', de: 'de', ja: 'ja', ko: 'ko', ar: 'ar', hi: 'hi', ru: 'ru', id: 'id'
};

const protectedPattern = /(```[\s\S]*?```|`[^`\n]+`|\[[^\]]+\]\([^\n)]+\)|https?:\/\/[^\s)]+|\/(?:[a-z0-9][^\s)]*)+)/gi;

function protect(value: string) {
  const protectedValues: string[] = [];
  const masked = value.replace(protectedPattern, (match) => {
    const token = `PIXELTOKB_TOKEN_${protectedValues.length}_END`;
    protectedValues.push(match);
    return token;
  });
  return { masked, protectedValues };
}

function restore(value: string, protectedValues: string[], warnings: string[]) {
  return value.replace(/PIXELTOKB_TOKEN_(\d+)_END/g, (match, index: string) => {
    const original = protectedValues[Number(index)];
    if (!original) { warnings.push(`A protected token was lost while translating: ${match}`); return match; }
    return original;
  });
}

export function languageCode(locale: Locale) { return googleLanguage[locale]; }

export function articleTranslationFields(article: CmsArticleDraft): TranslationField[] {
  const fields: TranslationField[] = [
    { key: 'title', value: article.title },
    { key: 'description', value: article.description },
    { key: 'category', value: article.category },
    { key: 'body', value: article.body, protectMarkdown: true }
  ];
  const render = article.render;
  if (!render) return fields;
  fields.push({ key: 'render.workflow.situation', value: render.workflow.situation });
  render.workflow.steps.forEach(([label, detail], index) => {
    fields.push({ key: `render.workflow.steps.${index}.0`, value: label });
    fields.push({ key: `render.workflow.steps.${index}.1`, value: detail });
  });
  fields.push({ key: 'render.workflow.caption', value: render.workflow.caption });
  render.workflow.links.forEach(([label], index) => fields.push({ key: `render.workflow.links.${index}.0`, value: label }));
  fields.push({ key: 'render.example.heading', value: render.example.heading });
  render.example.rows.forEach(([label, value], index) => {
    fields.push({ key: `render.example.rows.${index}.0`, value: label });
    fields.push({ key: `render.example.rows.${index}.1`, value });
  });
  fields.push({ key: 'render.example.note', value: render.example.note });
  render.sources.forEach(([label, value], index) => {
    fields.push({ key: `render.sources.${index}.0`, value: label });
    fields.push({ key: `render.sources.${index}.1`, value });
  });
  return fields;
}

export async function translateGoogle(apiKey: string, sourceLocale: Locale, targetLocale: Locale, fields: TranslationField[]): Promise<TranslationResult> {
  if (!apiKey.trim()) throw new Error('Google Translation API key is not configured.');
  if (sourceLocale === targetLocale) throw new Error('Source and target languages must be different.');
  const warnings: string[] = [];
  const masks = fields.map((field) => field.protectMarkdown ? protect(field.value) : { masked: field.value, protectedValues: [] });
  const endpoint = new URL('https://translation.googleapis.com/language/translate/v2');
  endpoint.searchParams.set('key', apiKey.trim());
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ q: masks.map(({ masked }) => masked), source: languageCode(sourceLocale), target: languageCode(targetLocale), format: 'text' }),
    signal: AbortSignal.timeout(20_000)
  });
  const payload = await response.json().catch(() => ({})) as { data?: { translations?: Array<{ translatedText?: unknown }> }; error?: { message?: string } };
  if (!response.ok || !payload.data?.translations || payload.data.translations.length !== fields.length) throw new Error(payload.error?.message || 'Google Translation did not return every field.');
  const translated = Object.fromEntries(fields.map((field, index) => [field.key, field.protectMarkdown ? restore(String(payload.data!.translations![index].translatedText ?? ''), masks[index].protectedValues, warnings) : String(payload.data!.translations![index].translatedText ?? '')]));
  return { fields: translated, warnings };
}

function setRenderField(render: CmsArticleRenderSpec, key: string, value: string) {
  const match = key.match(/^render\.workflow\.(situation|caption)$/);
  if (match) { render.workflow[match[1] as 'situation' | 'caption'] = value; return; }
  const steps = key.match(/^render\.workflow\.steps\.(\d+)\.(0|1)$/);
  if (steps) { render.workflow.steps[Number(steps[1])][Number(steps[2])] = value; return; }
  const links = key.match(/^render\.workflow\.links\.(\d+)\.0$/);
  if (links) { render.workflow.links[Number(links[1])][0] = value; return; }
  const example = key.match(/^render\.example\.(heading|note)$/);
  if (example) { render.example[example[1] as 'heading' | 'note'] = value; return; }
  const rows = key.match(/^render\.example\.rows\.(\d+)\.(0|1)$/);
  if (rows) { render.example.rows[Number(rows[1])][Number(rows[2])] = value; return; }
  const sources = key.match(/^render\.sources\.(\d+)\.(0|1)$/);
  if (sources) render.sources[Number(sources[1])][Number(sources[2])] = value;
}

export function translatedArticle(source: CmsArticleDraft, targetLocale: Locale, result: TranslationResult): CmsArticleDraft {
  const fields = result.fields;
  const render = source.render ? JSON.parse(JSON.stringify(source.render)) as CmsArticleRenderSpec : undefined;
  if (render) {
    render.sourceLocale = source.render?.sourceLocale ?? source.locale;
    // Keep one stable translation group when a translation is translated again.
    // The original source article id is the canonical group identity; falling
    // back to the source locale also keeps older render specs valid.
    render.translationOf = source.render?.translationOf ?? source.render?.articleId ?? source.slug;
    for (const [key, value] of Object.entries(fields)) if (key.startsWith('render.')) setRenderField(render, key, value);
  }
  return {
    slug: source.slug,
    locale: targetLocale,
    title: fields.title ?? source.title,
    description: fields.description ?? source.description,
    category: fields.category ?? source.category,
    publishedAt: source.publishedAt,
    status: 'needs-review',
    body: fields.body ?? source.body,
    ...(render ? { render } : {})
  };
}
