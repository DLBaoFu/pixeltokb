import { allLocales, type Locale } from './locales.ts';

export type LocaleReleaseState = 'published' | 'translation-ready' | 'needs-review';

export type LocaleRelease = {
  locale: Locale;
  direction: 'ltr' | 'rtl';
  state: LocaleReleaseState;
};

const published = new Set<Locale>(['en', 'zh-cn', 'zh-tw']);

/**
 * A locale can be edited in the CMS before it is exposed in site navigation,
 * hreflang, or the sitemap. Publishing remains a separate editorial decision.
 */
export const localeReleasePlan: LocaleRelease[] = allLocales.map((locale) => ({
  locale,
  direction: locale === 'ar' ? 'rtl' : 'ltr',
  state: published.has(locale) ? 'published' : 'needs-review'
}));

export const cmsEditableLocales = localeReleasePlan.map(({ locale }) => locale);
