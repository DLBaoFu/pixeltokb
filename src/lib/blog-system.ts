import type { PublishedLocale } from './guide-content.ts';

export type BlogArticleMeta = {
  publishedAt: string;
  dateLabel: Record<PublishedLocale, string>;
  readMinutes: number;
  categorySlug: 'tutorials' | 'troubleshooting';
};

/**
 * The journal is data-driven: article identity, navigation, and presentation
 * metadata live here while the localized article copy stays in guide-content.
 * The date is the first public publication date for this article set.
 */
export const blogArticleMeta: Record<string, BlogArticleMeta> = {
  'compress-without-changing-dimensions': {
    publishedAt: '2026-10-13',
    dateLabel: { en: '13 Oct 2026', 'zh-cn': '2026年10月13日', 'zh-tw': '2026年10月13日' },
    readMinutes: 4,
    categorySlug: 'tutorials'
  },
  'why-image-wont-fit-50kb': {
    publishedAt: '2026-10-13',
    dateLabel: { en: '13 Oct 2026', 'zh-cn': '2026年10月13日', 'zh-tw': '2026年10月13日' },
    readMinutes: 5,
    categorySlug: 'troubleshooting'
  },
  'kb-vs-kib': {
    publishedAt: '2026-10-13',
    dateLabel: { en: '13 Oct 2026', 'zh-cn': '2026年10月13日', 'zh-tw': '2026年10月13日' },
    readMinutes: 4,
    categorySlug: 'tutorials'
  },
  'check-image-size-and-dpi': {
    publishedAt: '2026-10-13',
    dateLabel: { en: '13 Oct 2026', 'zh-cn': '2026年10月13日', 'zh-tw': '2026年10月13日' },
    readMinutes: 6,
    categorySlug: 'tutorials'
  },
  'compress-image-to-100kb': {
    publishedAt: '2026-10-13',
    dateLabel: { en: '13 Oct 2026', 'zh-cn': '2026年10月13日', 'zh-tw': '2026年10月13日' },
    readMinutes: 5,
    categorySlug: 'tutorials'
  }
};

export const blogLabels = {
  en: {
    journal: 'PixelTokb Journal', allArticles: 'All articles', latest: 'Latest articles', topics: 'Browse by topic',
    tutorials: 'Tutorials', troubleshooting: 'Troubleshooting', read: 'Read article', readMinutes: 'min read',
    published: 'Published', updated: 'Updated', by: 'By', contents: 'In this article', fieldNote: 'Field note',
    browserRun: 'Browser run', result: 'The result', method: 'How the result was checked', related: 'Keep reading',
    openTool: 'Open the tool', previous: 'Previous article', next: 'Next article', back: 'Back to the journal',
    practical: 'Practical image workflows', directoryIntro: 'Real browser-first notes for the moment an upload form, a file limit, or a print requirement gets in the way.',
    toolHeading: 'Use a tool, then keep the result', toolIntro: 'Open the current image tool when you need to act, or read the article first when the rule is unclear.'
  },
  'zh-cn': {
    journal: 'PixelTokb 博客', allArticles: '全部文章', latest: '最新文章', topics: '按主题浏览',
    tutorials: '图片教程', troubleshooting: '问题排查', read: '阅读全文', readMinutes: '分钟阅读',
    published: '发布于', updated: '更新于', by: '作者', contents: '本文目录', fieldNote: '实用记录',
    browserRun: '浏览器实测', result: '这次的结果', method: '结果是怎样核对的', related: '继续阅读',
    openTool: '打开工具', previous: '上一篇', next: '下一篇', back: '返回博客首页',
    practical: '图片实用文章', directoryIntro: '围绕上传表单、文件限制和打印要求写的真实浏览器操作记录，遇到问题时可以直接照着做。',
    toolHeading: '先用工具，再把结果留好', toolIntro: '需要马上处理图片就打开工具；规则不清楚时，先读对应文章再操作。'
  },
  'zh-tw': {
    journal: 'PixelTokb 部落格', allArticles: '全部文章', latest: '最新文章', topics: '依主題瀏覽',
    tutorials: '圖片教學', troubleshooting: '問題排解', read: '閱讀文章', readMinutes: '分鐘閱讀',
    published: '發佈於', updated: '更新於', by: '作者', contents: '本文目錄', fieldNote: '實用記錄',
    browserRun: '瀏覽器實測', result: '這次的結果', method: '結果如何核對', related: '繼續閱讀',
    openTool: '開啟工具', previous: '上一篇', next: '下一篇', back: '返回部落格首頁',
    practical: '圖片實用文章', directoryIntro: '圍繞上傳表單、檔案限制與列印要求撰寫的真實瀏覽器操作記錄，遇到問題時可以直接照著做。',
    toolHeading: '先用工具，再把結果留好', toolIntro: '需要立即處理圖片就開啟工具；規則不清楚時，先讀對應文章再操作。'
  }
} as const satisfies Record<PublishedLocale, Record<string, string>>;

export function articleMeta(slug: string) {
  return blogArticleMeta[slug] ?? blogArticleMeta['compress-without-changing-dimensions'];
}

export function localizedBlogPath(locale: PublishedLocale, path = '/blog/') {
  return locale === 'en' ? path : `/${locale}${path}`;
}
