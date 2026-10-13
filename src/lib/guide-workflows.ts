import type { PublishedLocale } from './guide-content';

export type GuideWorkflow = {
  situation: string;
  steps: Array<[string, string]>;
  image: string;
  caption: string;
  links: Array<[string, string]>;
};

type WorkflowMap = Record<PublishedLocale, Record<string, GuideWorkflow>>;

/**
 * The screenshots are generated from the real browser tools and each article
 * points to the run that answers its own question. Keeping this data separate
 * prevents the article template from silently reusing one generic workflow.
 */
export const guideWorkflows: WorkflowMap = {
  en: {
    'compress-without-changing-dimensions': {
      situation: 'This run answers one narrow question: can the encoded bytes fall while the 320 × 240 pixel grid stays exactly the same?',
      steps: [['Read the starting file', 'Use the checker once so the source format, bytes, and dimensions are known.'], ['Set a 20 KB ceiling', 'Keep the original dimensions enabled and choose the decimal 20 KB target in the compressor.'], ['Re-open the saved file', 'Only keep the download after the result card reports a real byte count under the ceiling, then check its signature and dimensions again.']],
      image: 'compress-20kb',
      caption: 'Browser run with a 320 × 240 JPEG and a decimal 20 KB target: the saved JPEG is 6,364 bytes and keeps both dimensions.',
      links: [['Open the compressor', '/compress-image/'], ['Check the saved file', '/image-size-checker/']]
    },
    'why-image-wont-fit-50kb': {
      situation: 'This run starts with a textured 320 × 240 WebP, not the JPEG used in the 20 KB article, so the output format and byte count can be compared on its own.',
      steps: [['Confirm the exact ceiling', 'Treat 50 KB as 50,000 bytes and note whether the receiving service accepts WebP.'], ['Keep the source dimensions', 'Upload the textured WebP, keep 320 × 240 enabled, and run the 50 KB target.'], ['Check the saved result', 'The browser reports a 23,906-byte WebP; verify that format and dimensions before uploading it.']],
      image: 'compress-50kb',
      caption: 'Independent browser run with a textured 320 × 240 WebP: the 50 KB target produces a 23,906-byte WebP while keeping both dimensions.',
      links: [['Try another target', '/compress-image/'], ['Inspect format and bytes', '/image-size-checker/']]
    },
    'kb-vs-kib': {
      situation: 'This case uses a transparent 320 × 240 PNG. It shows why a small transparent asset can produce a much smaller WebP than its 75 KB ceiling, while the unit conversion remains exact.',
      steps: [['Choose the unit named by the destination', 'Select decimal KB when the upload form says KB; do not silently substitute KiB.'], ['Read the exact target', '75 KB is 75,000 bytes, while the same byte count is 73.2421875 KiB.'], ['Check transparency and bytes', 'The transparent source finishes as a 4,000-byte WebP; confirm that the receiving service accepts WebP and transparency.']],
      image: 'compress-75kb',
      caption: 'Independent browser run with a transparent 320 × 240 PNG: a decimal 75 KB target yields a 4,000-byte WebP and preserves the pixel dimensions.',
      links: [['Set a precise target', '/compress-image/'], ['Read exact file units', '/image-size-checker/']]
    },
    'check-image-size-and-dpi': {
      situation: 'Open the saved file before changing it. This inspection separates stored bytes, pixels, transparency, and density metadata instead of guessing one from another.',
      steps: [['Choose the file once', 'Pick the image from your device; the checker reads it in the browser.'], ['Record each field separately', 'The actual file is 2,930 bytes (2.93 KB / 2.86 KiB), 320 × 240 pixels, JPEG, and opaque.'], ['Check density only where it exists', 'Use the DPI checker for embedded density metadata and report “not embedded” when the file does not contain a value.']],
      image: 'inspect',
      caption: 'Actual browser inspection of opaque-gradient.jpg: 2,930 bytes, 2.93 KB, 2.86 KiB, JPEG, 320 × 240 pixels, and no transparency are shown separately.',
      links: [['Check image size', '/image-size-checker/'], ['Check DPI metadata', '/image-dpi-checker/']]
    },
    'compress-image-to-100kb': {
      situation: 'This case starts with a larger 320 × 240 RGBA PNG. The 100 KB ceiling is generous enough to demonstrate format conversion and the need to inspect the saved file rather than the source extension.',
      steps: [['Translate the rule', '100 KB means 100,000 bytes when the destination uses decimal KB.'], ['Process the larger PNG', 'Keep 320 × 240 dimensions, choose 100 KB, and let Auto preserve the available alpha information.'], ['Verify what was saved', 'The result is a 4,016-byte WebP; re-open it to confirm its signature, bytes, dimensions, and transparency.']],
      image: 'compress-100kb',
      caption: 'Independent browser run with a larger 320 × 240 RGBA PNG: the decimal 100 KB target produces a 4,016-byte WebP with the same dimensions.',
      links: [['Open the 100 KB compressor', '/compress-image/'], ['Verify the download', '/image-size-checker/']]
    }
  },
  'zh-cn': {
    'compress-without-changing-dimensions': {
      situation: '这个操作只回答一个问题：编码后的字节数能否下降，同时保持 320 × 240 的像素网格完全不变？',
      steps: [['先读取原文件', '先用检查工具确认原图格式、字节数和尺寸。'], ['设置 20 KB 上限', '保持原始尺寸，选择十进制 20 KB 目标，再运行压缩。'], ['重新打开保存文件', '只有结果卡给出不超过上限的实际字节数后才下载，再次核对签名和尺寸。']],
      image: 'compress-20kb',
      caption: '浏览器实测：320 × 240 JPEG，十进制 20 KB 目标；保存的 JPEG 为 6,364 字节，宽高保持不变。',
      links: [['打开压缩工具', '/compress-image/'], ['检查保存文件', '/image-size-checker/']]
    },
    'why-image-wont-fit-50kb': {
      situation: '这次从带纹理的 320 × 240 WebP 开始，不再重复 20 KB 文章里的 JPEG，可以单独核对输出格式和实际字节数。',
      steps: [['确认精确上限', '把 50 KB 当作 50,000 字节，并先确认接收平台是否允许 WebP。'], ['保持原图尺寸', '上传带纹理的 WebP，保持 320 × 240，运行 50 KB 目标。'], ['检查保存结果', '浏览器显示结果为 23,906 字节的 WebP；上传前再次核对格式和尺寸。']],
      image: 'compress-50kb',
      caption: '独立浏览器操作：带纹理的 320 × 240 WebP 在 50 KB 目标下得到 23,906 字节的 WebP，同时保持宽高不变。',
      links: [['尝试其他目标', '/compress-image/'], ['检查格式和字节', '/image-size-checker/']]
    },
    'kb-vs-kib': {
      situation: '这个案例使用带透明度的 320 × 240 PNG，展示透明小图如何在 75 KB 上限下生成更小的 WebP，同时保留精确单位换算。',
      steps: [['按接收平台选择单位', '上传表单写 KB 就选十进制 KB，不要自动替换成 KiB。'], ['读取精确目标', '75 KB 是 75,000 字节；同一字节数等于 73.2421875 KiB。'], ['同时核对透明度和字节', '透明原图最后生成 4,000 字节的 WebP；确认接收平台允许 WebP 和透明度。']],
      image: 'compress-75kb',
      caption: '独立浏览器操作：带透明度的 320 × 240 PNG 在十进制 75 KB 目标下生成 4,000 字节的 WebP，并保持像素尺寸。',
      links: [['设置精确目标', '/compress-image/'], ['读取文件单位', '/image-size-checker/']]
    },
    'check-image-size-and-dpi': {
      situation: '修改图片前先读取保存文件。检查器会把字节、像素、透明度和密度元数据分开显示，不会互相猜测。',
      steps: [['一次选择文件', '从设备选择图片，检查工具会在浏览器本地读取。'], ['分别记录每个字段', '这个文件是 2,930 字节（2.93 KB / 2.86 KiB）、JPEG、320 × 240 像素且不透明。'], ['只在有数据时填写 DPI', '再用 DPI 工具查看嵌入的密度；没有值就显示未嵌入，不要补写 72 DPI。']],
      image: 'inspect',
      caption: '真实浏览器检查 opaque-gradient.jpg：分别显示 2,930 字节、2.93 KB、2.86 KiB、JPEG、320 × 240 像素和无透明度。',
      links: [['检查图片大小', '/image-size-checker/'], ['检查 DPI 信息', '/image-dpi-checker/']]
    },
    'compress-image-to-100kb': {
      situation: '这个案例从较大的 320 × 240 RGBA PNG 开始。100 KB 上限足够宽松，可以观察格式转换，也说明为什么要检查保存后的文件而不是只看原扩展名。',
      steps: [['换算规则', '平台使用十进制 KB 时，100 KB 就是 100,000 字节。'], ['处理较大的 PNG', '保持 320 × 240 尺寸，选择 100 KB，让自动格式保留可用的透明信息。'], ['核对保存文件', '结果是 4,016 字节的 WebP；重新打开并确认签名、字节数、尺寸和透明度。']],
      image: 'compress-100kb',
      caption: '独立浏览器操作：较大的 320 × 240 RGBA PNG 在十进制 100 KB 目标下生成 4,016 字节的 WebP，尺寸保持不变。',
      links: [['打开 100 KB 压缩工具', '/compress-image/'], ['核对下载文件', '/image-size-checker/']]
    }
  },
  'zh-tw': {
    'compress-without-changing-dimensions': {
      situation: '這個操作只回答一個問題：編碼後的位元組數能否下降，同時維持 320 × 240 的像素網格完全不變？',
      steps: [['先讀取原檔案', '先用檢查工具確認原圖格式、位元組數與尺寸。'], ['設定 20 KB 上限', '維持原始尺寸，選擇十進位 20 KB 目標，再執行壓縮。'], ['重新開啟儲存檔案', '只有結果卡給出不超過上限的實際位元組數後才下載，再次核對簽章與尺寸。']],
      image: 'compress-20kb',
      caption: '瀏覽器實測：320 × 240 JPEG，十進位 20 KB 目標；儲存的 JPEG 為 6,364 位元組，寬高維持不變。',
      links: [['開啟壓縮工具', '/compress-image/'], ['檢查儲存檔案', '/image-size-checker/']]
    },
    'why-image-wont-fit-50kb': {
      situation: '這次從帶紋理的 320 × 240 WebP 開始，不再重複 20 KB 文章裡的 JPEG，可以單獨核對輸出格式與實際位元組數。',
      steps: [['確認實際上限', '把 50 KB 當作 50,000 位元組，並先確認接收平台是否允許 WebP。'], ['維持原圖尺寸', '上傳帶紋理的 WebP，維持 320 × 240，執行 50 KB 目標。'], ['檢查儲存結果', '瀏覽器顯示結果為 23,906 位元組的 WebP；上傳前再次核對格式與尺寸。']],
      image: 'compress-50kb',
      caption: '獨立瀏覽器操作：帶紋理的 320 × 240 WebP 在 50 KB 目標下得到 23,906 位元組的 WebP，同時維持寬高不變。',
      links: [['嘗試其他目標', '/compress-image/'], ['檢查格式與位元組', '/image-size-checker/']]
    },
    'kb-vs-kib': {
      situation: '這個案例使用帶透明度的 320 × 240 PNG，展示透明小圖如何在 75 KB 上限下產生更小的 WebP，同時保留精確單位換算。',
      steps: [['依接收平台選擇單位', '上傳表單寫 KB 就選十進位 KB，不要自動替換成 KiB。'], ['讀取實際目標', '75 KB 是 75,000 位元組；同一位元組數等於 73.2421875 KiB。'], ['同時核對透明度與位元組', '透明原圖最後產生 4,000 位元組的 WebP；確認接收平台允許 WebP 與透明度。']],
      image: 'compress-75kb',
      caption: '獨立瀏覽器操作：帶透明度的 320 × 240 PNG 在十進位 75 KB 目標下產生 4,000 位元組的 WebP，並維持像素尺寸。',
      links: [['設定精確目標', '/compress-image/'], ['讀取檔案單位', '/image-size-checker/']]
    },
    'check-image-size-and-dpi': {
      situation: '修改圖片前先讀取儲存檔案。檢查器會把位元組、像素、透明度與密度中繼資料分開顯示，不會互相猜測。',
      steps: [['一次選擇檔案', '從裝置選擇圖片，檢查工具會在瀏覽器本機讀取。'], ['分別記錄每個欄位', '這個檔案是 2,930 位元組（2.93 KB / 2.86 KiB）、JPEG、320 × 240 像素且不透明。'], ['只在有資料時填寫 DPI', '再用 DPI 工具查看嵌入的密度；沒有數值就顯示未嵌入，不要補寫 72 DPI。']],
      image: 'inspect',
      caption: '真實瀏覽器檢查 opaque-gradient.jpg：分別顯示 2,930 位元組、2.93 KB、2.86 KiB、JPEG、320 × 240 像素與沒有透明度。',
      links: [['檢查圖片大小', '/image-size-checker/'], ['檢查 DPI 資訊', '/image-dpi-checker/']]
    },
    'compress-image-to-100kb': {
      situation: '這個案例從較大的 320 × 240 RGBA PNG 開始。100 KB 上限足夠寬鬆，可以觀察格式轉換，也說明為什麼要檢查儲存後的檔案，而不是只看原副檔名。',
      steps: [['換算規則', '平台使用十進位 KB 時，100 KB 就是 100,000 位元組。'], ['處理較大的 PNG', '維持 320 × 240 尺寸，選擇 100 KB，讓自動格式保留可用的透明資訊。'], ['核對儲存檔案', '結果是 4,016 位元組的 WebP；重新開啟並確認簽章、位元組數、尺寸與透明度。']],
      image: 'compress-100kb',
      caption: '獨立瀏覽器操作：較大的 320 × 240 RGBA PNG 在十進位 100 KB 目標下產生 4,016 位元組的 WebP，尺寸維持不變。',
      links: [['開啟 100 KB 壓縮工具', '/compress-image/'], ['核對下載檔案', '/image-size-checker/']]
    }
  }
};
