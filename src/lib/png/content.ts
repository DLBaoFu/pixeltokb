export type PngLocale = 'en' | 'zh-cn' | 'zh-tw';

type PngCopy = {
  pageTitle: string;
  pageDescription: string;
  eyebrow: string;
  toolLabel: string;
  uploadLabel: string;
  chooseLabel: string;
  drop: string;
  fileRule: string;
  methodHeading: string;
  local: string;
  outputLabel: string;
  outputValue: string;
  dimensionsLabel: string;
  dimensionsValue: string;
  verificationLabel: string;
  verificationValue: string;
  optimize: string;
  optimizing: string;
  cancel: string;
  idle: string;
  ready: (name: string, size: string) => string;
  changed: string;
  canceled: string;
  invalidType: string;
  tooLarge: string;
  genericError: string;
  rejectedOutput: string;
  noSaving: string;
  verificationFailed: string;
  metadataRetained: string;
  resultHeading: string;
  original: string;
  optimized: string;
  saving: string;
  dimensions: string;
  alpha: string;
  alphaKept: string;
  opaque: string;
  metadata: string;
  metadataRemoved: string;
  metadataAbsent: string;
  download: string;
  previewAlt: string;
  localTitle: string;
  localText: string;
  exactTitle: string;
  exactText: string;
  pngTitle: string;
  pngText: string;
  whatHeading: string;
  whatText: string;
  steps: Array<[string, string]>;
  limitsHeading: string;
  limitsText: string;
  tableLabel: string;
  tableRows: Array<[string, string]>;
  faqHeading: string;
  faq: Array<[string, string]>;
};

