import type { Locale } from './locales';

type KeywordSet = Partial<Record<Locale, string[]>>;

const MAX_KEYWORDS_LENGTH = 100;
const MAX_KEYWORD_TERMS = 6;

const shared: KeywordSet = {
  en: ['PixelTokb', 'private browser image processing'],
  'zh-cn': ['PixelTokb', '浏览器本地图片处理'],
  'zh-tw': ['PixelTokb', '瀏覽器本機圖片處理']
};

/**
 * Every currently published, indexable base route has its own keyword profile.
 * Locale-prefixed routes reuse the same intent with language-native wording.
 * Titles and visible copy remain the primary search signals; these terms keep
 * other parsers aligned without turning the page into a keyword list.
 */
const exactRouteTerms: Record<string, KeywordSet> = {
  '/': {
    en: ['image size reducer online', 'compress image online', 'resize image to exact KB', 'compress image to 20KB', 'compress image to 50KB', 'compress image to 100KB', 'image resizer', 'crop image online'],
    'zh-cn': ['在线图片大小压缩', '在线压缩图片', '将图片压缩到指定 KB', '压缩图片到 20KB', '压缩图片到 50KB', '压缩图片到 100KB', '图片缩放工具', '在线裁剪图片'],
    'zh-tw': ['線上圖片大小壓縮', '線上壓縮圖片', '將圖片壓縮到指定 KB', '壓縮圖片到 20KB', '壓縮圖片到 50KB', '壓縮圖片到 100KB', '圖片縮放工具', '線上裁切圖片']
  },
  '/tools/': {
    en: ['online image tools', 'browser image tools', 'image compressor', 'image resizer', 'image cropper', 'image metadata checker'],
    'zh-cn': ['在线图片工具', '浏览器图片工具', '图片压缩工具', '图片缩放工具', '图片裁剪工具', '图片信息检查'],
    'zh-tw': ['線上圖片工具', '瀏覽器圖片工具', '圖片壓縮工具', '圖片縮放工具', '圖片裁切工具', '圖片資訊檢查']
  },
  '/tools/compress/': {
    en: ['image compression tools', 'compress image to KB', 'lossless PNG optimizer', 'signature compressor', 'increase JPEG file size'],
    'zh-cn': ['图片压缩工具', '压缩图片到指定 KB', 'PNG 无损优化', '签名图片压缩', '增大 JPEG 文件体积'],
    'zh-tw': ['圖片壓縮工具', '壓縮圖片到指定 KB', 'PNG 無損最佳化', '簽名圖片壓縮', '增加 JPEG 檔案容量']
  },
  '/tools/resize/': {
    en: ['image resize and crop tools', 'resize image by pixels', 'crop image online', 'photo resizer', 'signature resizer'],
    'zh-cn': ['图片缩放与裁剪工具', '按像素缩放图片', '在线裁剪图片', '照片尺寸调整', '签名图片缩放'],
    'zh-tw': ['圖片縮放與裁切工具', '依像素縮放圖片', '線上裁切圖片', '相片尺寸調整', '簽名圖片縮放']
  },
  '/tools/forms/': {
    en: ['form image preparation tools', 'photo and signature merger', 'signature background remover', 'print photo sheet PDF', 'photo upload preparation'],
    'zh-cn': ['表单图片处理工具', '照片与签名合并', '签名背景去除', '照片纸 PDF', '上传图片准备'],
    'zh-tw': ['表單圖片處理工具', '相片與簽名合併', '簽名背景移除', '相片紙 PDF', '上傳圖片準備']
  },
  '/tools/inspect/': {
    en: ['image inspection tools', 'image size checker', 'image DPI checker', 'aspect ratio calculator', 'PPI calculator'],
    'zh-cn': ['图片检查工具', '图片大小检查', '图片 DPI 检查', '宽高比计算器', 'PPI 计算器'],
    'zh-tw': ['圖片檢查工具', '圖片大小檢查', '圖片 DPI 檢查', '長寬比計算器', 'PPI 計算器']
  },
  '/compress-image/': {
    en: ['compress image to 20KB', 'compress image to 50KB', 'compress image to 100KB', 'resize image to exact KB', 'image size reducer online', 'custom KB image compressor', 'JPEG PNG WebP compressor', 'exact byte size checker'],
    'zh-cn': ['压缩图片到 20KB', '压缩图片到 50KB', '压缩图片到 100KB', '压缩图片到指定 KB', '在线图片大小压缩', '自定义 KB 图片压缩', '压缩 JPEG PNG WebP', '精确字节检查'],
    'zh-tw': ['壓縮圖片到 20KB', '壓縮圖片到 50KB', '壓縮圖片到 100KB', '壓縮圖片到指定 KB', '線上圖片大小壓縮', '自訂 KB 圖片壓縮', '壓縮 JPEG PNG WebP', '實際位元組檢查']
  },
  '/compress-png/': {
    en: ['lossless PNG compressor', 'batch PNG optimizer', 'compress PNG preserve transparency', 'reduce PNG file size', 'PNG optimizer online'],
    'zh-cn': ['PNG 无损压缩', '批量 PNG 优化', '压缩 PNG 保留透明度', '减小 PNG 文件体积', '在线 PNG 优化'],
    'zh-tw': ['PNG 無損壓縮', '批次 PNG 最佳化', '壓縮 PNG 保留透明度', '縮小 PNG 檔案容量', '線上 PNG 最佳化']
  },
  '/signature-resizer/': {
    en: ['signature resizer', 'resize signature image', 'signature image size', 'signature cropper', 'signature pixel dimensions'],
    'zh-cn': ['签名图片缩放', '调整签名图片尺寸', '签名图片裁剪', '签名像素尺寸'],
    'zh-tw': ['簽名圖片縮放', '調整簽名圖片尺寸', '簽名圖片裁切', '簽名像素尺寸']
  },
  '/signature-compressor/': {
    en: ['signature compressor', 'compress signature image', 'reduce signature image size', 'signature JPEG compressor', 'signature file size limit'],
    'zh-cn': ['签名图片压缩', '压缩签名图片', '减小签名图片大小', '签名 JPEG 压缩', '签名文件大小限制'],
    'zh-tw': ['簽名圖片壓縮', '壓縮簽名圖片', '縮小簽名圖片大小', '簽名 JPEG 壓縮', '簽名檔案大小限制']
  },
  '/signature-background-remover/': {
    en: ['signature background remover', 'transparent signature PNG', 'remove white background', 'signature PNG', 'flat background remover', 'make signature background transparent'],
    'zh-cn': ['签名背景去除', '去除签名白色背景', '透明签名 PNG', '去除单色背景', '签名背景透明'],
    'zh-tw': ['簽名背景移除', '移除簽名白色背景', '透明簽名 PNG', '移除單色背景', '簽名背景透明']
  },
  '/photo-signature-merger/': {
    en: ['photo and signature merger', 'merge photo and signature', 'combine photo and signature PNG', 'photo signature upload image', 'horizontal vertical image merger'],
    'zh-cn': ['照片与签名合并', '合并照片和签名', '照片签名 PNG', '照片签名上传图片', '横向纵向图片合并'],
    'zh-tw': ['相片與簽名合併', '合併相片和簽名', '相片簽名 PNG', '相片簽名上傳圖片', '橫向直向圖片合併']
  },
  '/print-photo-sheet/': {
    en: ['print photo sheet PDF', 'A4 photo sheet maker', 'Letter photo sheet PDF', 'multiple photos on one page', 'photo print layout'],
    'zh-cn': ['照片纸 PDF', 'A4 照片排版', 'Letter 照片纸 PDF', '一页打印多张照片', '照片打印排版'],
    'zh-tw': ['相片紙 PDF', 'A4 相片排版', 'Letter 相片紙 PDF', '一頁列印多張相片', '相片列印排版']
  },
  '/increase-image-size/': {
    en: ['increase JPEG file size', 'increase image KB', 'make JPEG file larger', 'minimum upload file size', 'JPEG comment padding'],
    'zh-cn': ['增大 JPEG 文件体积', '增加图片 KB', '扩大 JPEG 文件大小', '最小上传文件体积', 'JPEG 注释填充'],
    'zh-tw': ['增加 JPEG 檔案容量', '增加圖片 KB', '擴大 JPEG 檔案大小', '最小上傳檔案容量', 'JPEG 註解填充']
  },
  '/aspect-ratio-calculator/': {
    en: ['aspect ratio calculator', 'image aspect ratio', 'calculate image dimensions', 'width height ratio', 'matching pixel dimensions'],
    'zh-cn': ['图片宽高比计算器', '图片比例计算', '计算图片尺寸', '宽度高度比例', '匹配像素尺寸'],
    'zh-tw': ['圖片長寬比計算器', '圖片比例計算', '計算圖片尺寸', '寬度高度比例', '相符像素尺寸']
  },
  '/ppi-calculator/': {
    en: ['PPI calculator', 'pixels per inch calculator', 'print size resolution', 'image print PPI', 'pixel density calculator'],
    'zh-cn': ['PPI 计算器', '每英寸像素计算', '打印尺寸分辨率', '图片打印 PPI', '像素密度计算'],
    'zh-tw': ['PPI 計算器', '每英吋像素計算', '列印尺寸解析度', '圖片列印 PPI', '像素密度計算']
  },
  '/photo-resizer/': {
    en: ['photo resizer', 'photo size in mm', 'photo size in inches', 'DPI photo resize', 'physical print size', 'resize photo for printing'],
    'zh-cn': ['照片尺寸调整', '毫米照片尺寸', '英寸照片尺寸', 'DPI 照片调整', '照片打印尺寸', '打印照片缩放'],
    'zh-tw': ['相片尺寸調整', '毫米相片尺寸', '英吋相片尺寸', 'DPI 相片調整', '相片列印尺寸', '列印相片縮放']
  },
  '/resize-image/': {
    en: ['image resizer', 'resize image online', 'resize image in pixels', 'resize JPEG PNG WebP', 'image aspect ratio resizer', 'resize image without cropping', 'fit fill stretch image'],
    'zh-cn': ['图片缩放工具', '在线调整图片尺寸', '按像素缩放图片', '缩放 JPEG PNG WebP', '图片宽高比缩放', '不裁剪缩放图片', '适应填充拉伸图片'],
    'zh-tw': ['圖片縮放工具', '線上調整圖片尺寸', '依像素縮放圖片', '縮放 JPEG PNG WebP', '圖片長寬比縮放', '不裁切縮放圖片', '適應填滿拉伸圖片']
  },
  '/crop-image/': {
    en: ['image cropper', 'crop image online', 'crop image by pixels', 'crop JPEG PNG WebP', 'rectangle image cropper', 'exact pixel crop'],
    'zh-cn': ['图片裁剪工具', '在线裁剪图片', '按像素裁剪图片', '裁剪 JPEG PNG WebP', '矩形图片裁剪', '精确像素裁剪'],
    'zh-tw': ['圖片裁切工具', '線上裁切圖片', '依像素裁切圖片', '裁切 JPEG PNG WebP', '矩形圖片裁切', '精確像素裁切']
  },
  '/image-size-checker/': {
    en: ['image size checker', 'image dimensions checker', 'image resolution checker', 'image aspect ratio finder', 'image format checker', 'PNG transparency checker', 'check image bytes KB KiB'],
    'zh-cn': ['图片大小检查', '图片尺寸检查', '图片分辨率检查', '图片宽高比检查', '图片格式检查', 'PNG 透明度检查', '检查图片字节 KB KiB'],
    'zh-tw': ['圖片大小檢查', '圖片尺寸檢查', '圖片解析度檢查', '圖片長寬比檢查', '圖片格式檢查', 'PNG 透明度檢查', '檢查圖片位元組 KB KiB']
  },
  '/image-dpi-checker/': {
    en: ['DPI checker', 'image DPI checker', 'check image DPI', 'image print metadata', 'read JPEG PNG DPI', 'image pixel dimensions'],
    'zh-cn': ['图片 DPI 检查', '查看图片 DPI', '图片打印元数据', '读取 JPEG PNG DPI', '图片像素尺寸'],
    'zh-tw': ['圖片 DPI 檢查', '查看圖片 DPI', '圖片列印中繼資料', '讀取 JPEG PNG DPI', '圖片像素尺寸']
  },
  '/blog/': {
    en: ['image compression guides', 'image resizing tutorials', 'image file size help', 'image DPI guides', 'browser image workflows', 'upload limit troubleshooting'],
    'zh-cn': ['图片压缩指南', '图片缩放教程', '图片文件大小', '图片 DPI 指南', '浏览器图片处理流程', '上传限制排查'],
    'zh-tw': ['圖片壓縮指南', '圖片縮放教學', '圖片檔案大小', '圖片 DPI 指南', '瀏覽器圖片處理流程', '上傳限制排解']
  },
  '/blog/category/tutorials/': {
    en: ['image tutorials', 'image compression tutorials', 'image resizing guides', 'image DPI tutorials', 'image file size guides'],
    'zh-cn': ['图片教程', '图片压缩教程', '图片缩放指南', '图片 DPI 教程', '图片文件大小指南'],
    'zh-tw': ['圖片教學', '圖片壓縮教學', '圖片縮放指南', '圖片 DPI 教學', '圖片檔案大小指南']
  },
  '/blog/category/troubleshooting/': {
    en: ['image compression troubleshooting', 'image upload limit help', 'cannot compress image', 'image file size problems', 'image format troubleshooting'],
    'zh-cn': ['图片压缩问题排查', '图片上传限制帮助', '图片无法压缩', '图片文件大小问题', '图片格式排查'],
    'zh-tw': ['圖片壓縮問題排解', '圖片上傳限制協助', '圖片無法壓縮', '圖片檔案大小問題', '圖片格式排解']
  },
  '/blog/compress-without-changing-dimensions/': {
    en: ['compress without resizing', 'keep image dimensions', 'reduce image file size', 'same pixel dimensions', 'compress JPEG by quality'],
    'zh-cn': ['不改变尺寸压缩图片', '不缩放减小图片体积', '保持像素压缩图片', '不改变像素压缩 JPEG', '不缩放压缩 WebP'],
    'zh-tw': ['不改變尺寸壓縮圖片', '不縮放減少圖片容量', '維持像素壓縮圖片', '不改變像素壓縮 JPEG', '不縮放壓縮 WebP']
  },
  '/blog/why-image-wont-fit-50kb/': {
    en: ['why image will not compress to 50KB', 'compress image to 50KB', '50KB image limit', 'image compression target unreachable', 'reduce image below 50KB'],
    'zh-cn': ['为什么图片无法压到 50KB', '压缩图片到 50KB', '50KB 图片限制', '图片压缩目标无法达到', '将图片减小到 50KB 以下'],
    'zh-tw': ['為什麼圖片無法壓到 50KB', '壓縮圖片到 50KB', '50KB 圖片限制', '圖片壓縮目標無法達到', '將圖片縮小到 50KB 以下']
  },
  '/blog/kb-vs-kib/': {
    en: ['KB vs KiB', 'KB to KiB', 'image file size units', 'upload size limit bytes', '1000 vs 1024 bytes'],
    'zh-cn': ['KB 与 KiB 区别', 'KB 转 KiB', '图片文件大小单位', '上传大小限制字节', '1000 与 1024 字节'],
    'zh-tw': ['KB 與 KiB 差異', 'KB 轉 KiB', '圖片檔案大小單位', '上傳大小限制位元組', '1000 與 1024 位元組']
  },
  '/blog/check-image-size-and-dpi/': {
    en: ['check image size and DPI', 'image dimensions checker', 'check image file size', 'read image DPI', 'image metadata guide'],
    'zh-cn': ['检查图片大小和 DPI', '图片尺寸检查', '检查图片文件大小', '读取图片 DPI', '图片元数据指南'],
    'zh-tw': ['檢查圖片大小和 DPI', '圖片尺寸檢查', '檢查圖片檔案大小', '讀取圖片 DPI', '圖片中繼資料指南']
  },
  '/blog/compress-image-to-100kb/': {
    en: ['compress image to 100KB', '100KB image upload', 'reduce image below 100KB', 'verify image file size', '100000 byte image limit'],
    'zh-cn': ['压缩图片到 100KB', '100KB 图片上传', '将图片减小到 100KB 以下', '验证图片文件大小', '100000 字节图片限制'],
    'zh-tw': ['壓縮圖片到 100KB', '100KB 圖片上傳', '將圖片縮小到 100KB 以下', '驗證圖片檔案大小', '100000 位元組圖片限制']
  },
  '/about/': {
    en: ['about PixelTokb', 'browser image tools', 'local image processing', 'private image tools', 'online image utility'],
    'zh-cn': ['关于 PixelTokb', '浏览器图片工具', '本地图片处理', '隐私图片工具', '在线图片实用工具'],
    'zh-tw': ['關於 PixelTokb', '瀏覽器圖片工具', '本機圖片處理', '隱私圖片工具', '線上圖片實用工具']
  },
  '/contact/': {
    en: ['contact PixelTokb', 'PixelTokb support', 'report a site issue', 'privacy request', 'content correction'],
    'zh-cn': ['联系 PixelTokb', 'PixelTokb 支持', '报告网站问题', '隐私请求', '内容纠错'],
    'zh-tw': ['聯絡 PixelTokb', 'PixelTokb 支援', '回報網站問題', '隱私請求', '內容更正']
  },
  '/privacy/': {
    en: ['PixelTokb privacy policy', 'local image processing privacy', 'image upload privacy', 'browser storage privacy', 'advertising privacy'],
    'zh-cn': ['PixelTokb 隐私政策', '本地图片处理隐私', '图片上传隐私', '浏览器存储隐私', '广告隐私'],
    'zh-tw': ['PixelTokb 隱私權政策', '本機圖片處理隱私', '圖片上傳隱私', '瀏覽器儲存隱私', '廣告隱私']
  },
  '/terms/': {
    en: ['PixelTokb terms of use', 'image tool terms', 'user responsibilities', 'service limitations', 'liability boundaries'],
    'zh-cn': ['PixelTokb 使用条款', '图片工具条款', '用户责任', '服务限制', '责任边界'],
    'zh-tw': ['PixelTokb 使用條款', '圖片工具條款', '使用者責任', '服務限制', '責任界線']
  },
  '/cookies/': {
    en: ['PixelTokb cookie policy', 'cookie consent', 'privacy settings', 'local storage preferences', 'advertising cookies'],
    'zh-cn': ['PixelTokb Cookie 政策', 'Cookie 同意', '隐私设置', '本地存储偏好', '广告 Cookie'],
    'zh-tw': ['PixelTokb Cookie 政策', 'Cookie 同意', '隱私設定', '本機儲存偏好', '廣告 Cookie']
  },
  '/editorial-policy/': {
    en: ['PixelTokb editorial policy', 'content review standards', 'correction policy', 'reproducible image tests', 'AI assisted content disclosure'],
    'zh-cn': ['PixelTokb 编辑政策', '内容审核标准', '纠错政策', '可复现图片测试', 'AI 辅助内容披露'],
    'zh-tw': ['PixelTokb 編輯政策', '內容審核標準', '更正政策', '可重現圖片測試', 'AI 輔助內容揭露']
  },
  '/how-it-works/': {
    en: ['how PixelTokb works', 'browser image processing', 'local image compression', 'Web Worker image tools', 'exact byte validation', 'no image upload'],
    'zh-cn': ['PixelTokb 工作原理', '浏览器图片处理', '本地图片压缩', 'Web Worker 图片工具', '精确字节验证', '无需上传图片'],
    'zh-tw': ['PixelTokb 運作方式', '瀏覽器圖片處理', '本機圖片壓縮', 'Web Worker 圖片工具', '實際位元組驗證', '無需上傳圖片']
  },
  '/faq/': {
    en: ['PixelTokb FAQ', 'image compression FAQ', 'KB vs KiB questions', 'exact KB compression help', 'image DPI questions'],
    'zh-cn': ['PixelTokb 常见问题', '图片压缩常见问题', 'KB 与 KiB 问题', '精确 KB 压缩帮助', '图片 DPI 问题'],
    'zh-tw': ['PixelTokb 常見問題', '圖片壓縮常見問題', 'KB 與 KiB 問題', '精確 KB 壓縮協助', '圖片 DPI 問題']
  },
  '/changelog/': {
    en: ['PixelTokb changelog', 'PixelTokb product updates', 'new image tools', 'image tool improvements', 'PixelTokb release notes', 'feature updates'],
    'zh-cn': ['PixelTokb 更新记录', 'PixelTokb 产品更新', '新增图片工具', '图片工具改进', 'PixelTokb 发布记录', '功能更新'],
    'zh-tw': ['PixelTokb 更新記錄', 'PixelTokb 產品更新', '新增圖片工具', '圖片工具改進', 'PixelTokb 發佈記錄', '功能更新']
  },
  '/authors/editor/': {
    en: ['PixelTokb editorial team', 'PixelTokb editor', 'image guide reviewer', 'editorial accountability', 'content corrections'],
    'zh-cn': ['PixelTokb 编辑团队', 'PixelTokb 审核人', '图片指南审核', '编辑责任', '内容纠错'],
    'zh-tw': ['PixelTokb 編輯團隊', 'PixelTokb 審核人', '圖片指南審核', '編輯責任', '內容更正']
  }
};

