import type { Locale } from './locales';

const shared: Partial<Record<Locale, string[]>> = {
  en: ['PixelTokb', 'browser image tools', 'private image processing'],
  'zh-cn': ['PixelTokb', '在线图片工具', '浏览器本地图片处理', '隐私优先'],
  'zh-tw': ['PixelTokb', '線上圖片工具', '瀏覽器本機圖片處理', '隱私優先']
};

const routeTerms: Array<[RegExp, Partial<Record<Locale, string[]>>]> = [
  [/^\/$/, {
    en: ['compress image to target size', 'compress image to KB', 'image compressor'],
    'zh-cn': ['按目标大小压缩图片', '压缩图片到指定 KB', '图片压缩工具'],
    'zh-tw': ['依目標大小壓縮圖片', '壓縮圖片到指定 KB', '圖片壓縮工具']
  }],
  [/^\/compress-image(?:-|\/)/, {
    en: ['compress image to target size', 'compress JPEG PNG WebP', 'reduce image file size'],
    'zh-cn': ['按目标大小压缩图片', '压缩 JPEG PNG WebP', '减小图片文件大小'],
    'zh-tw': ['依目標大小壓縮圖片', '壓縮 JPEG PNG WebP', '縮小圖片檔案']
  }],
  [/^\/resize-image\/$/, {
    en: ['image resizer', 'resize image pixels', 'change image dimensions'],
    'zh-cn': ['图片缩放工具', '修改图片像素', '调整图片尺寸'],
    'zh-tw': ['圖片縮放工具', '修改圖片像素', '調整圖片尺寸']
  }],
  [/^\/crop-image\/$/, {
    en: ['crop image online', 'crop image by pixels', 'image crop tool'],
    'zh-cn': ['在线裁剪图片', '按像素裁剪图片', '图片裁剪工具'],
    'zh-tw': ['線上裁切圖片', '依像素裁切圖片', '圖片裁切工具']
  }],
  [/^\/image-size-checker\/$/, {
    en: ['image size checker', 'check image dimensions', 'image file size'],
    'zh-cn': ['图片大小检查', '查看图片尺寸', '图片文件大小'],
    'zh-tw': ['圖片大小檢查', '查看圖片尺寸', '圖片檔案大小']
  }],
  [/^\/image-dpi-checker\/$/, {
    en: ['image DPI checker', 'check image DPI', 'image print metadata'],
    'zh-cn': ['图片 DPI 检查', '查看图片 DPI', '图片打印元数据'],
    'zh-tw': ['圖片 DPI 檢查', '查看圖片 DPI', '圖片列印中繼資料']
  }],
  [/^\/tools(?:\/|$)/, {
    en: ['image compressor', 'image resizer', 'image crop tool', 'image metadata checker'],
    'zh-cn': ['图片压缩', '图片缩放', '图片裁剪', '图片信息检查'],
    'zh-tw': ['圖片壓縮', '圖片縮放', '圖片裁切', '圖片資訊檢查']
  }],
  [/^\/blog(?:\/|$)/, {
    en: ['image compression guide', 'image size guide', 'image DPI guide'],
    'zh-cn': ['图片压缩指南', '图片大小指南', '图片 DPI 指南'],
    'zh-tw': ['圖片壓縮指南', '圖片大小指南', '圖片 DPI 指南']
  }]
];

const fallback: Partial<Record<Locale, string[]>> = {
  en: ['image compression', 'image resizing', 'image privacy'],
  'zh-cn': ['图片压缩', '图片缩放', '图片隐私'],
  'zh-tw': ['圖片壓縮', '圖片縮放', '圖片隱私']
};

export function seoKeywords(pathname: string, locale: Locale, title: string) {
  const normalized = pathname.replace(/^\/(zh-cn|zh-tw)(?=\/|$)/, '') || '/';
  const routeSpecific = routeTerms.find(([pattern]) => pattern.test(normalized))?.[1][locale] ?? fallback[locale] ?? fallback.en ?? [];
  const sharedTerms = shared[locale] ?? shared.en ?? [];
  return [...new Set([title, ...routeSpecific, ...sharedTerms])].join(', ');
}
