import type { Locale } from './locales';

export type FooterGroupCopy = {
  compression: string;
  resizeCrop: string;
  inspectPlan: string;
};

// Only the three published locales need visible, reviewed group labels. The
// fallback keeps unpublished preparation locales coherent without advertising
// them as public translations.
export const footerGroupCopy: Partial<Record<Locale, FooterGroupCopy>> = {
  en: { compression: 'Compression', resizeCrop: 'Resize & crop', inspectPlan: 'Check & plan' },
  'zh-cn': { compression: '压缩', resizeCrop: '缩放与裁剪', inspectPlan: '检查与规划' },
  'zh-tw': { compression: '壓縮', resizeCrop: '縮放與裁切', inspectPlan: '檢查與規劃' },
};

export function getFooterGroupCopy(locale: Locale): FooterGroupCopy {
  return footerGroupCopy[locale] ?? footerGroupCopy.en!;
}