const familyTerms: Array<[RegExp, KeywordSet]> = [
  [/^\/blog\/(?!category\/)/, {
    en: ['image guide', 'image compression guide', 'image file size help'],
    'zh-cn': ['图片指南', '图片压缩指南', '图片文件大小帮助'],
    'zh-tw': ['圖片指南', '圖片壓縮指南', '圖片檔案大小協助']
  }],
  [/^\/tools(?:\/|$)/, {
    en: ['online image tools', 'image compressor', 'image resizer', 'image checker'],
    'zh-cn': ['在线图片工具', '图片压缩工具', '图片缩放工具', '图片检查工具'],
    'zh-tw': ['線上圖片工具', '圖片壓縮工具', '圖片縮放工具', '圖片檢查工具']
  }]
];

const fallback: KeywordSet = {
  en: ['online image tools', 'image compression', 'image resizing', 'image privacy'],
  'zh-cn': ['在线图片工具', '图片压缩', '图片缩放', '图片隐私'],
  'zh-tw': ['線上圖片工具', '圖片壓縮', '圖片縮放', '圖片隱私']
};

function normalizedContentPath(pathname: string) {
  const withoutLocale = pathname.replace(/^\/(zh-cn|zh-tw)(?=\/|$)/, '') || '/';
  return withoutLocale === '/' ? '/' : `${withoutLocale.replace(/\/+$/, '')}/`;
}