export const pngCopy: Record<PngLocale, PngCopy> = {
  en: {
    pageTitle: 'Lossless PNG optimizer and batch compressor',
    pageDescription: 'Optimize one PNG or up to 20 files locally without changing decoded pixels, dimensions, or transparency. Download verified smaller results individually or as a ZIP.',
    eyebrow: 'PNG optimization', toolLabel: 'Lossless PNG optimization tool', uploadLabel: 'Choose a PNG to optimize, or drop one here', chooseLabel: 'Choose a PNG to optimize', drop: 'Drop a PNG here', fileRule: 'Static PNG · up to 20 MB',
    methodHeading: 'Verified output', local: 'Processing stays on this device', outputLabel: 'Output', outputValue: 'PNG only', dimensionsLabel: 'Dimensions', dimensionsValue: 'Never resized', verificationLabel: 'Success rule', verificationValue: 'Smaller + exact RGBA match',
    optimize: 'Optimize PNG →', optimizing: 'Optimizing', cancel: 'Cancel', idle: 'Choose a static PNG. The original file is never overwritten.', ready: (name, size) => `${name} · ${size} KB ready to optimize`, changed: 'A new file was selected. Start optimization when ready.', canceled: 'PNG optimization canceled.', invalidType: 'Choose a PNG file. JPEG and WebP belong in the target-size compressor.', tooLarge: 'The PNG must be 20 MB or smaller.', genericError: 'PNG optimization failed. Try another file or browser.', rejectedOutput: 'The generated file did not pass the PNG safety checks, so no download was created.', noSaving: 'This PNG is already as small as this browser can make it without changing decoded pixels. Keep the original file.', verificationFailed: 'The re-encoded PNG did not reproduce the same decoded pixels and transparency. The original was kept.', metadataRetained: 'The browser retained embedded text or EXIF metadata. The original was kept and no optimized download was created.',
    resultHeading: 'Smaller PNG verified', original: 'Original', optimized: 'Optimized', saving: 'Saved', dimensions: 'Dimensions', alpha: 'Transparency', alphaKept: 'Preserved and verified', opaque: 'No alpha channel detected', metadata: 'Text/EXIF metadata', metadataRemoved: 'Removed and verified', metadataAbsent: 'None detected in the source', download: 'Download optimized PNG', previewAlt: 'Preview of the optimized PNG',
    localTitle: '100% local', localText: 'The PNG stays in your browser.', exactTitle: 'Pixel checked', exactText: 'Decoded RGBA values are compared tile by tile.', pngTitle: 'PNG remains PNG', pngText: 'No JPEG or WebP conversion is used.',
    whatHeading: 'How lossless PNG optimization works', whatText: 'The browser validates the PNG structure and CRC values, rejects animation, decodes the image, and writes a new PNG. The new file is decoded again and compared with the source. It is offered only when every rendered RGBA value matches and the file is smaller.',
    steps: [['Choose one PNG', 'Use a static PNG no larger than 20 MB or 40 megapixels.'], ['Optimize locally', 'A Web Worker re-encodes the image without resizing it.'], ['Verify and download', 'The tool checks PNG structure, dimensions, transparency, pixels, metadata, and exact bytes.']],
    limitsHeading: 'What this tool does and does not promise', limitsText: 'PNG results depend on how the source was encoded. An already optimized file may not become smaller. Pixel equality is checked after both files are decoded by the same browser; files with unusual color profiles can still display differently in other color-managed software.', tableLabel: 'PNG optimization guarantees and limits',
    tableRows: [['File format', 'Static PNG input and PNG output only'], ['Pixels and dimensions', 'Unchanged after browser decode'], ['Transparency', 'Alpha values included in the RGBA comparison'], ['Private metadata', 'Embedded text, time, and EXIF chunks must be absent from the output'], ['Target size', 'No fixed KB target or guaranteed saving']],
    faqHeading: 'PNG optimizer questions', faq: [['Is this always lossless?', 'A download is labeled optimized only after the source and output decode to exactly matching RGBA values in the same browser.'], ['Why is there no download?', 'The browser may produce a file that is the same size or larger, or the verification may reject the output. In those cases the original is safer.'], ['Does it preserve transparency?', 'Yes. Alpha is part of the pixel comparison, so a changed transparent or semi-transparent pixel fails verification.'], ['Can it compress an animated PNG?', 'No. APNG is rejected before decoding so animation is never silently reduced to one frame.']]
  },
  'zh-cn': {
    pageTitle: 'PNG 无损优化与批量压缩工具',
    pageDescription: '在浏览器本地优化一个静态 PNG，或批量处理最多 20 个文件，不改变解码后的像素、尺寸或透明度。通过校验且更小的文件可单独下载或打包为 ZIP。',
    eyebrow: 'PNG 优化', toolLabel: 'PNG 无损优化工具', uploadLabel: '选择要优化的 PNG，或拖放到这里', chooseLabel: '选择要优化的 PNG', drop: '将 PNG 拖到这里', fileRule: '静态 PNG · 最大 20 MB',
    methodHeading: '输出校验', local: '仅在本设备处理', outputLabel: '输出格式', outputValue: '仅 PNG', dimensionsLabel: '像素尺寸', dimensionsValue: '不会缩放', verificationLabel: '成功条件', verificationValue: '文件更小且 RGBA 完全一致',
    optimize: '优化 PNG →', optimizing: '优化中', cancel: '取消', idle: '请选择静态 PNG。工具不会覆盖原文件。', ready: (name, size) => `${name} · ${size} KB 已准备优化`, changed: '已选择新文件，可以开始优化。', canceled: '已取消 PNG 优化。', invalidType: '请选择 PNG 文件。JPEG 和 WebP 请使用目标大小压缩工具。', tooLarge: 'PNG 文件不能超过 20 MB。', genericError: 'PNG 优化失败，请更换文件或浏览器后重试。', rejectedOutput: '生成文件未通过 PNG 安全检查，因此没有提供下载。', noSaving: '在不改变解码像素的前提下，此浏览器无法继续减小该 PNG。请保留原文件。', verificationFailed: '重新编码后的 PNG 没有还原出完全一致的像素和透明度。已保留原文件。', metadataRetained: '浏览器仍保留了文本或 EXIF 元数据。已保留原文件，未生成优化下载。',
    resultHeading: '已验证更小的 PNG', original: '原文件', optimized: '优化后', saving: '节省', dimensions: '像素尺寸', alpha: '透明度', alphaKept: '已保留并校验', opaque: '未检测到透明通道', metadata: '文本/EXIF 元数据', metadataRemoved: '已移除并校验', metadataAbsent: '源文件中未检测到', download: '下载优化后的 PNG', previewAlt: '优化后 PNG 预览',
    localTitle: '100% 本地处理', localText: 'PNG 不会离开浏览器。', exactTitle: '逐像素检查', exactText: '按区块比较解码后的 RGBA 值。', pngTitle: '保持 PNG 格式', pngText: '不会转换成 JPEG 或 WebP。',
    whatHeading: 'PNG 无损优化如何工作', whatText: '浏览器会检查 PNG 结构和 CRC、拒绝动画、解码图片并重新写入 PNG。新文件会再次解码并与原图比较；只有每个 RGBA 值完全一致且文件确实更小时才提供下载。',
    steps: [['选择一个 PNG', '使用不超过 20 MB、解码后不超过 4000 万像素的静态 PNG。'], ['在本地优化', 'Web Worker 在不缩放图片的情况下重新编码。'], ['校验并下载', '检查 PNG 结构、尺寸、透明度、像素、元数据和实际字节。']],
    limitsHeading: '功能边界', limitsText: '结果取决于源 PNG 的编码方式。已经优化过的文件可能无法继续减小。像素一致性是在同一浏览器解码后校验；带有特殊颜色配置的文件，在其他色彩管理软件中仍可能出现显示差异。', tableLabel: 'PNG 优化保证和限制',
    tableRows: [['文件格式', '仅接受静态 PNG，并输出 PNG'], ['像素与尺寸', '浏览器解码后保持不变'], ['透明度', 'Alpha 值包含在 RGBA 比较中'], ['隐私元数据', '输出不得包含嵌入文本、时间和 EXIF 块'], ['目标大小', '不承诺固定 KB 或固定压缩比例']],
    faqHeading: 'PNG 优化常见问题', faq: [['一定是无损的吗？', '只有源文件和输出文件在同一浏览器中解码为完全一致的 RGBA 值时，才会显示优化成功。'], ['为什么没有下载按钮？', '浏览器生成的文件可能相同或更大，也可能未通过校验；此时保留原文件更安全。'], ['透明度会保留吗？', '会。Alpha 包含在像素比较中，任何透明或半透明像素变化都会导致校验失败。'], ['可以压缩动态 PNG 吗？', '不可以。APNG 会在解码前被拒绝，不会静默只保留其中一帧。']]
  },
  'zh-tw': {
    pageTitle: 'PNG 無損最佳化與批次壓縮工具',
    pageDescription: '在瀏覽器本機最佳化一個靜態 PNG，或批次處理最多 20 個檔案，不改變解碼後的像素、尺寸或透明度。通過驗證且較小的檔案可個別下載或封裝為 ZIP。',
    eyebrow: 'PNG 最佳化', toolLabel: 'PNG 無損最佳化工具', uploadLabel: '選擇要最佳化的 PNG，或拖放到這裡', chooseLabel: '選擇要最佳化的 PNG', drop: '將 PNG 拖到這裡', fileRule: '靜態 PNG · 最大 20 MB',
    methodHeading: '輸出驗證', local: '只在本機處理', outputLabel: '輸出格式', outputValue: '僅 PNG', dimensionsLabel: '像素尺寸', dimensionsValue: '不會縮放', verificationLabel: '成功條件', verificationValue: '檔案較小且 RGBA 完全一致',
    optimize: '最佳化 PNG →', optimizing: '最佳化中', cancel: '取消', idle: '請選擇靜態 PNG。工具不會覆寫原始檔案。', ready: (name, size) => `${name} · ${size} KB 已準備最佳化`, changed: '已選擇新檔案，可以開始最佳化。', canceled: '已取消 PNG 最佳化。', invalidType: '請選擇 PNG 檔案。JPEG 和 WebP 請使用目標大小壓縮工具。', tooLarge: 'PNG 檔案不可超過 20 MB。', genericError: 'PNG 最佳化失敗，請更換檔案或瀏覽器後再試一次。', rejectedOutput: '產生的檔案未通過 PNG 安全檢查，因此沒有提供下載。', noSaving: '在不改變解碼像素的前提下，此瀏覽器無法繼續縮小這個 PNG。請保留原始檔案。', verificationFailed: '重新編碼後的 PNG 沒有還原出完全一致的像素與透明度。已保留原始檔案。', metadataRetained: '瀏覽器仍保留文字或 EXIF 中繼資料。已保留原始檔案，未產生最佳化下載。',
    resultHeading: '已驗證較小的 PNG', original: '原始檔案', optimized: '最佳化後', saving: '節省', dimensions: '像素尺寸', alpha: '透明度', alphaKept: '已保留並驗證', opaque: '未偵測到透明色版', metadata: '文字/EXIF 中繼資料', metadataRemoved: '已移除並驗證', metadataAbsent: '來源檔案中未偵測到', download: '下載最佳化後的 PNG', previewAlt: '最佳化後 PNG 預覽',
    localTitle: '100% 本機處理', localText: 'PNG 不會離開瀏覽器。', exactTitle: '逐像素檢查', exactText: '分區比較解碼後的 RGBA 值。', pngTitle: '維持 PNG 格式', pngText: '不會轉換成 JPEG 或 WebP。',
    whatHeading: 'PNG 無損最佳化如何運作', whatText: '瀏覽器會檢查 PNG 結構與 CRC、拒絕動畫、解碼圖片並重新寫入 PNG。新檔案會再次解碼並與原圖比較；只有每個 RGBA 值完全一致且檔案確實較小時才提供下載。',
    steps: [['選擇一個 PNG', '使用不超過 20 MB、解碼後不超過 4,000 萬像素的靜態 PNG。'], ['在本機最佳化', 'Web Worker 在不縮放圖片的情況下重新編碼。'], ['驗證並下載', '檢查 PNG 結構、尺寸、透明度、像素、中繼資料與實際位元組。']],
    limitsHeading: '功能界線', limitsText: '結果取決於來源 PNG 的編碼方式。已經最佳化的檔案可能無法繼續縮小。像素一致性是在同一瀏覽器解碼後驗證；帶有特殊色彩設定檔的檔案，在其他色彩管理軟體中仍可能出現顯示差異。', tableLabel: 'PNG 最佳化保證與限制',
    tableRows: [['檔案格式', '只接受靜態 PNG，並輸出 PNG'], ['像素與尺寸', '瀏覽器解碼後維持不變'], ['透明度', 'Alpha 值包含在 RGBA 比較中'], ['隱私中繼資料', '輸出不得包含內嵌文字、時間與 EXIF 區塊'], ['目標大小', '不承諾固定 KB 或固定壓縮比例']],
    faqHeading: 'PNG 最佳化常見問題', faq: [['一定是無損的嗎？', '只有來源檔案與輸出檔案在同一瀏覽器中解碼為完全一致的 RGBA 值時，才會顯示最佳化成功。'], ['為什麼沒有下載按鈕？', '瀏覽器產生的檔案可能相同或較大，也可能未通過驗證；此時保留原始檔案較安全。'], ['透明度會保留嗎？', '會。Alpha 包含在像素比較中，任何透明或半透明像素變化都會導致驗證失敗。'], ['可以壓縮動態 PNG 嗎？', '不可以。APNG 會在解碼前被拒絕，不會默默只保留其中一個影格。']]
  }
};
