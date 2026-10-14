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
    en: ['image compressor', 'compress image 10 KB 5 MB', 'JPG PNG WebP compressor'],
    'zh-cn': ['图片压缩工具', '压缩图片 10 KB 到 5 MB', '压缩 JPG PNG WebP'],
    'zh-tw': ['圖片壓縮工具', '壓縮圖片 10 KB 到 5 MB', '壓縮 JPG PNG WebP']
  }],
  [/^\/compress-png\/$/, {
    en: ['lossless PNG compressor', 'batch PNG optimizer', 'compress PNG preserve transparency'],
    'zh-cn': ['PNG 无损压缩', '批量 PNG 优化', '压缩 PNG 保留透明度'],
    'zh-tw': ['PNG 無損壓縮', '批次 PNG 最佳化', '壓縮 PNG 保留透明度']
  }],
  [/^\/signature-resizer\/$/, {
    en: ['signature resizer', 'resize signature image', 'signature image size', 'signature cropper'],
    'zh-cn': ['签名图片缩放', '调整签名图片尺寸', '签名图片裁剪'],
    'zh-tw': ['簽名圖片縮放', '調整簽名圖片尺寸', '簽名圖片裁切']
  }],
  [/^\/signature-compressor\/$/, {
    en: ['signature compressor', 'compress signature image', 'reduce signature image size', 'signature JPEG compressor'],
    'zh-cn': ['签名图片压缩', '压缩签名图片', '减小签名图片大小'],
    'zh-tw': ['簽名圖片壓縮', '壓縮簽名圖片', '縮小簽名圖片大小']
  }],
  [/^\/aspect-ratio-calculator\/$/, {
    en: ['aspect ratio calculator', 'image aspect ratio', 'calculate image dimensions'],
    'zh-cn': ['图片宽高比计算器', '图片比例计算', '计算图片尺寸'],
    'zh-tw': ['圖片長寬比計算器', '圖片比例計算', '計算圖片尺寸']
  }],
  [/^\/ppi-calculator\/$/, {
    en: ['PPI calculator', 'pixels per inch calculator', 'print size resolution'],
    'zh-cn': ['PPI 计算器', '每英寸像素计算', '打印尺寸分辨率'],
    'zh-tw': ['PPI 計算器', '每英吋像素計算', '列印尺寸解析度']
  }],
  [/^\/photo-resizer\/$/, {
    en: ['photo resizer', 'photo size in mm', 'photo size in inches', 'DPI photo resize'],
    'zh-cn': ['照片尺寸调整', '毫米照片尺寸', '英寸照片尺寸', 'DPI 照片调整'],
    'zh-tw': ['相片尺寸調整', '毫米相片尺寸', '英吋相片尺寸', 'DPI 相片調整']
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