function termsForPath(pathname: string, locale: Locale) {
  const exact = exactRouteTerms[pathname];
  if (exact) return exact[locale] ?? exact.en ?? [];
  const family = familyTerms.find(([pattern]) => pattern.test(pathname))?.[1];
  return family?.[locale] ?? family?.en ?? fallback[locale] ?? fallback.en ?? [];
}

export function hasSeoKeywordProfile(pathname: string) {
  return Boolean(exactRouteTerms[normalizedContentPath(pathname)]);
}

export function seoKeywords(pathname: string, locale: Locale, title: string) {
  const normalized = normalizedContentPath(pathname);
  const routeSpecific = termsForPath(normalized, locale);
  const sharedTerms = shared[locale] ?? shared.en ?? [];
  const candidates = exactRouteTerms[normalized]
    ? [...routeSpecific, title, ...sharedTerms]
    : [title, ...routeSpecific, ...sharedTerms];
  const focused: string[] = [];
  const seen = new Set<string>();

  for (const rawTerm of candidates) {
    const term = rawTerm.trim();
    const identity = term.toLocaleLowerCase(locale);
    if (!term || seen.has(identity)) continue;
    const candidate = [...focused, term].join(', ');
    if (candidate.length <= MAX_KEYWORDS_LENGTH && focused.length < MAX_KEYWORD_TERMS) {
      focused.push(term);
      seen.add(identity);
    }
  }
  return focused.join(', ');
}
