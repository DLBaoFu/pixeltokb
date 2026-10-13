import type { Locale } from './locales';

const shared: Partial<Record<Locale, string[]>> = {
  en: ['PixelTokb', 'private image processing'],
  'zh-cn': ['PixelTokb', '浏览器本地图片处理'],
  'zh-tw': ['PixelTokb', '瀏覽器本機圖片處理']
};

const routeTerms: Array<[RegExp, Partial<Record<Locale, string[]>>]> = [
  [/^\/$/, {
    en: ['image compressor', 'compress image online', 'compress image to exact size', 'compress image to KB', 'image size reducer to exact KB', 'image resizer', 'crop image online'],
    'zh-cn': ['图片压缩工具', '在线压缩图片', '压缩图片到精确大小', '压缩图片到指定 KB', '图片大小压缩', '图片缩放工具', '在线裁剪图片'],
    'zh-tw': ['圖片壓縮工具', '線上壓縮圖片', '壓縮圖片到精確大小', '壓縮圖片到指定 KB', '圖片大小壓縮', '圖片縮放工具', '線上裁切圖片']
  }],
  [/^\/compress-image\/$/, {
    en: ['image compressor', 'compress image online', 'compress image to exact size', 'compress image to 10–100 KB', 'JPG PNG WebP compressor'],
    'zh-cn': ['图片压缩工具', '在线压缩图片', '精确 KB 图片压缩', '压缩图片到 10–100 KB', '压缩 JPG PNG WebP'],
    'zh-tw': ['圖片壓縮工具', '線上壓縮圖片', '精確 KB 圖片壓縮', '壓縮圖片到 10–100 KB', '壓縮 JPG PNG WebP']
  }],
  [/^\/compress-image-200kb-to-500kb\/$/, {
    en: ['compress image to 200KB', 'compress image to 300KB', 'compress image to 400KB', 'compress image to 500KB', 'image under 500KB', 'image compressor online'],
    'zh-cn': ['压缩图片到 200KB', '压缩图片到 300KB', '压缩图片到 400KB', '压缩图片到 500KB', '图片小于 500KB'],
    'zh-tw': ['壓縮圖片到 200KB', '壓縮圖片到 300KB', '壓縮圖片到 400KB', '壓縮圖片到 500KB', '圖片小於 500KB']
  }],
  [/^\/compress-image-500kb-to-1mb\/$/, {
    en: ['compress image to 500KB', 'compress image to 750KB', 'compress image to 1MB', 'reduce image below 1MB', 'image compressor online'],
    'zh-cn': ['压缩图片到 500KB', '压缩图片到 750KB', '压缩图片到 1MB', '图片小于 1MB'],
    'zh-tw': ['壓縮圖片到 500KB', '壓縮圖片到 750KB', '壓縮圖片到 1MB', '圖片小於 1MB']
  }],
  [/^\/compress-image-2mb-to-5mb\/$/, {
    en: ['compress image to 2MB', 'compress image to 3MB', 'compress image to 4MB', 'compress image to 5MB', 'reduce photo to 5MB', 'image compressor online'],
    'zh-cn': ['压缩图片到 2MB', '压缩图片到 3MB', '压缩图片到 4MB', '压缩图片到 5MB', '图片小于 5MB'],
    'zh-tw': ['壓縮圖片到 2MB', '壓縮圖片到 3MB', '壓縮圖片到 4MB', '壓縮圖片到 5MB', '圖片小於 5MB']
  }],
  [/^\/resize-image\/$/, {
    en: ['image resizer', 'resize image online', 'resize image in pixels', 'resize JPG', 'resize PNG', 'resize WebP', 'image aspect ratio resizer', 'resize image without cropping'],
    'zh-cn': ['图片缩放工具', '在线调整图片尺寸', '按像素缩放图片', '缩放 JPG PNG WebP', '图片宽高比缩放', '不裁剪缩放图片'],
    'zh-tw': ['圖片縮放工具', '線上調整圖片尺寸', '依像素縮放圖片', '縮放 JPG PNG WebP', '圖片長寬比縮放', '不裁切縮放圖片']
  }],
  [/^\/crop-image\/$/, {
    en: ['image cropper', 'crop image online', 'crop image by pixels', 'crop JPG', 'crop PNG', 'crop WebP', 'rectangle image cropper'],
    'zh-cn': ['图片裁剪工具', '在线裁剪图片', '按像素裁剪图片', '裁剪 JPG PNG WebP', '矩形图片裁剪'],
    'zh-tw': ['圖片裁切工具', '線上裁切圖片', '依像素裁切圖片', '裁切 JPG PNG WebP', '矩形圖片裁切']
  }],
  [/^\/image-size-checker\/$/, {
    en: ['image size checker', 'image dimensions checker', 'image resolution checker', 'image aspect ratio finder', 'image format checker', 'PNG transparency checker'],
    'zh-cn': ['图片大小检查', '图片尺寸检查', '图片分辨率检查', '图片宽高比检查', '图片格式检查', 'PNG 透明度检查'],
    'zh-tw': ['圖片大小檢查', '圖片尺寸檢查', '圖片解析度檢查', '圖片長寬比檢查', '圖片格式檢查', 'PNG 透明度檢查']
  }],
  [/^\/image-dpi-checker\/$/, {
    en: ['DPI checker', 'image DPI checker', 'check image DPI', 'image resolution checker', 'image print metadata'],
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
  const focused: string[] = [];
  for (const term of new Set([...routeSpecific, ...sharedTerms, title])) {
    const candidate = [...focused, term].join(', ');
    if (candidate.length <= 100) focused.push(term);
  }
  return focused.join(', ');
}
