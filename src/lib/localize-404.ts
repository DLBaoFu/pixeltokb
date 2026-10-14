import { compressionGroupOrder, compressionGroups } from './compression-groups';
import { layoutCopy } from './locales';

type FallbackLocale = 'zh-cn' | 'zh-tw';

const pageCopy = {
  'zh-cn': { title: '页面未找到', description: '请求的 pixeltokb 页面不存在。', intro: '你访问的页面不存在。可以从这里返回图片工具。', browse: '浏览图片工具 →', home: '返回首页' },
  'zh-tw': { title: '找不到頁面', description: '找不到你要求的 pixeltokb 頁面。', intro: '你要求的頁面不存在。可以從這裡返回圖片工具。', browse: '瀏覽圖片工具 →', home: '返回首頁' }
};

const footerToolCopy = {
  'zh-cn': ['压缩图片', 'PNG 无损优化', '签名图片缩放', '签名图片压缩', '图片宽高比计算器', 'PPI 计算器', '打印尺寸照片调整', '缩放图片', '裁剪图片', '图片大小检查', 'DPI 检查'],
  'zh-tw': ['壓縮圖片', 'PNG 無損最佳化', '簽名圖片縮放', '簽名圖片壓縮', '圖片長寬比計算器', 'PPI 計算器', '列印尺寸相片調整', '縮放圖片', '裁切圖片', '圖片大小檢查', 'DPI 檢查']
} as const;

export function localize404() {
  const match = location.pathname.match(/^\/(zh-cn|zh-tw)(?:\/|$)/);
  if (!match) return;
  const locale = match[1] as FallbackLocale;
  const copy = layoutCopy[locale];
  const page = pageCopy[locale];
  const nav = document.querySelector('.site-header nav');
  const footer = document.querySelector('.site-footer');
  const language = document.querySelector('.language-menu');
  const theme = document.querySelector('.theme-picker');
  const headerBrand = document.querySelector('.site-header .brand');
  if (!nav || !footer || !language || !theme || !headerBrand) return;
  const setText = (element: Element | undefined | null, value: string) => { if (element) element.textContent = value; };
  const prefix = (path: string | null) => path === '/' ? `/${locale}/` : `/${locale}${path ?? '/'}`;

  document.documentElement.lang = locale === 'zh-cn' ? 'zh-CN' : 'zh-TW';
  document.documentElement.dataset.locale = locale;
  document.title = `${page.title} | pixeltokb`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
  setText(document.querySelector('.not-found h1'), page.title);
  setText(document.querySelector('.not-found .hero > p:not(.eyebrow)'), page.intro);
  const actions = document.querySelectorAll('.not-found .foundation-next a');
  [page.browse, page.home].forEach((label, index) => setText(actions[index], label));
  actions.forEach((link) => link.setAttribute('href', prefix(link.getAttribute('href'))));

  nav.setAttribute('aria-label', locale === 'zh-cn' ? '主导航' : '主導覽');
  [copy.navTools, copy.navBlog, copy.navPrivacy].forEach((label, index) => setText(nav.querySelectorAll('a')[index], label));
  headerBrand.setAttribute('aria-label', copy.home);
  headerBrand.setAttribute('href', prefix('/'));
  language.querySelector('summary')?.setAttribute('aria-label', copy.language);
  setText(language.querySelector('summary span:nth-of-type(2)'), copy.localeNames[locale]);
  language.querySelectorAll('div a').forEach((link) => {
    const target = link.getAttribute('lang') === 'en' ? 'en' : link.getAttribute('lang') === 'zh-CN' ? 'zh-cn' : 'zh-tw';
    setText(link, copy.localeNames[target]);
    link.setAttribute('href', target === 'en' ? '/' : `/${target}/`);
    if (target === locale) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  theme.setAttribute('aria-label', copy.theme);
  [copy.light, copy.system, copy.dark].forEach((label, index) => {
    const button = theme.querySelectorAll('button')[index];
    button?.setAttribute('aria-label', label);
    setText(button?.querySelector('span'), label);
  });

  const sections = footer.querySelectorAll('.footer-grid section');
  setText(sections[0]?.querySelector('p'), copy.footerTagline);
  [copy.footerTools, copy.footerSizes, copy.footerResources, copy.footerCompany].forEach((label, index) => setText(sections[index + 1]?.querySelector('h2'), label));
  footerToolCopy[locale].forEach((label, index) => setText(sections[1]?.querySelectorAll('a')[index], label));
  compressionGroupOrder.forEach((group, index) => setText(sections[2]?.querySelectorAll('a')[index], copy.compressTo(compressionGroups[group].label)));
  [copy.blog, copy.privacy, copy.how].forEach((label, index) => setText(sections[3]?.querySelectorAll('a')[index], label));
  [copy.about, copy.contact, copy.terms].forEach((label, index) => setText(sections[4]?.querySelectorAll('a')[index], label));
  setText(footer.querySelector('.footer-bottom span:first-child'), `© 2026 pixeltokb. ${copy.allRights}`);
  [copy.privacy, copy.contact].forEach((label, index) => setText(footer.querySelectorAll('.footer-bottom span:last-child a')[index], label));
  footer.querySelectorAll('a').forEach((link) => link.setAttribute('href', prefix(link.getAttribute('href'))));
  nav.querySelectorAll('a').forEach((link) => link.setAttribute('href', prefix(link.getAttribute('href'))));
  try { localStorage.setItem('pixeltokb-locale', locale); } catch {}
}
